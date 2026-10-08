import type { Database } from '@/types/database';

/** Tipos e funções puras do checkout (sem I/O; seguros no cliente). */

export type OrderStatus = Database['public']['Enums']['order_status'];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Aguardando pagamento',
  paid: 'Pago',
  failed: 'Falhou',
  expired: 'Expirado',
  refunded: 'Reembolsado',
  canceled: 'Cancelado',
};

export const ORDER_STATUS_TONE: Record<OrderStatus, 'amber' | 'mint' | 'coral' | 'neutral'> = {
  pending: 'amber',
  paid: 'mint',
  failed: 'coral',
  expired: 'neutral',
  refunded: 'neutral',
  canceled: 'neutral',
};

/** Prazo legal de arrependimento (CDC art. 49; ADR-017). */
export const REFUND_WINDOW_DAYS = 7;

/** Estado do formulário de checkout (`useActionState`). */
export type CheckoutFormState =
  | { status: 'idle' }
  | { status: 'error'; message: string; fieldErrors?: Record<string, string[] | undefined> }
  | { status: 'owned'; href: string };

export const CHECKOUT_IDLE: CheckoutFormState = { status: 'idle' };

/** Pedido do próprio aluno (placeholder de `/checkout/pedido/[id]`; a tela completa é PAY-004). */
export type MyOrder = {
  id: string;
  status: OrderStatus;
  amountCents: number;
  expiresAt: string | null;
  createdAt: string;
  hasPix: boolean;
  course: { slug: string | null; title: string };
};

/** Dados da página `/checkout/[slug]`. */
export type CheckoutPrefill = { taxId: string; phone: string };
