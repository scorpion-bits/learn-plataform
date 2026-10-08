import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './Switch.module.css';

export interface SwitchProps extends Omit<
  ComponentPropsWithRef<'input'>,
  'type' | 'role' | 'children'
> {
  label: ReactNode;
  hint?: ReactNode;
}

/** <input type="checkbox" role="switch">: espaço/clique alternam; estado em aria-checked implícito. */
export function Switch({ label, hint, className, ...rest }: SwitchProps) {
  return (
    <label className={cx(styles.row, className)}>
      <input type="checkbox" role="switch" className={styles.input} {...rest} />
      <span className={styles.track} aria-hidden="true" />
      <span className={styles.text}>
        {label}
        {hint ? <small className={styles.hint}>{hint}</small> : null}
      </span>
    </label>
  );
}
