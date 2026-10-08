import Link from 'next/link';
import type { HTMLAttributes, ReactNode } from 'react';

import styles from './ChamferCard.module.css';

export interface ChamferCardProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** Elemento quando não há `href`. Com `href` o card inteiro é um <a> (next/link). */
  as?: 'div' | 'article' | 'section' | 'li' | 'aside';
  href?: string;
  /**
   * Realce de hover/pressão e dica visual de que o card é clicável. A dica
   * (seta no rodapé) é permanente — hover nunca é a única pista (mobile).
   * Implícito quando há `href`.
   */
  interactive?: boolean;
  /** Mostra a seta de "abrir" em cards interativos. Padrão: true. */
  cue?: boolean;
  /** Lado onde o chanfro sobe: 'right' (padrão, como a face esquerda da logo) ou 'left'. */
  tilt?: 'right' | 'left';
  /**
   * 'top' (padrão): só o topo é chanfrado. 'face': topo e base, um
   * paralelogramo como a face lateral do cubo (a técnica do .why-card).
   */
  shape?: 'top' | 'face';
  /** 'none': o conteúdo vai até as bordas (mídia sangrando sob o chanfro). */
  padding?: 'default' | 'none';
  /** Atributos extras repassados ao <a> quando há href. */
  target?: string;
  rel?: string;
  prefetch?: boolean;
  children?: ReactNode;
}

function Cue() {
  return (
    <span className={styles.cue} aria-hidden="true">
      <svg viewBox="0 0 16 16" width="14" height="14">
        <path d="M3 8h9M8.5 4 12.5 8l-4 4" />
      </svg>
    </span>
  );
}

/**
 * Card com topo chanfrado (técnica do .why-card do site da marca). Três
 * camadas: `root` (sem clip: recebe foco, sombra e movimento), `frame`
 * (1px de padding + clip-path = a borda, inclusive na diagonal) e o `::before`
 * (preenchimento com `clip-path: inherit`). O conteúdo ganha padding-top
 * compensando o chanfro e nunca é cortado.
 *
 * Se o card tiver um link interno "esticado" em vez de `href`, passe
 * `interactive`: o anel de foco aparece no card quando o filho recebe foco.
 */
export function ChamferCard({
  as: Tag = 'div',
  href,
  interactive,
  cue = true,
  tilt = 'right',
  shape = 'top',
  padding = 'default',
  className,
  children,
  prefetch,
  target,
  rel,
  ...rest
}: ChamferCardProps) {
  const isInteractive = interactive ?? href !== undefined;
  const classes = [styles.root, isInteractive ? styles.interactive : '', className]
    .filter(Boolean)
    .join(' ');
  const dataset = { 'data-tilt': tilt, 'data-shape': shape, 'data-padding': padding };

  const body = (
    <div className={styles.frame}>
      <div className={styles.inner}>
        {children}
        {isInteractive && cue && <Cue />}
      </div>
    </div>
  );

  if (href !== undefined) {
    return (
      <Link
        href={href}
        className={classes}
        prefetch={prefetch}
        target={target}
        rel={rel}
        {...dataset}
        {...(rest as HTMLAttributes<HTMLAnchorElement>)}
      >
        {body}
      </Link>
    );
  }

  return (
    <Tag className={classes} {...dataset} {...rest}>
      {body}
    </Tag>
  );
}
