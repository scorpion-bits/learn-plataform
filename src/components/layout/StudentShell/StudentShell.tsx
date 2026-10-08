import type { ReactNode } from 'react';

import { Dock, Logo } from '@/components/brand';

import { CoursesIcon, HomeIcon, LibraryIcon, UserIcon } from '../icons';
import { ActiveDockLink, TabBarLink } from '../NavLinks';
import { SkipLink } from '../SkipLink/SkipLink';
import { MAIN_ID } from '../types';
import type { ShellUser } from '../types';
import { UserMenu } from '../UserMenu';

import styles from './StudentShell.module.css';

export interface StudentShellProps {
  user: ShellUser | null;
  /** Mostra "Painel admin" no menu (apenas UX; a autorização mora no banco). */
  isAdmin?: boolean;
  children: ReactNode;
}

/**
 * Área do aluno. Desktop: Dock (Início / Minha biblioteca / Cursos) + menu do
 * usuário. Mobile: Dock enxuto (marca + avatar) e tab bar fixa embaixo
 * (ADR-019), com safe-area.
 */
export function StudentShell({ user, isAdmin, children }: StudentShellProps) {
  return (
    <div className={styles.shell}>
      <SkipLink />
      <Dock
        brand={<Logo href="/inicio" />}
        navLabel="Área do aluno"
        hideMenuOnMobile
        nav={
          <>
            <ActiveDockLink href="/inicio">Início</ActiveDockLink>
            <ActiveDockLink href="/minha-biblioteca">Minha biblioteca</ActiveDockLink>
            <ActiveDockLink href="/cursos">Cursos</ActiveDockLink>
          </>
        }
        trailing={user ? <UserMenu user={user} isAdmin={isAdmin} /> : undefined}
      />
      <main id={MAIN_ID} tabIndex={-1} className={styles.main}>
        {children}
      </main>
      <nav className={styles.tabbar} aria-label="Navegação do aplicativo">
        <TabBarLink href="/inicio" icon={<HomeIcon />}>
          Início
        </TabBarLink>
        <TabBarLink href="/minha-biblioteca" icon={<LibraryIcon />}>
          Biblioteca
        </TabBarLink>
        <TabBarLink href="/cursos" icon={<CoursesIcon />}>
          Cursos
        </TabBarLink>
        <TabBarLink href="/conta" icon={<UserIcon />}>
          Conta
        </TabBarLink>
      </nav>
    </div>
  );
}
