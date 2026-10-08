import Link from 'next/link';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cx } from '@/lib/utils/cx';
import { Spinner } from '../Spinner/Spinner';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Em andamento: aria-busy, desabilitado (sem clique duplo), spinner + label mantido. */
  pending?: boolean;
  fullWidth?: boolean;
  /** Ícone decorativo antes do label. */
  icon?: ReactNode;
  children?: ReactNode;
}

type ButtonAsButton = CommonProps &
  Omit<ComponentPropsWithRef<'button'>, keyof CommonProps> & { href?: undefined };
type ButtonAsLink = CommonProps &
  Omit<ComponentPropsWithRef<typeof Link>, keyof CommonProps | 'href'> & { href: string };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button(props: ButtonProps) {
  const {
    variant = 'primary',
    size = 'md',
    pending = false,
    fullWidth = false,
    icon,
    children,
    className,
    ...rest
  } = props;
  const classes = cx(
    styles.button,
    styles[variant],
    styles[size],
    fullWidth && styles.full,
    pending && styles.pending,
    className,
  );
  const content = (
    <>
      {pending ? <Spinner size="sm" label={null} className={styles.spinner} /> : icon}
      <span className={styles.label}>{children}</span>
    </>
  );

  if (props.href !== undefined) {
    const { href, ...linkRest } = rest as Omit<ButtonAsLink, keyof CommonProps>;
    if (pending) {
      // Link "desligado": sem href não há navegação nem clique duplo.
      return (
        <span className={classes} role="link" aria-disabled="true" aria-busy="true">
          {content}
        </span>
      );
    }
    return (
      <Link href={href} className={classes} {...linkRest}>
        {content}
      </Link>
    );
  }

  const {
    type = 'button',
    disabled,
    ...buttonRest
  } = rest as Omit<ButtonAsButton, keyof CommonProps>;
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...buttonRest}
    >
      {content}
    </button>
  );
}
