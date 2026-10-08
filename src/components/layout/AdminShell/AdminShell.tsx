'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';

import { Logo } from '@/components/brand';
import { Drawer, IconButton } from '@/components/ui';

import { DashboardIcon, CoursesIcon, MenuIcon, OrdersIcon, UsersIcon } from '../icons';
import { SidebarLink } from '../NavLinks';
import { SkipLink } from '../SkipLink/SkipLink';
import { MAIN_ID } from '../types';
import type { ShellUser } from '../types';
import { UserMenu } from '../UserMenu';

import styles from './AdminShell.module.css';

export interface Breadcrumb {
  label: string;
  /** Sem `href` = página atual (último item). */
  href?: string;
}

export interface AdminShellProps {
  user: ShellUser | null;
  /** Se omitido, deriva do pathname (/admin/cursos => Admin / Cursos). */
  breadcrumbs?: Breadcrumb[];
  children: ReactNode;
}

const SEGMENT_LABELS: Record<string, string> = {
  admin: 'Admin',
  cursos: 'Cursos',
  alunos: 'Alunos',
  pedidos: 'Pedidos',
  novo: 'Novo',
};

function crumbsFromPath(pathname: string | null): Breadcrumb[] {
  const segments = (pathname ?? '').split('/').filter(Boolean);
  if (segments.length <= 1) return [{ label: 'Dashboard' }];
  return segments.map((segment, index) => ({
    label: SEGMENT_LABELS[segment] ?? decodeURIComponent(segment),
    href: `/${segments.slice(0, index + 1).join('/')}`,
  }));
}

function AdminNav() {
  return (
    <nav aria-label="Administração" className={styles.nav}>
      <SidebarLink labelClassName={styles.label} href="/admin" exact icon={<DashboardIcon />}>
        Dashboard
      </SidebarLink>
      <SidebarLink labelClassName={styles.label} href="/admin/cursos" icon={<CoursesIcon />}>
        Cursos
      </SidebarLink>
      <SidebarLink labelClassName={styles.label} href="/admin/alunos" icon={<UsersIcon />}>
        Alunos
      </SidebarLink>
      <SidebarLink labelClassName={styles.label} href="/admin/pedidos" icon={<OrdersIcon />}>
        Pedidos
      </SidebarLink>
    </nav>
  );
}

/**
 * Admin: sidebar à esquerda (>= 1100px com rótulos; 720–1099px só ícones;
 * < 720px vira Drawer aberto pelo botão do header) + header com breadcrumbs
 * e menu do usuário. Denso, mas com alvos >= 44px.
 */
export function AdminShell({ user, breadcrumbs, children }: AdminShellProps) {
  const pathname = usePathname();
  const crumbs = breadcrumbs ?? crumbsFromPath(pathname);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const onDrawerClick = (event: MouseEvent) => {
    if ((event.target as HTMLElement).closest('a[href]')) setDrawerOpen(false);
  };

  return (
    <div className={styles.shell}>
      <SkipLink />
      <aside className={styles.sidebar} aria-label="Barra lateral">
        <div className={styles.logo}>
          <Logo href="/admin" showWordmark={false} />
          <span className={styles.logoText}>Admin</span>
        </div>
        <AdminNav />
      </aside>

      <div className={styles.column}>
        <header className={styles.header}>
          <IconButton
            className={styles.menuButton}
            aria-label="Abrir menu"
            aria-haspopup="dialog"
            icon={<MenuIcon />}
            onClick={() => setDrawerOpen(true)}
          />
          {crumbs.length > 0 && (
            <nav aria-label="Você está em" className={styles.crumbs}>
              <ol>
                {crumbs.map((crumb, index) => {
                  const last = index === crumbs.length - 1;
                  return (
                    <li key={`${crumb.label}-${index}`}>
                      {crumb.href && !last ? (
                        <Link href={crumb.href}>{crumb.label}</Link>
                      ) : (
                        <span aria-current={last ? 'page' : undefined}>{crumb.label}</span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          )}
          <div className={styles.user}>{user && <UserMenu user={user} isAdmin />}</div>
        </header>
        <main id={MAIN_ID} tabIndex={-1} className={styles.main}>
          {children}
        </main>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Menu do admin">
        <div onClick={onDrawerClick}>
          <AdminNav />
        </div>
      </Drawer>
    </div>
  );
}
