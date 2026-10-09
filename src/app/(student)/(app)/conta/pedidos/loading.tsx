import { Skeleton } from '@/components/ui';
import styles from '@/features/orders/components/Orders.module.css';

export default function Loading() {
  return (
    <div className={styles.skel} role="status" aria-label="Carregando pedidos">
      <Skeleton height="2rem" width="10rem" />
      <Skeleton height="6rem" />
      <Skeleton height="6rem" />
    </div>
  );
}
