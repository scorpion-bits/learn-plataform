import { Skeleton } from '@/components/ui';

import styles from './InicioView.module.css';

export function InicioSkeleton() {
  return (
    <div className={styles.page} aria-busy="true" role="status">
      <span className={styles.sr}>Carregando…</span>
      <Skeleton variant="line" width="min(100%, 14rem)" height="2.2rem" />
      <Skeleton variant="block" height={260} />
      <Skeleton variant="line" width="min(100%, 20rem)" height="2.5rem" />
    </div>
  );
}
