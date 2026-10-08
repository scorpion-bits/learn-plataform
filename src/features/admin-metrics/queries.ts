import 'server-only';

import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';

import { mapMetricsRow, mapRevenueRows, mapTopCourseRows } from './model';
import type { DashboardMetrics, RevenueDay, TopCourse } from './model';

/** Leituras do dashboard: só RPC com o client do usuário; `is_admin()` no banco decide. */

export class AdminMetricsError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'AdminMetricsError';
  }
  /** `42501`: o banco recusou (não-admin). A página responde `notFound()`. */
  get forbidden(): boolean {
    return this.code === '42501';
  }
}

const FAIL = 'Não foi possível carregar as métricas.';

export const getDashboardMetrics = cache(
  async (from: string, to: string): Promise<DashboardMetrics> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('admin_dashboard_metrics', {
      p_from: from,
      p_to: to,
    });
    if (error) throw new AdminMetricsError(FAIL, error.code);
    const row = data?.[0];
    if (!row) throw new AdminMetricsError(FAIL);
    return mapMetricsRow(row);
  },
);

export const getRevenueByDay = cache(async (from: string, to: string): Promise<RevenueDay[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_revenue_by_day', { p_from: from, p_to: to });
  if (error) throw new AdminMetricsError(FAIL, error.code);
  return mapRevenueRows(data ?? []);
});

export const getTopCourses = cache(
  async (from: string, to: string, limit = 5): Promise<TopCourse[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('admin_top_courses', {
      p_from: from,
      p_to: to,
      p_limit: limit,
    });
    if (error) throw new AdminMetricsError(FAIL, error.code);
    return mapTopCourseRows(data ?? []);
  },
);
