import { Skeleton } from '@/components/ui';

import styles from './LibraryView.module.css';

/** Mesma geometria da biblioteca (título, abas e 3 cards). */
export function LibrarySkeleton() {
  return (
    <div className={styles.page} aria-busy="true" role="status">
      <span className={styles.sr}>Carregando sua biblioteca…</span>
      <Skeleton variant="line" width="min(100%, 16rem)" height="2.2rem" />
      <Skeleton variant="line" width="min(100%, 24rem)" height="2.5rem" />
      <div className={styles.grid}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="block" height={340} />
        ))}
      </div>
    </div>
  );
}
