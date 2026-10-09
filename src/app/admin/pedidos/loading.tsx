import { Skeleton } from '@/components/ui';
import styles from '@/features/orders/components/Orders.module.css';

export default function Loading() {
  return (
    <div className={styles.skel} role="status" aria-label="Carregando pedidos">
      <Skeleton height="2rem" width="10rem" />
      <Skeleton height="2.75rem" width="24rem" />
      <Skeleton height="3.5rem" />
      <Skeleton height="3.5rem" />
      <Skeleton height="3.5rem" />
    </div>
  );
}
