import styles from './IsoBackdrop.module.css';

export type IsoBackdropVariant = 'full' | 'subtle';

export interface IsoBackdropProps {
  /**
   * `full`: público/aluno (expressivo). `subtle`: admin e telas densas
   * (malha e luz bem mais discretas).
   */
  variant?: IsoBackdropVariant;
}

/**
 * Malha isométrica em duas camadas (portada do site da marca): losangos
 * 30°/-30°; a camada de trás é menor e mais apagada, a da frente é maior e
 * mais acesa. Profundidade por escala e opacidade — nunca por blur.
 *
 * Server Component estático (sem JS, sem animação, sem parallax). Fica fixo
 * atrás de todo o conteúdo (z-index token --z-backdrop), decorativo
 * (`aria-hidden`) e sem eventos de ponteiro. No modo leve (`[data-lite]`) a
 * camada de trás some.
 */
export function IsoBackdrop({ variant = 'full' }: IsoBackdropProps) {
  const className = variant === 'subtle' ? `${styles.backdrop} ${styles.subtle}` : styles.backdrop;

  return (
    <div className={className} data-variant={variant} aria-hidden="true">
      <span className={styles.glow} />
      <span className={`${styles.grid} ${styles.far}`} />
      <span className={`${styles.grid} ${styles.near}`} />
    </div>
  );
}
