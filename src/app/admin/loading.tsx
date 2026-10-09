import { Skeleton } from '@/components/ui';
import {
  ChartSkeleton,
  KpiSkeleton,
  TopCoursesSkeleton,
} from '@/features/admin-metrics/components/Skeletons';

import styles from './loading.module.css';

/** Geometria do dashboard (`/admin`); as demais rotas admin têm o próprio loading. */
export default function Loading() {
  return (
    <div className={styles.skel}>
      <Skeleton height="2rem" width="12rem" />
      <KpiSkeleton />
      <ChartSkeleton />
      <TopCoursesSkeleton />
    </div>
  );
}
