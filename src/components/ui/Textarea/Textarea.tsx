import type { ComponentPropsWithRef } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './Textarea.module.css';

export type TextareaProps = ComponentPropsWithRef<'textarea'>;

export function Textarea({ className, rows = 4, ...rest }: TextareaProps) {
  return <textarea rows={rows} className={cx(styles.textarea, className)} {...rest} />;
}
