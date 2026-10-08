import { Skeleton } from '@/components/ui';

import styles from '../page.module.css';

export default function Loading() {
  return (
    <div className={styles.skel} role="status" aria-label="Carregando aluno">
      <Skeleton height="2rem" width="14rem" />
      <Skeleton height="1rem" width="18rem" />
      <Skeleton height="4rem" />
      <Skeleton height="4rem" />
    </div>
  );
}
