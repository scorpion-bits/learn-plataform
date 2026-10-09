import { Skeleton } from '@/components/ui';

import styles from './loading.module.css';

export default function Loading() {
  return (
    <div className={styles.skel} role="status" aria-label="Carregando página">
      <Skeleton height="2.5rem" width="min(100%, 24rem)" />
      <Skeleton height="1.25rem" width="min(100%, 36rem)" />
      <Skeleton height="14rem" />
      <Skeleton height="8rem" />
    </div>
  );
}
