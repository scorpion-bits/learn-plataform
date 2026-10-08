import { Skeleton } from '@/components/ui';

import styles from './Skeletons.module.css';

/** Mesma geometria dos blocos reais para o streaming não saltar o layout. */
export function KpiSkeleton() {
  return (
    <div className={styles.kpis} role="status" aria-label="Carregando indicadores">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} height="8.5rem" />
      ))}
      <div className={styles.secondary}>
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} height="4rem" />
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div role="status" aria-label="Carregando gráfico de receita">
      <Skeleton height="13rem" />
    </div>
  );
}

export function TopCoursesSkeleton() {
  return (
    <div className={styles.rows} role="status" aria-label="Carregando cursos mais vendidos">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} height="3.5rem" />
      ))}
    </div>
  );
}
