import type { CSSProperties } from 'react';

import { IsoCube } from '../IsoCube/IsoCube';
import type { IsoCubeTone } from '../IsoCube/IsoCube';
import styles from './CubeProgress.module.css';

export type CubeProgressSize = 'sm' | 'md' | 'lg';

const CUBE_PX: Record<CubeProgressSize, number> = { sm: 14, md: 20, lg: 28 };

export interface CubeProgressProps {
  /** Total de itens (aulas). */
  total: number;
  /** Itens concluídos (limitado a 0..total). */
  completed: number;
  /**
   * Máximo de cubos desenhados. Acima disso cada cubo representa um grupo de
   * itens (ex.: 40 aulas com máximo 12 => 1 cubo por 4 aulas); o cubo só
   * "acende" quando o grupo inteiro está concluído.
   */
  maxVisible?: number;
  /** sm (14px, cards/360px), md (20px), lg (28px). */
  size?: CubeProgressSize;
  /** Mostra o percentual numérico ao lado dos cubos. */
  showLabel?: boolean;
  tone?: IsoCubeTone;
  /** Destaca com brilho o próximo cubo a acender. */
  highlightNext?: boolean;
  /** Nome acessível do progressbar. */
  label?: string;
  /** Unidade no plural/singular para o aria-valuetext ("7 de 12 aulas, 58%"). */
  unit?: string;
  unitSingular?: string;
  className?: string;
}

/**
 * Trilha de cubos isométricos — um por item — que acendem ao concluir, com
 * percentual numérico. `role="progressbar"`; os cubos e o texto visível são
 * decorativos para leitores de tela (o `aria-valuetext` diz tudo).
 * Server Component, sem JS: a "ignição" é animação CSS.
 */
export function CubeProgress({
  total,
  completed,
  maxVisible = 12,
  size = 'md',
  showLabel = true,
  tone = 'cyan',
  highlightNext = true,
  label = 'Progresso',
  unit = 'aulas',
  unitSingular = 'aula',
  className,
}: CubeProgressProps) {
  const safeTotal = Math.max(0, Math.floor(total));
  const done = Math.min(safeTotal, Math.max(0, Math.floor(completed)));
  const percent = safeTotal === 0 ? 0 : Math.round((done / safeTotal) * 100);

  const cap = Math.max(1, Math.floor(maxVisible));
  const perCube = Math.max(1, Math.ceil(safeTotal / cap));
  const cubeCount = safeTotal === 0 ? 0 : Math.ceil(safeTotal / perCube);
  const nextIndex = done < safeTotal ? Math.floor(done / perCube) : -1;

  const valueText = `${done} de ${safeTotal} ${safeTotal === 1 ? unitSingular : unit}, ${percent}%`;
  const px = CUBE_PX[size];

  return (
    <div
      className={[styles.root, styles[size], className].filter(Boolean).join(' ')}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeTotal}
      aria-valuenow={done}
      aria-valuetext={valueText}
      data-grouped={perCube > 1 ? 'true' : undefined}
    >
      <div className={styles.trail} aria-hidden="true">
        {Array.from({ length: cubeCount }, (_, i) => {
          const end = Math.min((i + 1) * perCube, safeTotal);
          const filled = done >= end;
          const state = filled ? 'filled' : i === nextIndex && highlightNext ? 'active' : 'empty';
          return (
            <span
              key={i}
              className={styles.slot}
              data-lit={filled ? 'true' : undefined}
              style={{ '--i': i } as CSSProperties}
            >
              <IsoCube size={px} state={state} tone={tone} />
            </span>
          );
        })}
      </div>
      {showLabel && (
        <span className={styles.percent} aria-hidden="true">
          {percent}%
        </span>
      )}
    </div>
  );
}
