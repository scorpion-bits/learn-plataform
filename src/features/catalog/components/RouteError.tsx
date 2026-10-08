'use client';

import { useEffect } from 'react';

import { ErrorState } from '@/components/ui';

import styles from './RouteError.module.css';

/** Corpo comum dos `error.tsx` das rotas de catálogo (não expõe detalhes do erro). */
export function RouteError({
  error,
  reset,
  title,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className={styles.wrap}>
      <ErrorState
        title={title}
        message="Não foi possível carregar agora. Verifique sua conexão e tente novamente."
        onRetry={reset}
      />
    </div>
  );
}
