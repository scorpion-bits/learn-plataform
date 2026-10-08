import { useId } from 'react';
import type { CSSProperties } from 'react';

import styles from './IsoCube.module.css';

export type IsoCubeState = 'empty' | 'filled' | 'active' | 'locked';
export type IsoCubeTone = 'cyan' | 'mint' | 'amber' | 'violet';

export interface IsoCubeProps {
  /** Largura em px (a altura segue a proporção 88:100 do cubo da logo). */
  size?: number;
  /** empty = só contorno; filled = 3 faces; active = filled + brilho; locked = apagado + cadeado. */
  state?: IsoCubeState;
  tone?: IsoCubeTone;
  /** Texto alternativo. Com `label` o cubo vira `role="img"`; sem, é decorativo (aria-hidden). */
  label?: string;
  /** Força decorativo/não-decorativo. Padrão: decorativo quando não há `label`. */
  decorative?: boolean;
  className?: string;
  style?: CSSProperties;
}

/*
 * Geometria (viewBox 88x100), medida sobre scorpion_bits_isometric_cube.png:
 * hexágono de vértices T(44,1.3) UR(86.2,25.7) LR(86.2,74.3) B(44,98.7)
 * LL(1.8,74.3) UL(1.8,25.7), centro C(44,50). Contorno com cantos arredondados
 * (raio ~5) e junção em Y. O traço é centrado no caminho, por isso o caminho
 * fica inset de metade da espessura (~1.3).
 */
const OUTLINE =
  'M39.7 3.8Q44 1.3 48.3 3.8L81.9 23.2Q86.2 25.7 86.2 30.7V69.3Q86.2 74.4 81.9 76.9L48.3 96.2Q44 98.7 39.7 96.2L6.1 76.9Q1.8 74.4 1.8 69.3V30.7Q1.8 25.7 6.1 23.2ZM1.8 25.7 44 50 86.2 25.7M44 50V98.7';

/**
 * Cubo isométrico da marca em SVG paramétrico (sem raster, ~1 KB de markup).
 * Três faces como na logo (topo em gradiente, esquerda clara, direita escura)
 * e contorno navy grosso (`--outline`). A cor vem da `tone`; o estado só troca
 * classes — todo o visual vive em IsoCube.module.css.
 */
export function IsoCube({
  size = 32,
  state = 'filled',
  tone = 'cyan',
  label,
  decorative,
  className,
  style,
}: IsoCubeProps) {
  const gid = `ic${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const isDecorative = decorative ?? label === undefined;
  // traço com espessura mínima visual (~1px) em tamanhos pequenos
  const strokeWidth = Math.min(5, Math.max(3, 80 / size));

  const classes = [styles.cube, styles[tone], styles[state], className].filter(Boolean).join(' ');

  return (
    <svg
      className={classes}
      width={size}
      height={Math.round((size * 100) / 88)}
      viewBox="0 0 88 100"
      style={style}
      data-state={state}
      data-tone={tone}
      {...(isDecorative
        ? { 'aria-hidden': true, focusable: false }
        : { role: 'img', 'aria-label': label })}
    >
      <defs>
        <linearGradient id={gid}>
          <stop className={styles.stopA} offset="0" />
          <stop className={styles.stopB} offset="1" />
        </linearGradient>
      </defs>
      <path className={styles.left} d="M1.8 25.7 44 50v48.7L1.8 74.3z" />
      <path className={styles.right} d="M86.2 25.7 44 50v48.7l42.2-24.4z" />
      <path className={styles.top} fill={`url(#${gid})`} d="M44 1.3l42.2 24.4L44 50 1.8 25.7z" />
      <path className={styles.sheen} d="M1.8 25.7Q44 8 86.2 25.7L44 1.3z" />
      <path
        className={styles.shade}
        d="M1.8 30Q12 68 44 98.7L1.8 74.3zM86.2 30Q76 68 44 98.7l42.2-24.4z"
      />
      <path className={styles.outline} d={OUTLINE} strokeWidth={strokeWidth} />
      {state === 'locked' && (
        <g className={styles.lock} transform="translate(65 62)skewY(-30)">
          <path d="M-3.5-2v-3a3.5 3.5 0 017 0v3" />
          <rect x="-5.5" y="-2" width="11" height="9" rx="1.5" />
        </g>
      )}
    </svg>
  );
}
