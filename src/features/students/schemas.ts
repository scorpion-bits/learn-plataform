import { z } from 'zod';

import { REASON_MAX, REASON_MIN } from './constants';

export { REASON_MAX, REASON_MIN };

export const PAGE_SIZE = 20;
export const SEARCH_MAX = 100;

/** `?q=` e `?pagina=` da lista: valores inválidos viram o padrão (nunca erro). */
export function parseListParams(raw: { q?: unknown; pagina?: unknown }): {
  q: string;
  page: number;
} {
  const q = typeof raw.q === 'string' ? raw.q.trim().slice(0, SEARCH_MAX) : '';
  const n = typeof raw.pagina === 'string' ? Number.parseInt(raw.pagina, 10) : 1;
  const page = Number.isSafeInteger(n) && n >= 1 && n <= 100_000 ? n : 1;
  return { q, page };
}

export const studentIdSchema = z.uuid();

const reason = z
  .string({ error: 'Informe o motivo.' })
  .trim()
  .min(REASON_MIN, `O motivo precisa ter ao menos ${REASON_MIN} caracteres.`)
  .max(REASON_MAX, `O motivo pode ter no máximo ${REASON_MAX} caracteres.`);

/** `granted_by` NÃO é campo de entrada: vem da sessão do admin. */
export const grantCourseSchema = z.object({
  userId: z.uuid(),
  courseId: z.uuid({ error: 'Escolha um curso.' }),
});

export const revokeEnrollmentSchema = z.object({
  enrollmentId: z.uuid(),
  userId: z.uuid(),
  reason,
});

export const SOURCE_LABELS = { purchase: 'Comprado', admin_grant: 'Atribuído' } as const;
export const ORDER_STATUS_LABELS = {
  pending: 'Pendente',
  paid: 'Pago',
  failed: 'Falhou',
  expired: 'Expirado',
  refunded: 'Reembolsado',
  canceled: 'Cancelado',
} as const;
