import { Skeleton } from '@/components/ui';

import cardStyles from './CourseCard.module.css';
import styles from './CatalogView.module.css';
import skeletonStyles from './Skeletons.module.css';

/** Mesma geometria de CatalogView/CourseCard (capa 16:9 + corpo). */
export function CatalogSkeleton() {
  return (
    <div className={styles.page} aria-busy="true" role="status">
      <span className={skeletonStyles.sr}>Carregando cursos…</span>
      <header className={styles.header}>
        <Skeleton variant="line" width="6rem" />
        <Skeleton variant="line" width="min(100%, 24rem)" height="2.4rem" />
        <Skeleton variant="line" width="min(100%, 32rem)" />
      </header>
      <div className={skeletonStyles.chips}>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} variant="block" width="6rem" height="var(--tap)" />
        ))}
      </div>
      <ul className={styles.grid}>
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className={cardStyles.item} data-featured={i === 0 ? 'true' : undefined}>
            <div className={skeletonStyles.card}>
              <Skeleton variant="block" height="auto" className={skeletonStyles.cover} />
              <div className={cardStyles.body}>
                <Skeleton variant="line" width="40%" />
                <Skeleton variant="line" height="1.4rem" />
                <Skeleton variant="line" width="80%" />
                <Skeleton variant="line" width="60%" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
