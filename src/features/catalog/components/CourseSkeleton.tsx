import { Skeleton } from '@/components/ui';

import styles from './CourseView.module.css';
import skeletonStyles from './Skeletons.module.css';

/** Mesma geometria de CourseView (capa 16:9, título, aside de compra, ementa). */
export function CourseSkeleton() {
  return (
    <div className={styles.page} aria-busy="true" role="status">
      <span className={skeletonStyles.sr}>Carregando curso…</span>
      <div className={styles.layout}>
        <div className={styles.hero}>
          <Skeleton variant="block" height="auto" className={skeletonStyles.cover} />
          <div className={styles.heroText}>
            <Skeleton variant="line" width="6rem" />
            <Skeleton variant="line" width="min(100%, 28rem)" height="2.6rem" />
            <Skeleton variant="line" width="min(100%, 22rem)" />
          </div>
        </div>
        <div className={styles.buy}>
          <Skeleton variant="block" height="11rem" />
        </div>
        <div className={styles.content}>
          <div className={styles.section}>
            <Skeleton variant="line" width="10rem" height="1.8rem" />
            <Skeleton variant="line" />
            <Skeleton variant="line" width="85%" />
          </div>
          <div className={styles.section}>
            <Skeleton variant="line" width="7rem" height="1.8rem" />
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} variant="block" height="4rem" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
