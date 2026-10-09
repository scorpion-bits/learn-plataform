'use client';

import { useEffect } from 'react';

/**
 * Último recurso: falha no layout raiz. Substitui o `<html>` inteiro, então não pode depender
 * de tokens.css/fontes — usa só estilo inline mínimo e cores fixas da marca.
 */
export default function GlobalError({
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
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          padding: '1.5rem',
          background: '#05090f',
          color: '#eef5fb',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <main role="alert" style={{ maxWidth: '28rem' }}>
          <h1 style={{ fontSize: '1.5rem' }}>Algo deu errado</h1>
          <p style={{ lineHeight: 1.5 }}>
            Não foi possível carregar a plataforma agora. Tente novamente em instantes.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: '2.75rem',
              padding: '0 1.25rem',
              fontSize: '1rem',
              border: 0,
              borderRadius: '0.5rem',
              background: '#6ad8fe',
              color: '#05090f',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Tentar novamente
          </button>
        </main>
      </body>
    </html>
  );
}
