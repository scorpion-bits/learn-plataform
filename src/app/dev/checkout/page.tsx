import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { StudentShell } from '@/components/layout';
import { MOCK_COURSES } from '@/features/catalog/mock';
import { CheckoutSkeleton } from '@/features/checkout/components/CheckoutSkeleton';
import { CheckoutView } from '@/features/checkout/components/CheckoutView';
import { OrderStatusView } from '@/features/checkout/components/OrderStatusView';
import type { CheckoutFormState, MyOrder } from '@/features/checkout/model';

export const metadata: Metadata = {
  title: 'Vitrine · checkout',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const ERROR_STATE: CheckoutFormState = {
  status: 'error',
  message: 'Dados inválidos. Revise os campos e tente novamente.',
  fieldErrors: {
    taxId: ['CPF inválido. Confira os números.'],
    phone: ['Telefone inválido. Use DDD + número.'],
  },
};

const PROVIDER_ERROR_STATE: CheckoutFormState = {
  status: 'error',
  message:
    'Não conseguimos gerar o PIX agora. Nenhum valor foi cobrado. Tente novamente em instantes.',
};

const ORDER: MyOrder = {
  id: '00000000-0000-4000-8000-000000000001',
  status: 'pending',
  amountCents: 19700,
  expiresAt: new Date(Date.UTC(2026, 9, 8, 21, 30)).toISOString(),
  createdAt: new Date(Date.UTC(2026, 9, 8, 20, 30)).toISOString(),
  hasPix: true,
  course: { slug: MOCK_COURSES[0]!.slug, title: MOCK_COURSES[0]!.title },
};

/**
 * Vitrine do checkout (PAY-002) com dados fictícios; 404 em produção. O botão
 * "Gerar PIX" chama a action real (exige sessão/env), então use só para layout.
 * `?state=prefill|error|provider-error|pending|owned|free|loading|order|order-paid|order-failed`.
 */
export default async function CheckoutShowcase({ searchParams }: { searchParams: SearchParams }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { state } = await searchParams;
  const base = MOCK_COURSES[0]!;
  const course = state === 'free' ? { ...base, priceCents: 0 } : base;
  const prefilled = state === 'prefill' || state === 'pending' || state === 'provider-error';

  let body;
  if (state === 'loading') body = <CheckoutSkeleton />;
  else if (state === 'order') body = <OrderStatusView order={ORDER} />;
  else if (state === 'order-paid') body = <OrderStatusView order={{ ...ORDER, status: 'paid' }} />;
  else if (state === 'order-failed')
    body = <OrderStatusView order={{ ...ORDER, status: 'failed', hasPix: false }} />;
  else
    body = (
      <CheckoutView
        course={course}
        hasAccess={state === 'owned'}
        prefill={
          prefilled
            ? { taxId: '111.444.777-35', phone: '(11) 94002-8922' }
            : {
                taxId: state === 'error' ? '111.444.777-00' : '',
                phone: state === 'error' ? '(11) 84002' : '',
              }
        }
        pendingOrderId={state === 'pending' ? ORDER.id : null}
        initialState={
          state === 'error'
            ? ERROR_STATE
            : state === 'provider-error'
              ? PROVIDER_ERROR_STATE
              : undefined
        }
      />
    );

  return <StudentShell user={{ name: 'Ana Souza', email: 'ana@example.com' }}>{body}</StudentShell>;
}
