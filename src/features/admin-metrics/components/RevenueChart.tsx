import { buildChartScale, formatBRL, formatBRLCompact, formatDayShort } from '../model';
import type { RevenueDay } from '../model';
import styles from './RevenueChart.module.css';

/**
 * Receita líquida por dia em SVG próprio (sem lib). Positivas em ciano, negativas
 * (estornos acima das vendas do dia) em coral abaixo da linha zero. A tabela
 * `visually-hidden` é a alternativa para leitor de tela; o SVG é só visual.
 */
export function RevenueChart({ days, titleId }: { days: RevenueDay[]; titleId: string }) {
  const scale = buildChartScale(days);
  const { width, height, bars, ticks } = scale;
  const labelIdx = days.length > 0 ? [0, Math.floor((days.length - 1) / 2), days.length - 1] : [];
  const uniqueLabels = [...new Set(labelIdx)];

  return (
    <figure className={styles.figure}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        focusable="false"
      >
        {ticks.map((t) => (
          <g key={t.value}>
            <line
              className={t.value === 0 ? styles.zero : styles.grid}
              x1={52}
              x2={width - 8}
              y1={t.y}
              y2={t.y}
            />
            <text className={styles.tick} x={48} y={t.y + 4} textAnchor="end">
              {formatBRLCompact(t.value)}
            </text>
          </g>
        ))}
        {bars.map((b) => (
          <rect
            key={b.day}
            className={b.negative ? styles.barNeg : styles.bar}
            x={b.x}
            y={b.y}
            width={b.width}
            height={b.height}
            rx={Math.min(2, b.width / 3)}
          >
            <title>{`${formatDayShort(b.day)}: ${formatBRL(b.value)}`}</title>
          </rect>
        ))}
        {uniqueLabels.map((i) => {
          const b = bars[i]!;
          const anchor = i === 0 ? 'start' : i === bars.length - 1 ? 'end' : 'middle';
          const x = anchor === 'start' ? b.x : anchor === 'end' ? b.x + b.width : b.x + b.width / 2;
          return (
            <text key={b.day} className={styles.tick} x={x} y={height - 6} textAnchor={anchor}>
              {formatDayShort(b.day)}
            </text>
          );
        })}
      </svg>
      <table className="visually-hidden" aria-labelledby={titleId}>
        <thead>
          <tr>
            <th scope="col">Dia</th>
            <th scope="col">Receita líquida</th>
            <th scope="col">Vendas</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}>
              <th scope="row">{formatDayShort(d.day)}</th>
              <td>{formatBRL(d.revenueCents)}</td>
              <td>{d.sales}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
