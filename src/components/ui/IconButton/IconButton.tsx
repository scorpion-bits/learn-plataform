import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './IconButton.module.css';

export interface IconButtonProps extends Omit<
  ComponentPropsWithRef<'button'>,
  'aria-label' | 'children'
> {
  /** Obrigatório: botão só com ícone precisa de nome acessível. */
  'aria-label': string;
  /** Ícone (SVG decorativo; recebe aria-hidden). */
  icon: ReactNode;
  variant?: 'ghost' | 'secondary' | 'primary';
  size?: 'sm' | 'md' | 'lg';
}

export function IconButton({
  icon,
  variant = 'ghost',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cx(styles.iconButton, styles[variant], styles[size], className)}
      {...rest}
    >
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
    </button>
  );
}
