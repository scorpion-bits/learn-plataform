import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './Checkbox.module.css';

export interface CheckboxProps extends Omit<ComponentPropsWithRef<'input'>, 'type' | 'children'> {
  label: ReactNode;
  hint?: ReactNode;
}

/** Caixa nativa estilizada; a linha inteira (>= 44px) é o alvo de toque. */
export function Checkbox({ label, hint, className, id, ...rest }: CheckboxProps) {
  return (
    <label className={cx(styles.row, className)}>
      <input type="checkbox" id={id} className={styles.box} {...rest} />
      <span className={styles.text}>
        {label}
        {hint ? <small className={styles.hint}>{hint}</small> : null}
      </span>
    </label>
  );
}
