import { notFound } from 'next/navigation';

import { ErrorState } from '@/components/ui';

import { AdminMetricsError, getDashboardMetrics, getRevenueByDay, getTopCourses } from '../queries';
import type { DateRange } from '../model';
import { KpiGrid } from './KpiGrid';
import { RevenueChart } from './RevenueChart';
import { TopCourses } from './TopCourses';

type Settled<T> = { ok: true; value: T } | { ok: false; error: unknown };

async function settle<T>(fn: () => Promise<T>): Promise<Settled<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (error) {
    return { ok: false, error };
  }
}

/** `42501` (não-admin) -> 404; qualquer outra falha vira erro só deste bloco. */
function BlockError({ error, title }: { error: unknown; title: string }) {
  if (error instanceof AdminMetricsError && error.forbidden) notFound();
  return (
    <ErrorState
      title={title}
      message="Não foi possível carregar este bloco. Recarregue a página para tentar de novo."
    />
  );
}

export async function KpiBlock({ range }: { range: DateRange }) {
  const result = await settle(() => getDashboardMetrics(range.from, range.to));
  if (!result.ok) return <BlockError error={result.error} title="Indicadores indisponíveis" />;
  return <KpiGrid metrics={result.value} />;
}

export async function ChartBlock({ range, titleId }: { range: DateRange; titleId: string }) {
  const result = await settle(() => getRevenueByDay(range.from, range.to));
  if (!result.ok) return <BlockError error={result.error} title="Gráfico indisponível" />;
  return <RevenueChart titleId={titleId} days={result.value} />;
}

export async function TopCoursesBlock({ range }: { range: DateRange }) {
  const result = await settle(() => getTopCourses(range.from, range.to, 5));
  if (!result.ok) return <BlockError error={result.error} title="Ranking indisponível" />;
  return <TopCourses courses={result.value} />;
}
