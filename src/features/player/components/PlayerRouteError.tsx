'use client';

import { useEffect } from 'react';

import { Button, ErrorState } from '@/components/ui';

import styles from './PlayerView.module.css';

/** Corpo do `error.tsx` do player: não expõe detalhes do erro e oferece retry + saída. */
export function PlayerRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className={styles.screen}>
      <div className={styles.screenBody}>
        <ErrorState
          headingLevel={1}
          title="Não foi possível abrir a aula"
          message="Verifique sua conexão e tente novamente. Seu progresso está salvo."
          onRetry={reset}
        />
        <Button variant="ghost" href="/minha-biblioteca">
          Voltar à biblioteca
        </Button>
      </div>
    </div>
  );
}
