import type { ReactNode } from 'react';

import type { Period } from '../schemas';
import { PeriodSelector } from './PeriodSelector';
import styles from './DashboardView.module.css';

export interface DashboardViewProps {
  period: Period;
  periodLabel: string;
  basePath?: string;
  kpis: ReactNode;
  chart: ReactNode;
  topCourses: ReactNode;
}

/** Esqueleto da página (slots), compartilhado por `/admin` e pela vitrine `/dev/admin-dashboard`. */
export function DashboardView({
  period,
  periodLabel,
  basePath,
  kpis,
  chart,
  topCourses,
}: DashboardViewProps) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.range}>{periodLabel}</p>
        </div>
        <PeriodSelector current={period} basePath={basePath} />
      </header>

      <section aria-label="Indicadores do período">{kpis}</section>

      <section className={styles.panel} aria-labelledby="receita-titulo">
        <h2 id="receita-titulo" className={styles.h2}>
          Receita por dia
        </h2>
        <p className={styles.sub}>Líquida: vendas menos estornos. Fuso de São Paulo.</p>
        {chart}
      </section>

      <section className={styles.panel} aria-labelledby="top-titulo">
        <h2 id="top-titulo" className={styles.h2}>
          Cursos mais vendidos
        </h2>
        {topCourses}
      </section>
    </div>
  );
}
