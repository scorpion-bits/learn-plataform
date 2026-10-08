import type { Metadata } from 'next';

import { Badge, Table } from '@/components/ui';
import type { TableColumn } from '@/components/ui';

import styles from './page.module.css';

export const metadata: Metadata = { title: 'Admin' };

interface Row {
  id: string;
  aluno: string;
  curso: string;
  total: string;
  status: string;
}

const COLUMNS: TableColumn<Row>[] = [
  { key: 'aluno', header: 'Aluno', render: (r) => r.aluno },
  { key: 'curso', header: 'Curso', render: (r) => r.curso },
  { key: 'total', header: 'Total', render: (r) => r.total },
  { key: 'status', header: 'Status', render: (r) => <Badge tone="mint">{r.status}</Badge> },
];

const ROWS: Row[] = [
  { id: '1', aluno: 'Ana Souza', curso: 'Godot do zero', total: 'R$ 197,00', status: 'Pago' },
  {
    id: '2',
    aluno: 'Bruno Lima',
    curso: 'Pixel art para jogos',
    total: 'R$ 97,00',
    status: 'Pago',
  },
  { id: '3', aluno: 'Carla Dias', curso: 'Godot do zero', total: 'R$ 197,00', status: 'Pago' },
];

const KPIS = [
  { label: 'Receita (30 dias)', value: 'R$ 12.480' },
  { label: 'Vendas', value: '64' },
  { label: 'Alunos ativos', value: '212' },
  { label: 'Matrículas', value: '78' },
];

// Placeholder para validar o AdminShell (dados fictícios). O dashboard real é ADMIN-00x.
export default function AdminPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Dashboard</h1>
      <ul className={styles.kpis}>
        {KPIS.map((kpi) => (
          <li key={kpi.label} className={styles.kpi}>
            <span className={styles.kpiLabel}>{kpi.label}</span>
            <span className={styles.kpiValue}>{kpi.value}</span>
          </li>
        ))}
      </ul>
      <section aria-labelledby="ultimos">
        <h2 id="ultimos" className={styles.h2}>
          Últimos pedidos
        </h2>
        <Table
          caption="Últimos pedidos (fictício)"
          columns={COLUMNS}
          rows={ROWS}
          getRowKey={(r) => r.id}
        />
      </section>
    </div>
  );
}
