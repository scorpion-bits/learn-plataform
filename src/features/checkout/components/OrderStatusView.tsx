import { ChamferCard } from '@/components/brand';
import { Badge, Button } from '@/components/ui';
import { formatPrice } from '@/features/catalog/model';

import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE } from '../model';
import type { MyOrder } from '../model';
import styles from './Checkout.module.css';

const dateTime = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});

/**
 * Placeholder de `/checkout/pedido/[orderId]` (PAY-002): confirma que o pedido é
 * do aluno e mostra o status. QR Code, copia-e-cola e polling ficam no PAY-004.
 * Esta página NUNCA concede acesso.
 */
export function OrderStatusView({ order }: { order: MyOrder }) {
  const expires = order.expiresAt ? dateTime.format(new Date(order.expiresAt)) : null;

  return (
    <div className={styles.order}>
      <ChamferCard as="section" aria-labelledby="pedido-titulo">
        <p className={styles.eyebrow}>Pedido</p>
        <h1 id="pedido-titulo" className={styles.formTitle}>
          {order.course.title}
        </h1>
        <dl className={styles.facts}>
          <div className={styles.fact}>
            <dt>Status</dt>
            <dd>
              <Badge tone={ORDER_STATUS_TONE[order.status]}>
                {ORDER_STATUS_LABEL[order.status]}
              </Badge>
            </dd>
          </div>
          <div className={styles.fact}>
            <dt>Valor</dt>
            <dd>{formatPrice(order.amountCents)}</dd>
          </div>
          {order.status === 'pending' && expires ? (
            <div className={styles.fact}>
              <dt>PIX válido até</dt>
              <dd>{expires}</dd>
            </div>
          ) : null}
        </dl>
        {order.status === 'pending' ? (
          <p className={styles.policy} role="status">
            {order.hasPix
              ? 'Seu PIX foi gerado. Em breve o QR Code aparecerá aqui; o acesso é liberado automaticamente após a confirmação do pagamento.'
              : 'Estamos gerando seu PIX. Atualize a página em alguns segundos.'}
          </p>
        ) : null}
        <div className={styles.actions}>
          {order.status === 'paid' && order.course.slug ? (
            <Button href={`/aprender/${order.course.slug}`} fullWidth>
              Ir para o curso
            </Button>
          ) : null}
          {(order.status === 'failed' ||
            order.status === 'expired' ||
            order.status === 'canceled') &&
          order.course.slug ? (
            <Button href={`/checkout/${order.course.slug}`} fullWidth>
              Gerar novo PIX
            </Button>
          ) : null}
          <Button href="/minha-biblioteca" variant="secondary" fullWidth>
            Minha biblioteca
          </Button>
        </div>
      </ChamferCard>
    </div>
  );
}
