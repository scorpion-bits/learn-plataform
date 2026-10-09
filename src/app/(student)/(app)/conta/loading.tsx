import { Skeleton } from '@/components/ui';
import styles from '@/features/account/components/Account.module.css';

export default function Loading() {
  return (
    <div className={styles.skel} role="status" aria-label="Carregando sua conta">
      <Skeleton height="2rem" width="10rem" />
      <Skeleton height="18rem" />
      <Skeleton height="12rem" />
    </div>
  );
}
