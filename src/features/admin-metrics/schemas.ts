import { z } from 'zod';

export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];
export const DEFAULT_PERIOD: Period = 30;

/** `?periodo=7|30|90`; qualquer outro valor (ou lista) cai no padrão. */
export function parsePeriod(value: string | string[] | undefined): Period {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = z.enum(['7', '30', '90']).safeParse(raw);
  return parsed.success ? (Number(parsed.data) as Period) : DEFAULT_PERIOD;
}

/** bigint do Postgres pode chegar como number ou string (PostgREST); sempre vira inteiro seguro. */
const int = z.coerce.number().int().safe();

export const metricsRowSchema = z.object({
  revenue_cents: int,
  sales_count: int,
  avg_ticket_cents: int,
  students_total: int,
  students_new: int,
  enrollments_purchase: int,
  enrollments_admin_grant: int,
  refunds_count: int,
  pending_refund_requests: int,
});

export const revenueDayRowSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  revenue_cents: int,
  sales: int,
});

export const topCourseRowSchema = z.object({
  course_id: z.string(),
  slug: z.string(),
  title: z.string(),
  sales: int,
  revenue_cents: int,
});
