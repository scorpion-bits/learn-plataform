import type { Metadata } from 'next';

import { IsoBackdrop, Logo } from '@/components/brand';
import { Button } from '@/components/ui';

import styles from './not-found.module.css';

export const metadata: Metadata = {
  title: 'Página não encontrada',
  robots: { index: false, follow: false },
};

/** 404 de marca. Estático e sem dados do usuário (serve para qualquer rota). */
export default function NotFound() {
  return (
    <>
      <IsoBackdrop variant="full" />
      <div className={styles.shell}>
        <header className={styles.header}>
          <Logo />
        </header>
        <main id="conteudo" tabIndex={-1} className={styles.main}>
          <div className={styles.card}>
            <p className={styles.code} aria-hidden="true">
              404
            </p>
            <h1 className={styles.title}>Página não encontrada</h1>
            <p className={styles.lead}>
              O endereço que você abriu não existe ou foi movido. Volte ao início ou veja os cursos
              disponíveis.
            </p>
            <div className={styles.actions}>
              <Button href="/">Ir para o início</Button>
              <Button href="/cursos" variant="secondary">
                Ver cursos
              </Button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
