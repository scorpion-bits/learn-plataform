'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { DockLink } from '@/components/brand';
import { cx } from '@/lib/utils/cx';

import styles from './NavLinks.module.css';

/** `exact` => só a rota idêntica; senão também as filhas (/admin/cursos/1 ativa /admin/cursos). */
function useIsActive(href: string, exact?: boolean): boolean {
  const pathname = usePathname();
  if (!pathname) return false;
  if (pathname === href) return true;
  return !exact && href !== '/' && pathname.startsWith(`${href}/`);
}

interface BaseProps {
  href: string;
  exact?: boolean;
  children: ReactNode;
}

/** DockLink com `aria-current` calculado pelo pathname. */
export function ActiveDockLink({ href, exact, children }: BaseProps) {
  const active = useIsActive(href, exact);
  return (
    <DockLink href={href} active={active}>
      {children}
    </DockLink>
  );
}

/** Item da tab bar do aluno (ícone + rótulo, alvo >= 44px). */
export function TabBarLink({ href, exact, icon, children }: BaseProps & { icon: ReactNode }) {
  const active = useIsActive(href, exact);
  return (
    <Link
      href={href}
      className={styles.tab}
      aria-current={active ? 'page' : undefined}
      data-active={active ? 'true' : undefined}
    >
      <span className={styles.tabIcon}>{icon}</span>
      <span className={styles.tabLabel}>{children}</span>
    </Link>
  );
}

/** Item da sidebar do admin; `collapsed` (CSS) esconde o rótulo sem tirá-lo da árvore de acessibilidade. */
export function SidebarLink({
  href,
  exact,
  icon,
  children,
  className,
  labelClassName,
}: BaseProps & { icon: ReactNode; className?: string; labelClassName?: string }) {
  const active = useIsActive(href, exact);
  return (
    <Link
      href={href}
      className={cx(styles.side, className)}
      aria-current={active ? 'page' : undefined}
      data-active={active ? 'true' : undefined}
    >
      <span className={styles.sideIcon}>{icon}</span>
      <span className={cx(styles.sideLabel, labelClassName)}>{children}</span>
    </Link>
  );
}
