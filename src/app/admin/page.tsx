import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ChartBlock, KpiBlock, TopCoursesBlock } from '@/features/admin-metrics/components/Blocks';
import { DashboardView } from '@/features/admin-metrics/components/DashboardView';
import {
  ChartSkeleton,
  KpiSkeleton,
  TopCoursesSkeleton,
} from '@/features/admin-metrics/components/Skeletons';
import { formatDayShort, getDateRange } from '@/features/admin-metrics/model';
import { parsePeriod } from '@/features/admin-metrics/schemas';

export const metadata: Metadata = { title: 'Admin' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Dashboard: cada bloco carrega e falha sozinho (Suspense + ErrorState); leitura só via RPC. */
export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  const period = parsePeriod((await searchParams).periodo);
  const range = getDateRange(period);

  return (
    <DashboardView
      period={period}
      periodLabel={`${formatDayShort(range.firstDay)} a ${formatDayShort(range.lastDay)} · últimos ${period} dias`}
      kpis={
        <Suspense key={`k${period}`} fallback={<KpiSkeleton />}>
          <KpiBlock range={range} />
        </Suspense>
      }
      chart={
        <Suspense key={`c${period}`} fallback={<ChartSkeleton />}>
          <ChartBlock range={range} titleId="receita-titulo" />
        </Suspense>
      }
      topCourses={
        <Suspense key={`t${period}`} fallback={<TopCoursesSkeleton />}>
          <TopCoursesBlock range={range} />
        </Suspense>
      }
    />
  );
}
