import { Skeleton } from '@/components/ui';

import styles from './Checkout.module.css';

/** Mesma geometria de CheckoutView (resumo + formulário) ou do pedido. */
export function CheckoutSkeleton({ variant = 'checkout' }: { variant?: 'checkout' | 'order' }) {
  if (variant === 'order') {
    return (
      <div className={styles.order} aria-busy="true" role="status">
        <span className={styles.sr}>Carregando pedido…</span>
        <Skeleton variant="block" height="18rem" />
      </div>
    );
  }
  return (
    <div className={styles.page} aria-busy="true" role="status">
      <span className={styles.sr}>Carregando pagamento…</span>
      <Skeleton variant="line" width="12rem" />
      <Skeleton
        variant="line"
        width="min(100%, 20rem)"
        height="2.4rem"
        className={styles.heading}
      />
      <div className={styles.layout}>
        <Skeleton variant="block" height="12rem" />
        <Skeleton variant="block" height="24rem" />
      </div>
    </div>
  );
}
