import type { ComponentPropsWithRef } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './Input.module.css';

export type InputProps = ComponentPropsWithRef<'input'>;

/** Use dentro de <Field>. Em celular: defina inputMode / autoComplete / enterKeyHint adequados. */
export function Input({ className, type = 'text', ...rest }: InputProps) {
  return <input type={type} className={cx(styles.input, className)} {...rest} />;
}
