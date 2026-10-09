'use server';

import 'server-only';

import { redirect } from 'next/navigation';

import { getPublishedCourse } from '@/features/catalog/queries';
import { ActionError, userAction } from '@/lib/auth/actions';
import {
  createPixCharge,
  getPixStatus,
  isPaymentsConfigured,
  PaymentProviderError,
} from '@/lib/payments/abacatepay';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

import type { OrderStatusSnapshot } from './model';
import {
  IN_FLIGHT_GRACE_MS,
  orderStatusInputSchema,
  PIX_EXPIRES_IN_SECONDS,
  REUSE_MIN_REMAINING_MS,
  startCheckoutSchema,
} from './schemas';

/**
 * Checkout PIX (PAY-002). Nenhum acesso é concedido aqui: a matrícula só nasce
 * em `fulfill_order()`, chamado pelo webhook verificado (PAY-003).
 *
 * Fronteiras de confiança:
 * - `user_id` vem da sessão (`userAction` → `requireUser`), nunca do input;
 * - o preço é lido do banco (`course_catalog.price_cents`) e congelado em `orders.amount_cents`;
 * - leituras e o perfil usam o client do usuário (RLS); só a escrita em `orders`
 *   (sem policy de INSERT/UPDATE para `authenticated`) usa o service client,
 *   sempre com valores montados aqui.
 */

export type CheckoutOutcome = { status: 'already_owned'; href: string };

const GENERIC_ERROR = 'Não foi possível iniciar o pagamento agora. Tente novamente em instantes.';
const PROVIDER_ERROR =
  'Não conseguimos gerar o PIX agora. Nenhum valor foi cobrado. Tente novamente em instantes.';
const IN_FLIGHT_ERROR = 'Seu PIX já está sendo gerado. Aguarde alguns segundos e tente novamente.';

type ServiceClient = ReturnType<typeof createServiceClient>;
type UserClient = Awaited<ReturnType<typeof createClient>>;

type PendingOrder = {
  id: string;
  expires_at: string | null;
  pix_br_code: string | null;
  created_at: string;
};

/** Log sem dados pessoais (nada de CPF, telefone, email ou payload do provedor). */
function logCheckoutError(step: string, orderId: string | null, error: unknown) {
  const detail =
    error instanceof PaymentProviderError
      ? { code: error.code, status: error.status }
      : { code: (error as { code?: unknown } | null)?.code };
  console.error(`[checkout] ${step}`, { orderId, ...detail });
}

async function findPendingOrder(
  supabase: UserClient,
  userId: string,
  courseId: string,
): Promise<PendingOrder | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, expires_at, pix_br_code, created_at')
    .eq('user_id', userId) // RLS deixaria o admin ver pedidos de todos
    .eq('course_id', courseId)
    .eq('status', 'pending')
    .maybeSingle();
  if (error) {
    logCheckoutError('read pending', null, error);
    throw new ActionError(GENERIC_ERROR);
  }
  return data;
}

function isReusable(order: PendingOrder, now: number): boolean {
  if (!order.pix_br_code || !order.expires_at) return false;
  return Date.parse(order.expires_at) - now > REUSE_MIN_REMAINING_MS;
}

/** Muda o status de um pedido ainda `pending` (sem efeito se outro fluxo já mudou). */
async function settlePending(
  service: ServiceClient,
  orderId: string,
  status: 'expired' | 'failed',
): Promise<void> {
  const { error } = await service
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .eq('status', 'pending');
  if (error) {
    logCheckoutError(`mark ${status}`, orderId, error);
    throw new ActionError(GENERIC_ERROR);
  }
}

/**
 * Decide o que fazer com o pedido pendente existente:
 * - QR válido → reaproveita (clique duplo, "voltar", outra aba);
 * - QR vencido → `expired` e segue para um novo;
 * - sem QR e recente → outra requisição está gerando: erro amigável;
 * - sem QR e antigo → tentativa abandonada: `failed` e segue para um novo.
 */
async function resolvePending(
  pending: PendingOrder,
  getService: () => ServiceClient,
): Promise<{ reuse: string } | null> {
  const now = Date.now();
  if (isReusable(pending, now)) return { reuse: pending.id };
  if (pending.pix_br_code) {
    await settlePending(getService(), pending.id, 'expired');
    return null;
  }
  if (now - Date.parse(pending.created_at) < IN_FLIGHT_GRACE_MS) {
    throw new ActionError(IN_FLIGHT_ERROR);
  }
  await settlePending(getService(), pending.id, 'failed');
  return null;
}

export const startCheckout = userAction(startCheckoutSchema, async (input, { user }) => {
  // 1. Curso publicado e pago (preço lido do banco, nunca do input).
  const course = await getPublishedCourse(input.courseSlug);
  if (!course || !Number.isInteger(course.priceCents) || course.priceCents <= 0) {
    throw new ActionError('Este curso não está disponível para compra.');
  }

  const supabase = await createClient();

  // 2. Já tem acesso? (has_course_access com o client do usuário)
  const { data: hasAccess, error: accessError } = await supabase.rpc('has_course_access', {
    p_course_id: course.id,
  });
  if (accessError) {
    logCheckoutError('has_course_access', null, accessError);
    throw new ActionError(GENERIC_ERROR);
  }
  if (hasAccess) {
    return { status: 'already_owned', href: `/aprender/${course.slug}` } satisfies CheckoutOutcome;
  }

  // 3. CPF/telefone no próprio perfil (RLS + GRANT por coluna).
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .update({ tax_id: input.taxId, phone: input.phone })
    .eq('id', user.id)
    .select('full_name')
    .maybeSingle();
  if (profileError || !profile) {
    logCheckoutError('save profile', null, profileError);
    throw new ActionError(GENERIC_ERROR);
  }

  let service: ServiceClient | undefined;
  const getService = () => (service ??= createServiceClient());

  // 4. Reaproveita pedido pendente com QR ainda válido.
  const pending = await findPendingOrder(supabase, user.id, course.id);
  if (pending) {
    const resolved = await resolvePending(pending, getService);
    if (resolved) redirect(`/checkout/pedido/${resolved.reuse}`);
  }

  if (!isPaymentsConfigured()) {
    console.error('[checkout] payments env missing');
    throw new ActionError(PROVIDER_ERROR);
  }

  // 5. Novo pedido (service client; valores montados aqui).
  const { data: order, error: insertError } = await getService()
    .from('orders')
    .insert({
      user_id: user.id,
      course_id: course.id,
      amount_cents: course.priceCents,
      status: 'pending',
      source: 'checkout',
      provider: 'abacatepay',
    })
    .select('id')
    .single();

  if (insertError || !order) {
    if (insertError?.code === '23505') {
      // Corrida no índice único de pending: outra requisição criou primeiro.
      const winner = await findPendingOrder(supabase, user.id, course.id);
      if (winner && isReusable(winner, Date.now())) redirect(`/checkout/pedido/${winner.id}`);
      throw new ActionError(IN_FLIGHT_ERROR);
    }
    logCheckoutError('insert order', null, insertError);
    throw new ActionError(GENERIC_ERROR);
  }

  // 6. Cobrança PIX no provedor.
  let charge;
  try {
    charge = await createPixCharge({
      orderId: order.id,
      amountCents: course.priceCents,
      description: `Curso: ${course.title}`,
      customer: {
        name: profile.full_name.trim() || user.email,
        email: user.email,
        taxId: input.taxId,
        cellphone: input.phone,
      },
      expiresInSeconds: PIX_EXPIRES_IN_SECONDS,
      metadata: { courseId: course.id },
    });
  } catch (error) {
    logCheckoutError('create charge', order.id, error);
    await settlePending(getService(), order.id, 'failed').catch(() => undefined);
    throw new ActionError(PROVIDER_ERROR);
  }

  const expiresAt =
    charge.expiresAt ?? new Date(Date.now() + PIX_EXPIRES_IN_SECONDS * 1000).toISOString();
  const { data: saved, error: saveError } = await getService()
    .from('orders')
    .update({
      provider_billing_id: charge.billingId,
      pix_br_code: charge.brCode,
      pix_br_code_base64: charge.brCodeBase64,
      expires_at: expiresAt,
    })
    .eq('id', order.id)
    .eq('status', 'pending')
    .select('id');
  if (saveError || !saved || saved.length === 0) {
    logCheckoutError('save charge', order.id, saveError);
    await settlePending(getService(), order.id, 'failed').catch(() => undefined);
    throw new ActionError(GENERIC_ERROR);
  }

  // 7. Página do pedido (QR em PAY-004).
  redirect(`/checkout/pedido/${order.id}`);
});

/** Intervalo mínimo entre reconsultas ao provedor por pedido (por instância; best-effort). */
const PROVIDER_CHECK_INTERVAL_MS = 10_000;
const lastProviderCheck = new Map<string, number>();

/**
 * Plano B ao webhook: se o pedido segue `pending`, reconsulta a AbacatePay pela
 * NOSSA chave e, só se ela disser `PAID` (e o valor bater, quando informado),
 * concede via `fulfill_order()` — a mesma função idempotente do webhook.
 * Falhas aqui nunca quebram o polling: o webhook continua sendo o caminho principal.
 */
async function reconcileWithProvider(order: {
  id: string;
  providerBillingId: string;
  amountCents: number;
}): Promise<void> {
  const now = Date.now();
  if (now - (lastProviderCheck.get(order.id) ?? 0) < PROVIDER_CHECK_INTERVAL_MS) return;
  lastProviderCheck.set(order.id, now);
  if (lastProviderCheck.size > 1000) lastProviderCheck.clear();

  try {
    const remote = await getPixStatus(order.providerBillingId);
    if (remote.status !== 'PAID') return;
    if (remote.amountCents !== null && remote.amountCents !== order.amountCents) {
      logCheckoutError('reconcile amount mismatch', order.id, null);
      return;
    }
    const { error } = await createServiceClient().rpc('fulfill_order', {
      p_order_id: order.id,
      p_provider_billing_id: order.providerBillingId,
      p_amount_cents: order.amountCents,
    });
    if (error) logCheckoutError('reconcile fulfill', order.id, error);
  } catch (error) {
    logCheckoutError('reconcile check', order.id, error);
  }
}

/**
 * Polling da página do pedido: devolve status e validade, filtrando pelo `user_id`
 * da sessão (a RLS deixaria o admin ler pedidos de qualquer um). Enquanto
 * `pending`, reconsulta o provedor (ver `reconcileWithProvider`); o preço vem do banco.
 */
export const getOrderStatus = userAction(orderStatusInputSchema, async ({ orderId }, { user }) => {
  const supabase = await createClient();
  const read = () =>
    supabase
      .from('orders')
      .select('status, expires_at, provider_billing_id, amount_cents')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .maybeSingle();

  let { data, error } = await read();
  if (!error && data?.status === 'pending' && data.provider_billing_id) {
    await reconcileWithProvider({
      id: orderId,
      providerBillingId: data.provider_billing_id,
      amountCents: data.amount_cents,
    });
    ({ data, error } = await read());
  }
  if (error) {
    logCheckoutError('read order status', orderId, error);
    throw new ActionError(GENERIC_ERROR);
  }
  if (!data) throw new ActionError('Pedido não encontrado.');
  return { status: data.status, expiresAt: data.expires_at } satisfies OrderStatusSnapshot;
});
