import { Skeleton } from '@/components/ui';

import styles from './page.module.css';

export default function Loading() {
  return (
    <div className={styles.skel} role="status" aria-label="Carregando materiais">
      <Skeleton height="1.25rem" width="18rem" />
      <Skeleton height="2rem" width="14rem" />
      <Skeleton height="4.5rem" />
      <Skeleton height="4.5rem" />
    </div>
  );
}
