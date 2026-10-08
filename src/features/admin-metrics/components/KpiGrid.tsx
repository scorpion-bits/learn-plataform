import Link from 'next/link';

import { ChamferCard, IsoCube } from '@/components/brand';
import type { IsoCubeTone } from '@/components/brand';

import { formatBRL, formatInt } from '../model';
import type { DashboardMetrics } from '../model';
import styles from './KpiGrid.module.css';

type Kpi = { label: string; value: string; hint?: string; tone: IsoCubeTone };

export const REFUND_QUEUE_HREF = '/admin/pedidos?filtro=reembolso';

export function KpiGrid({ metrics }: { metrics: DashboardMetrics }) {
  const kpis: Kpi[] = [
    {
      label: 'Receita líquida',
      value: formatBRL(metrics.revenueCents),
      hint: 'vendas menos estornos',
      tone: 'cyan',
    },
    { label: 'Vendas', value: formatInt(metrics.salesCount), tone: 'mint' },
    {
      label: 'Alunos novos',
      value: formatInt(metrics.studentsNew),
      hint: `${formatInt(metrics.studentsTotal)} no total`,
      tone: 'violet',
    },
    {
      label: 'Matrículas',
      value: formatInt(metrics.enrollmentsTotal),
      hint: `${formatInt(metrics.enrollmentsPurchase)} compra · ${formatInt(metrics.enrollmentsAdminGrant)} atribuição`,
      tone: 'amber',
    },
  ];

  return (
    <div className={styles.wrap}>
      <ul className={styles.kpis}>
        {kpis.map((k) => (
          <li key={k.label} className={styles.item}>
            <ChamferCard className={styles.card}>
              <div className={styles.head}>
                <IsoCube size={28} tone={k.tone} state="filled" />
                <span className={styles.label}>{k.label}</span>
              </div>
              <p className={styles.value}>{k.value}</p>
              {k.hint ? <p className={styles.hint}>{k.hint}</p> : null}
            </ChamferCard>
          </li>
        ))}
      </ul>
      <dl className={styles.secondary}>
        <div className={styles.sec}>
          <dt>Ticket médio</dt>
          <dd>{formatBRL(metrics.avgTicketCents)}</dd>
        </div>
        <div className={styles.sec}>
          <dt>Reembolsos</dt>
          <dd>{formatInt(metrics.refundsCount)}</dd>
        </div>
        <div className={styles.sec}>
          <dt>Pedidos de reembolso pendentes</dt>
          <dd>
            {formatInt(metrics.pendingRefundRequests)}
            {metrics.pendingRefundRequests > 0 ? (
              <Link className={styles.secLink} href={REFUND_QUEUE_HREF}>
                Ver fila
              </Link>
            ) : null}
          </dd>
        </div>
      </dl>
    </div>
  );
}
