'use client';

import { useRef } from 'react';

import { DropdownMenu } from '@/components/ui';
import type { DropdownMenuItem } from '@/components/ui';
import { signOut } from '@/features/auth/actions';

import { initials } from './types';
import type { ShellUser } from './types';
import styles from './UserMenu.module.css';

export interface UserMenuProps {
  user: ShellUser;
  isAdmin?: boolean;
  /** Itens extras antes de "Sair". */
  extraItems?: DropdownMenuItem[];
}

/**
 * Menu do usuário (avatar com iniciais). "Sair" envia um <form> POST (Server
 * Action `signOut`): logout nunca é um GET navegável.
 */
export function UserMenu({ user, isAdmin, extraItems = [] }: UserMenuProps) {
  const signOutForm = useRef<HTMLFormElement>(null);
  const items: DropdownMenuItem[] = [
    { label: 'Minha conta', href: '/conta' },
    ...(isAdmin ? [{ label: 'Painel admin', href: '/admin' }] : []),
    ...extraItems,
    {
      label: 'Sair',
      tone: 'danger' as const,
      onSelect: () => signOutForm.current?.requestSubmit(),
    },
  ];
  return (
    <>
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
      <form ref={signOutForm} action={signOut} hidden />
    </>
  );
}
