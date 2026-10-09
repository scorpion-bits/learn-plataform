import 'server-only';

import { z } from 'zod';

import { getPaymentsEnv } from '@/lib/env/server';

import { formatBrPhone, formatCpf } from './tax-id';

/**
 * Cliente mínimo da AbacatePay API v2 — Checkout Transparente PIX
 * (docs/payments.md §2–§3, ADR-016/ADR-018). Interface pequena de propósito:
 * sem abstração multi-provedor.
 *
 * - `fetch` com timeout (AbortController, 10 s) e `cache: 'no-store'`.
 * - Envelope `{ data, success, error }` validado com zod (só os campos usados).
 * - Erros viram `PaymentProviderError` com `code` tipado; a mensagem nunca
 *   contém a chave, o CPF, o payload enviado nem o texto devolvido pelo provedor.
 */

const BASE_URL = 'https://api.abacatepay.com/v2';
export const PROVIDER_TIMEOUT_MS = 10_000;

export type PaymentProviderErrorCode =
  | 'provider_unavailable'
  | 'invalid_request'
  | 'unauthorized'
  /** Reembolso: saldo da conta insuficiente (`INSUFFICIENT_FUNDS`). */
  | 'insufficient_funds'
  /** Reembolso: transação em disputa (`TRANSACTION_UNDER_DISPUTE`). */
  | 'under_dispute'
  /** Reembolso: a transação não pode ser reembolsada agora. */
  | 'not_refundable'
  /** Reembolso: a cobrança já foi reembolsada (a API é idempotente). */
  | 'already_refunded';

export class PaymentProviderError extends Error {
  readonly code: PaymentProviderErrorCode;
  /** Status HTTP da resposta (quando houve resposta). */
  readonly status?: number;
  constructor(code: PaymentProviderErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'PaymentProviderError';
    this.code = code;
    this.status = status;
  }
}

export type PixStatus =
  | 'PENDING'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'PAID'
  | 'UNDER_DISPUTE'
  | 'REFUNDED'
  | 'REDEEMED'
  | 'APPROVED'
  | 'FAILED'
  /** Qualquer valor fora do enum documentado: tratar como "não pago". */
  | 'UNKNOWN';

const KNOWN_STATUSES = new Set<PixStatus>([
  'PENDING',
  'EXPIRED',
  'CANCELLED',
  'PAID',
  'UNDER_DISPUTE',
  'REFUNDED',
  'REDEEMED',
  'APPROVED',
  'FAILED',
]);

function toPixStatus(value: string): PixStatus {
  const upper = value.toUpperCase() as PixStatus;
  return KNOWN_STATUSES.has(upper) ? upper : 'UNKNOWN';
}

export interface PixCustomer {
  name: string;
  email: string;
  /** CPF (com ou sem máscara; enviado formatado). */
  taxId: string;
  /** Telefone BR (com ou sem máscara; enviado formatado). */
  cellphone: string;
}

export interface CreatePixChargeInput {
  /** `orders.id` — vai como `externalId` e em `metadata.orderId`. */
  orderId: string;
  /** Sempre `orders.amount_cents` (lido do banco). */
  amountCents: number;
  description: string;
  customer: PixCustomer;
  expiresInSeconds: number;
  /** Metadados extras sem dados pessoais (ex.: `courseId`). */
  metadata?: Record<string, string>;
}

export interface PixCharge {
  /** `provider_billing_id` (`pix_char_…`). */
  billingId: string;
  status: PixStatus;
  /** PIX copia-e-cola. */
  brCode: string;
  /** Imagem do QR como data URL (`data:image/png;base64,…`). */
  brCodeBase64: string;
  /** ISO 8601 ou `null` se o provedor não informar. */
  expiresAt: string | null;
}

export interface PixStatusResult {
  billingId: string;
  status: PixStatus;
  expiresAt: string | null;
  /** Valor em centavos, só se o provedor informar (a doc do `check` não garante). */
  amountCents: number | null;
}

export interface PixRefundResult {
  /** `true` se a cobrança já estava reembolsada (a API é idempotente: tratar como sucesso). */
  alreadyRefunded: boolean;
}

// ---------------------------------------------------------------------------
// Schemas de resposta (só o que usamos; campos extras são ignorados)
// ---------------------------------------------------------------------------

const isoDate = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)))
  .nullish();

/** Data URL de imagem raster. Base64 cru vira PNG; qualquer outra coisa é recusada. */
const qrImage = z
  .string()
  .trim()
  .min(1)
  .transform((v, ctx) => {
    if (/^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(v)) return v;
    if (/^[A-Za-z0-9+/=]+$/.test(v)) return `data:image/png;base64,${v}`;
    ctx.addIssue({ code: 'custom', message: 'brCodeBase64 inesperado' });
    return z.NEVER;
  });

const billingIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);

const createDataSchema = z.object({
  id: billingIdSchema,
  amount: z.number().int().optional(),
  status: z.string(),
  brCode: z.string().trim().min(1),
  brCodeBase64: qrImage,
  expiresAt: isoDate,
});

const checkDataSchema = z.object({
  id: billingIdSchema,
  status: z.string(),
  expiresAt: isoDate,
  amount: z.number().int().positive().optional(),
});

const envelopeSchema = z.object({
  data: z.unknown().optional(),
  success: z.boolean().optional(),
  error: z.unknown().optional(),
});

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

/** `true` se a chave da API está configurada (não revela o valor). */
export function isPaymentsConfigured(): boolean {
  try {
    getPaymentsEnv();
    return true;
  } catch {
    return false;
  }
}

function apiKey(): string {
  try {
    return getPaymentsEnv().ABACATEPAY_API_KEY;
  } catch {
    // Sem env: tratamos como indisponível (o erro do parseEnv lista só os nomes).
    throw new PaymentProviderError('provider_unavailable', 'Pagamentos não configurados.');
  }
}

function errorForStatus(status: number): PaymentProviderError {
  if (status === 401 || status === 403) {
    return new PaymentProviderError(
      'unauthorized',
      `AbacatePay recusou a chave (${status}).`,
      status,
    );
  }
  if (status === 429 || status >= 500) {
    return new PaymentProviderError(
      'provider_unavailable',
      `AbacatePay indisponível (${status}).`,
      status,
    );
  }
  return new PaymentProviderError(
    'invalid_request',
    `AbacatePay recusou a requisição (${status}).`,
    status,
  );
}

/** Traduz a recusa do provedor (status + corpo JSON, se houver) em erro tipado. */
type ClassifyFailure = (status: number, body: unknown) => PaymentProviderError | undefined;

async function request(
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown },
  classify?: ClassifyFailure,
) {
  const key = apiKey();
  const controller = new AbortController();
  // O timeout cobre a resposta inteira (headers + corpo).
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  const unavailable = (message: string, status?: number) =>
    new PaymentProviderError('provider_unavailable', message, status);

  try {
    let response: Response;
    try {
      response = await fetch(`${BASE_URL}${path}`, {
        method: init.method,
        headers: {
          Authorization: `Bearer ${key}`,
          Accept: 'application/json',
          ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: controller.signal,
        cache: 'no-store',
      });
    } catch {
      // Rede, DNS ou timeout (AbortError). Sem detalhes: podem conter URL/headers.
      throw unavailable(
        controller.signal.aborted
          ? 'AbacatePay não respondeu a tempo.'
          : 'Falha de rede ao chamar a AbacatePay.',
      );
    }

    if (!response.ok) {
      let failureBody: unknown;
      if (classify) {
        try {
          failureBody = await response.json();
        } catch {
          failureBody = undefined;
        }
      }
      throw classify?.(response.status, failureBody) ?? errorForStatus(response.status);
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw unavailable(
        controller.signal.aborted
          ? 'AbacatePay não respondeu a tempo.'
          : 'Resposta da AbacatePay ilegível.',
        response.status,
      );
    }

    const envelope = envelopeSchema.safeParse(json);
    if (!envelope.success) throw unavailable('Envelope da AbacatePay inesperado.', response.status);
    if (
      envelope.data.success === false ||
      (envelope.data.error != null && envelope.data.error !== '')
    ) {
      // 2xx com `success: false`: requisição recusada pela regra do provedor.
      throw (
        classify?.(response.status, envelope.data) ??
        new PaymentProviderError(
          'invalid_request',
          'AbacatePay recusou a requisição.',
          response.status,
        )
      );
    }
    return envelope.data.data;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Cria a cobrança PIX (`POST /v2/transparents/create`). O valor é o do pedido
 * no banco; `externalId = orderId`. Lança `PaymentProviderError`.
 */
export async function createPixCharge(input: CreatePixChargeInput): Promise<PixCharge> {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new PaymentProviderError('invalid_request', 'Valor inválido.');
  }

  const data = await request('/transparents/create', {
    method: 'POST',
    body: {
      method: 'PIX',
      data: {
        amount: input.amountCents,
        description: input.description.slice(0, 140),
        expiresIn: input.expiresInSeconds,
        externalId: input.orderId,
        customer: {
          name: input.customer.name,
          email: input.customer.email,
          taxId: formatCpf(input.customer.taxId),
          cellphone: formatBrPhone(input.customer.cellphone),
        },
        metadata: { ...input.metadata, orderId: input.orderId },
      },
    },
  });

  const parsed = createDataSchema.safeParse(data);
  if (!parsed.success) {
    throw new PaymentProviderError(
      'provider_unavailable',
      'Cobrança da AbacatePay sem os campos esperados.',
    );
  }
  if (parsed.data.amount !== undefined && parsed.data.amount !== input.amountCents) {
    // Sanidade: o provedor tem que cobrar exatamente o valor do pedido.
    throw new PaymentProviderError('provider_unavailable', 'Valor da cobrança diverge do pedido.');
  }

  return {
    billingId: parsed.data.id,
    status: toPixStatus(parsed.data.status),
    brCode: parsed.data.brCode,
    brCodeBase64: parsed.data.brCodeBase64,
    expiresAt: parsed.data.expiresAt ?? null,
  };
}

/** Consulta o status (`GET /v2/transparents/check?id=`). Lança `PaymentProviderError`. */
export async function getPixStatus(billingId: string): Promise<PixStatusResult> {
  if (!billingIdSchema.safeParse(billingId).success) {
    throw new PaymentProviderError('invalid_request', 'Id de cobrança inválido.');
  }

  const data = await request(`/transparents/check?id=${encodeURIComponent(billingId)}`, {
    method: 'GET',
  });

  const parsed = checkDataSchema.safeParse(data);
  if (!parsed.success) {
    throw new PaymentProviderError(
      'provider_unavailable',
      'Status da AbacatePay sem os campos esperados.',
    );
  }
  if (parsed.data.id !== billingId) {
    throw new PaymentProviderError('provider_unavailable', 'Status devolvido para outra cobrança.');
  }
  return {
    billingId: parsed.data.id,
    status: toPixStatus(parsed.data.status),
    expiresAt: parsed.data.expiresAt ?? null,
    amountCents: parsed.data.amount ?? null,
  };
}

/** Lê só o texto de erro do corpo (nunca é copiado para mensagens ou logs). */
function failureText(body: unknown): string {
  try {
    return JSON.stringify(body ?? '').toUpperCase();
  } catch {
    return '';
  }
}

const classifyRefundFailure: ClassifyFailure = (status, body) => {
  const text = failureText(body);
  const make = (code: PaymentProviderErrorCode, message: string) =>
    new PaymentProviderError(code, message, status);
  if (text.includes('JÁ FOI REEMBOLSADA') || text.includes('JA FOI REEMBOLSADA')) {
    return make('already_refunded', 'Cobrança já reembolsada.');
  }
  if (text.includes('INSUFFICIENT_FUNDS')) {
    return make('insufficient_funds', 'Saldo insuficiente na AbacatePay para o reembolso.');
  }
  if (text.includes('TRANSACTION_UNDER_DISPUTE')) {
    return make('under_dispute', 'Transação em disputa.');
  }
  if (text.includes('TRANSACTION_NOT_REFUNDABLE') || text.includes('REFUND_REQUEST_FAILED')) {
    return make('not_refundable', 'Transação não reembolsável.');
  }
  if (text.includes('LOCK_NOT_ACQUIRED')) {
    return make('provider_unavailable', 'Reembolso em andamento na AbacatePay.');
  }
  return undefined;
};

/**
 * Reembolso total (`POST /v2/transparents/refund`, permissão `REFUND:CREATE`).
 * NÃO altera o pedido: o acesso só cai quando o webhook `refunded` chegar.
 * "Esta cobrança já foi reembolsada." vira `alreadyRefunded: true`.
 * Lança `PaymentProviderError` (`insufficient_funds`, `under_dispute`, `not_refundable`…).
 */
export async function refundPixCharge(
  billingId: string,
  reason = 'Reembolso (CDC art. 49)',
): Promise<PixRefundResult> {
  if (!billingIdSchema.safeParse(billingId).success) {
    throw new PaymentProviderError('invalid_request', 'Id de cobrança inválido.');
  }
  try {
    await request(
      '/transparents/refund',
      { method: 'POST', body: { id: billingId, reason: reason.slice(0, 140) } },
      classifyRefundFailure,
    );
    return { alreadyRefunded: false };
  } catch (error) {
    if (error instanceof PaymentProviderError && error.code === 'already_refunded') {
      return { alreadyRefunded: true };
    }
    throw error;
  }
}
