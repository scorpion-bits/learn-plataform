import { DropdownMenu } from '@/components/ui';
import type { DropdownMenuItem } from '@/components/ui';

import { initials } from './types';
import type { ShellUser } from './types';
import styles from './UserMenu.module.css';

export interface UserMenuProps {
  user: ShellUser;
  isAdmin?: boolean;
  /** Itens extras antes de "Sair". */
  extraItems?: DropdownMenuItem[];
}

/** Menu do usuário (avatar com iniciais). "Sair" é um link provisório para /sair (AUTH-00x). */
export function UserMenu({ user, isAdmin, extraItems = [] }: UserMenuProps) {
  const items: DropdownMenuItem[] = [
    { label: 'Minha conta', href: '/conta' },
    ...(isAdmin ? [{ label: 'Painel admin', href: '/admin' }] : []),
    ...extraItems,
    { label: 'Sair', href: '/sair', tone: 'danger' as const },
  ];
  return (
    <DropdownMenu
      align="end"
      triggerLabel={`Menu de ${user.name}`}
      className={styles.menu}
      trigger={
        <>
          <span className={styles.avatar} aria-hidden="true">
            {initials(user.name)}
          </span>
          <span className={styles.name}>{user.name.split(' ')[0]}</span>
        </>
      }
      items={items}
    />
  );
}
