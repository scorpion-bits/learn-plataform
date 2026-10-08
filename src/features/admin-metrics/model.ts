import { metricsRowSchema, revenueDayRowSchema, topCourseRowSchema } from './schemas';
import type { Period } from './schemas';

/* ------------------------------------------------------------------ tipos */

export type DashboardMetrics = {
  revenueCents: number;
  salesCount: number;
  avgTicketCents: number;
  studentsTotal: number;
  studentsNew: number;
  enrollmentsPurchase: number;
  enrollmentsAdminGrant: number;
  /** Matrículas concedidas no período (compra + atribuição). */
  enrollmentsTotal: number;
  refundsCount: number;
  pendingRefundRequests: number;
};

export type RevenueDay = { day: string; revenueCents: number; sales: number };

export type TopCourse = {
  courseId: string;
  slug: string;
  title: string;
  sales: number;
  revenueCents: number;
};

/* ---------------------------------------------------------------- período */

export type DateRange = {
  /** ISO com offset -03:00, inclusivo. */
  from: string;
  /** ISO com offset -03:00, exclusivo (início do dia seguinte a hoje). */
  to: string;
  /** Primeiro e último dia (YYYY-MM-DD, fuso de São Paulo) cobertos. */
  firstDay: string;
  lastDay: string;
};

const SP_OFFSET = '-03:00'; // America/Sao_Paulo não tem horário de verão desde 2019.
const DAY_MS = 24 * 60 * 60 * 1000;

const spDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Data civil (YYYY-MM-DD) em São Paulo para o instante dado. */
export function saoPauloDate(now: Date): string {
  return spDateFormat.format(now);
}

function shiftDay(day: string, delta: number): string {
  const t = Date.parse(`${day}T00:00:00Z`) + delta * DAY_MS;
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * Janela dos últimos `period` dias **incluindo hoje**, em dias civis de São Paulo:
 * `[00:00 do dia (hoje − period + 1), 00:00 de amanhã)`. `to` é exclusivo.
 */
export function getDateRange(period: Period, now: Date = new Date()): DateRange {
  const today = saoPauloDate(now);
  const lastDay = today;
  const firstDay = shiftDay(today, -(period - 1));
  const tomorrow = shiftDay(today, 1);
  return {
    from: `${firstDay}T00:00:00${SP_OFFSET}`,
    to: `${tomorrow}T00:00:00${SP_OFFSET}`,
    firstDay,
    lastDay,
  };
}

/* ------------------------------------------------------------- mapeamento */

export function mapMetricsRow(raw: unknown): DashboardMetrics {
  const r = metricsRowSchema.parse(raw);
  return {
    revenueCents: r.revenue_cents,
    salesCount: r.sales_count,
    avgTicketCents: r.avg_ticket_cents,
    studentsTotal: r.students_total,
    studentsNew: r.students_new,
    enrollmentsPurchase: r.enrollments_purchase,
    enrollmentsAdminGrant: r.enrollments_admin_grant,
    enrollmentsTotal: r.enrollments_purchase + r.enrollments_admin_grant,
    refundsCount: r.refunds_count,
    pendingRefundRequests: r.pending_refund_requests,
  };
}

export function mapRevenueRows(raw: unknown[]): RevenueDay[] {
  return raw.map((row) => {
    const r = revenueDayRowSchema.parse(row);
    return { day: r.day, revenueCents: r.revenue_cents, sales: r.sales };
  });
}

export function mapTopCourseRows(raw: unknown[]): TopCourse[] {
  return raw.map((row) => {
    const r = topCourseRowSchema.parse(row);
    return {
      courseId: r.course_id,
      slug: r.slug,
      title: r.title,
      sales: r.sales,
      revenueCents: r.revenue_cents,
    };
  });
}

/* ------------------------------------------------------------ formatação */

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brlCompact = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const int = new Intl.NumberFormat('pt-BR');

export const formatBRL = (cents: number): string => brl.format(cents / 100);
export const formatBRLCompact = (cents: number): string => brlCompact.format(cents / 100);
export const formatInt = (n: number): string => int.format(n);

/** `2026-10-08` -> `08/10` (sem passar por Date: sem risco de fuso). */
export function formatDayShort(day: string): string {
  const [, m, d] = day.split('-');
  return `${d}/${m}`;
}

/* ------------------------------------------------------ escala do gráfico */

export type ChartBar = {
  day: string;
  value: number;
  x: number;
  width: number;
  /** Topo do retângulo (y menor = mais alto). */
  y: number;
  height: number;
  negative: boolean;
};

export type ChartTick = { value: number; y: number };

export type ChartScale = {
  width: number;
  height: number;
  /** y da linha zero. */
  zeroY: number;
  bars: ChartBar[];
  ticks: ChartTick[];
  min: number;
  max: number;
};

export type ChartLayout = {
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export const DEFAULT_LAYOUT: ChartLayout = {
  width: 720,
  height: 240,
  left: 52,
  right: 8,
  top: 12,
  bottom: 26,
};

/**
 * Escala linear com a linha zero sempre dentro do domínio: o domínio é
 * `[min(0, menor), max(0, maior)]`, então valores negativos descem abaixo do zero.
 * Sem dados ou tudo zero: domínio `[0, 1]` (barras de altura 0, linha zero no rodapé).
 */
export function buildChartScale(
  days: RevenueDay[],
  layout: ChartLayout = DEFAULT_LAYOUT,
): ChartScale {
  const plotW = layout.width - layout.left - layout.right;
  const plotH = layout.height - layout.top - layout.bottom;
  const values = days.map((d) => d.revenueCents);
  const min = Math.min(0, ...values);
  let max = Math.max(0, ...values);
  if (max === min) max = min + 1;

  const y = (v: number) => layout.top + ((max - v) / (max - min)) * plotH;
  const zeroY = y(0);

  const slot = days.length > 0 ? plotW / days.length : plotW;
  const barW = Math.max(1, slot * 0.7);

  const bars: ChartBar[] = days.map((d, i) => {
    const v = d.revenueCents;
    const vy = y(v);
    return {
      day: d.day,
      value: v,
      x: layout.left + i * slot + (slot - barW) / 2,
      width: barW,
      y: Math.min(vy, zeroY),
      height: Math.abs(zeroY - vy),
      negative: v < 0,
    };
  });

  const tickValues = [max, 0, ...(min < 0 ? [min] : [])];
  // sem dados, max foi forçado a 1: não mostra rótulo "R$ 0,01" no topo.
  const ticks = (max === min + 1 && min === 0 ? [0] : tickValues).map((value) => ({
    value,
    y: y(value),
  }));

  return { width: layout.width, height: layout.height, zeroY, bars, ticks, min, max };
}
