import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { KpiGrid } from '@/features/admin-metrics/components/KpiGrid';
import { DashboardView } from '@/features/admin-metrics/components/DashboardView';
import { RevenueChart } from '@/features/admin-metrics/components/RevenueChart';
import { TopCourses } from '@/features/admin-metrics/components/TopCourses';
import {
  ChartSkeleton,
  KpiSkeleton,
  TopCoursesSkeleton,
} from '@/features/admin-metrics/components/Skeletons';
import { ErrorState } from '@/components/ui';
import { formatDayShort, getDateRange } from '@/features/admin-metrics/model';
import type { DashboardMetrics, RevenueDay, TopCourse } from '@/features/admin-metrics/model';
import { parsePeriod } from '@/features/admin-metrics/schemas';

export const metadata: Metadata = {
  title: 'Vitrine · dashboard admin',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const METRICS: DashboardMetrics = {
  revenueCents: 1_248_000,
  salesCount: 64,
  avgTicketCents: 19_500,
  studentsTotal: 212,
  studentsNew: 41,
  enrollmentsPurchase: 64,
  enrollmentsAdminGrant: 14,
  enrollmentsTotal: 78,
  refundsCount: 2,
  pendingRefundRequests: 3,
};

const COURSES: TopCourse[] = [
  { courseId: 'a', slug: 'godot', title: 'Godot do zero', sales: 31, revenueCents: 610_700 },
  { courseId: 'b', slug: 'pixel', title: 'Pixel art para jogos', sales: 22, revenueCents: 213_400 },
  {
    courseId: 'c',
    slug: 'shaders',
    title: 'Shaders 2D na prática',
    sales: 9,
    revenueCents: 179_100,
  },
  { courseId: 'd', slug: 'audio', title: 'Áudio para jogos indie', sales: 2, revenueCents: 29_400 },
];

function mockDays(count: number, lastDay: string): RevenueDay[] {
  const end = Date.parse(`${lastDay}T00:00:00Z`);
  return Array.from({ length: count }, (_, i) => {
    const day = new Date(end - (count - 1 - i) * 86_400_000).toISOString().slice(0, 10);
    const wave = Math.abs(Math.sin(i * 1.7)) * 60_000 + (i % 5 === 0 ? 0 : 15_000);
    const revenueCents = i % 11 === 7 ? -19_700 : i % 6 === 3 ? 0 : Math.round(wave / 100) * 100;
    return { day, revenueCents, sales: revenueCents > 0 ? Math.ceil(revenueCents / 19_700) : 0 };
  });
}

/** Vitrine com dados fictícios. `?periodo=7|30|90` e `?state=loading|empty|error`. */
export default async function AdminDashboardShowcase({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (process.env.NODE_ENV === 'production') notFound();
  const params = await searchParams;
  const period = parsePeriod(params.periodo);
  const state = params.state;
  const range = getDateRange(period);
  const base = '/dev/admin-dashboard';

  const err = (title: string) => <ErrorState title={title} message="Falha simulada." />;

  return (
    <main style={{ maxWidth: '72rem', margin: '0 auto', padding: 'var(--space-5) var(--space-4)' }}>
      <DashboardView
        period={period}
        basePath={base}
        periodLabel={`${formatDayShort(range.firstDay)} a ${formatDayShort(range.lastDay)} · últimos ${period} dias`}
        kpis={
          state === 'loading' ? (
            <KpiSkeleton />
          ) : state === 'error' ? (
            err('Indicadores indisponíveis')
          ) : (
            <KpiGrid
              metrics={
                state === 'empty'
                  ? {
                      ...METRICS,
                      revenueCents: 0,
                      salesCount: 0,
                      avgTicketCents: 0,
                      studentsNew: 0,
                      enrollmentsTotal: 0,
                      enrollmentsPurchase: 0,
                      enrollmentsAdminGrant: 0,
                      refundsCount: 0,
                      pendingRefundRequests: 0,
                    }
                  : METRICS
              }
            />
          )
        }
        chart={
          state === 'loading' ? (
            <ChartSkeleton />
          ) : state === 'error' ? (
            err('Gráfico indisponível')
          ) : (
            <RevenueChart
              titleId="receita-titulo"
              days={
                state === 'empty'
                  ? mockDays(period, range.lastDay).map((d) => ({
                      ...d,
                      revenueCents: 0,
                      sales: 0,
                    }))
                  : mockDays(period, range.lastDay)
              }
            />
          )
        }
        topCourses={
          state === 'loading' ? (
            <TopCoursesSkeleton />
          ) : state === 'error' ? (
            err('Ranking indisponível')
          ) : (
            <TopCourses courses={state === 'empty' ? [] : COURSES} />
          )
        }
      />
    </main>
  );
}
