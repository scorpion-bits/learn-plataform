import Link from 'next/link';
import type { ComponentPropsWithoutRef } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './TextLink.module.css';

export interface TextLinkProps extends Omit<ComponentPropsWithoutRef<'a'>, 'href'> {
  href: string;
}

/** Link de prosa: sublinhado (o reset remove). Internos usam next/link; externos abrem com rel seguro. */
export function TextLink({ href, className, children, ...rest }: TextLinkProps) {
  const internal = href.startsWith('/') || href.startsWith('#');
  if (internal) {
    return (
      <Link href={href} className={cx(styles.link, className)} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={cx(styles.link, className)} rel="noopener noreferrer" {...rest}>
      {children}
    </a>
  );
}
