import type { ComponentPropsWithRef } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './Select.module.css';

export type SelectProps = ComponentPropsWithRef<'select'>;

/** <select> nativo estilizado (melhor teclado e seletor nativo no celular). */
export function Select({ className, children, ...rest }: SelectProps) {
  return (
    <select className={cx(styles.select, className)} {...rest}>
      {children}
    </select>
  );
}
