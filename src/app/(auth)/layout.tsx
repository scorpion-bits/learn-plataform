import type { ReactNode } from 'react';

import { IsoBackdrop, Logo } from '@/components/brand';
import { SkipLink } from '@/components/layout';
import styles from './layout.module.css';

/** Telas de entrada (/entrar, /cadastro…): sem navegação, marca no topo, conteúdo centrado. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <IsoBackdrop variant="full" />
      <SkipLink />
      <div className={styles.shell}>
        <header className={styles.header}>
          <Logo />
        </header>
        <main id="conteudo" tabIndex={-1} className={styles.main}>
          {children}
        </main>
      </div>
    </>
  );
}
