import { Badge, EmptyState } from '@/components/ui';
import { formatBRL, formatDate } from '@/features/students/format';

import { STATUS_LABELS, STATUS_TONES, myOrderRefundState } from '../model';
import type { MyOrder } from '../model';
import styles from './Orders.module.css';
import { RequestRefundButton } from './RequestRefundButton';

/** Pedidos do aluno com o botão "Solicitar reembolso" nos elegíveis. `now` injetável (testes/vitrine). */
export function MyOrdersView({
  orders,
  now,
  demo,
}: {
  orders: MyOrder[];
  now: number;
  demo?: boolean;
}) {
  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.title}>Meus pedidos</h1>
        <p className={styles.muted}>Histórico das suas compras.</p>
      </header>

      {orders.length === 0 ? (
        <EmptyState
          title="Nenhum pedido ainda"
          description="Os cursos que você comprar aparecem aqui."
        />
      ) : (
        <ul className={styles.orderList}>
          {orders.map((o) => {
            const state = myOrderRefundState(o, now);
            return (
              <li key={o.id} className={styles.orderCard}>
                <div className={styles.orderTop}>
                  <strong>{o.courseTitle}</strong>
                  <Badge tone={STATUS_TONES[o.status]}>{STATUS_LABELS[o.status]}</Badge>
                </div>
                <p className={styles.dim}>
                  {formatBRL(o.amountCents)} · pago em {formatDate(o.paidAt)}
                </p>
                {state.kind === 'eligible' ? (
                  <>
                    <div className={styles.actions}>
                      <RequestRefundButton
                        orderId={o.id}
                        courseTitle={o.courseTitle}
                        remaining={state.remaining}
                        demo={demo}
                      />
                    </div>
                  </>
                ) : null}
                {state.kind === 'requested' ? (
                  <p className={styles.muted} role="status">
                    Reembolso solicitado em {formatDate(o.refundRequestedAt)}. A equipe vai
                    analisar; o acesso é removido quando o estorno for confirmado.
                  </p>
                ) : null}
                {state.kind === 'refunded' ? (
                  <p className={styles.muted}>Reembolsado em {formatDate(o.refundedAt)}.</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
