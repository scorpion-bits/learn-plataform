import Link from 'next/link';
import type { ComponentProps } from 'react';

import styles from './Dock.module.css';

export interface DockLinkProps extends ComponentProps<typeof Link> {
  /** Página atual: realce + `aria-current="page"`. */
  active?: boolean;
}

/** Link do Dock: alvo >= 44px, pílula de realce no item ativo. */
export function DockLink({ active, className, ...props }: DockLinkProps) {
  return (
    <Link
      {...props}
      className={[styles.link, className].filter(Boolean).join(' ')}
      aria-current={active ? 'page' : undefined}
      data-active={active ? 'true' : undefined}
    />
  );
}
