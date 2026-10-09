import { z } from 'zod';

import type { Database } from '@/types/database';

export type OrderStatus = Database['public']['Enums']['order_status'];

export const PAGE_SIZE = 20;
export const SEARCH_MAX = 100;
export const MAX_SALE_CENTS = 100_000_00;

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'pending',
  'paid',
  'failed',
  'expired',
  'refunded',
  'canceled',
];

export type OrderListParams = {
  q: string;
  page: number;
  status: OrderStatus | null;
  /** `?filtro=reembolso`: pedidos `paid` com `refund_requested_at`. */
  refundQueue: boolean;
};

/** Query string da lista: valores inválidos viram o padrão (nunca erro). */
export function parseOrderListParams(raw: {
  q?: unknown;
  pagina?: unknown;
  status?: unknown;
  filtro?: unknown;
}): OrderListParams {
  const q = typeof raw.q === 'string' ? raw.q.trim().slice(0, SEARCH_MAX) : '';
  const n = typeof raw.pagina === 'string' ? Number.parseInt(raw.pagina, 10) : 1;
  const page = Number.isSafeInteger(n) && n >= 1 && n <= 100_000 ? n : 1;
  const refundQueue = raw.filtro === 'reembolso';
  const status =
    !refundQueue &&
    typeof raw.status === 'string' &&
    (ORDER_STATUSES as string[]).includes(raw.status)
      ? (raw.status as OrderStatus)
      : null;
  return { q, page, status, refundQueue };
}

export const orderIdSchema = z.uuid();

/** "197", "197,00", "1.970,50", "197.5" -> centavos; `null` se inválido. */
export function parseBrlToCents(input: string): number | null {
  const cleaned = input.replace(/R\$|\s/gi, '');
  if (!cleaned) return null;
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned;
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return cents > 0 && cents <= MAX_SALE_CENTS ? cents : null;
}

/** Venda manual. Valor em branco = preço atual do curso (decidido pela RPC). */
export const manualSaleSchema = z.object({
  email: z
    .string({ error: 'Informe o email do aluno.' })
    .trim()
    .toLowerCase()
    .pipe(z.email('Email inválido.').max(254, 'Email inválido.')),
  courseId: z.uuid({ error: 'Escolha um curso.' }),
  amount: z
    .string()
    .trim()
    .max(20, 'Valor inválido.')
    .optional()
    .transform((value, ctx) => {
      if (!value) return undefined;
      const cents = parseBrlToCents(value);
      if (cents === null) {
        ctx.addIssue({ code: 'custom', message: 'Valor inválido. Use o formato 197,00.' });
        return z.NEVER;
      }
      return cents;
    }),
});

/** Ações sobre um pedido existente: o resto vem do banco, nunca do cliente. */
export const orderActionSchema = z.object({ orderId: orderIdSchema });
