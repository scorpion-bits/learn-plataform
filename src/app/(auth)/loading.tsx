import { Skeleton } from '@/components/ui';

import styles from './loading.module.css';

export default function Loading() {
  return (
    <div className={styles.skel} role="status" aria-label="Carregando">
      <Skeleton height="2rem" width="60%" />
      <Skeleton height="3rem" />
      <Skeleton height="3rem" />
      <Skeleton height="3rem" />
    </div>
  );
}
