import { cx } from '@/lib/utils/cx';
import styles from './Spinner.module.css';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  /** Texto para leitores de tela. `null` => decorativo (ex.: dentro de um Button que já tem rótulo). */
  label?: string | null;
  className?: string;
}

/**
 * O estado é comunicado pelo texto, não pela rotação: com animações zeradas
 * (reduced-motion) o anel fica estático e o "Carregando" continua lá.
 */
export function Spinner({ size = 'md', label = 'Carregando', className }: SpinnerProps) {
  const decorative = label === null;
  return (
    <span
      className={cx(styles.spinner, styles[size], className)}
      role={decorative ? undefined : 'status'}
      aria-hidden={decorative ? true : undefined}
    >
      <span className={styles.ring} aria-hidden="true" />
      {decorative ? null : <span className="visually-hidden">{label}</span>}
    </span>
  );
}
