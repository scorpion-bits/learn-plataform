'use client';

import type { ReactNode } from 'react';
import { cx } from '@/lib/utils/cx';
import { Button } from '../Button/Button';
import styles from './ErrorState.module.css';

export interface ErrorStateProps {
  title?: ReactNode;
  message: ReactNode;
  /** Se ausente, o botão "Tentar novamente" não é exibido. */
  onRetry?: () => void;
  retryLabel?: string;
  retryPending?: boolean;
  /** Nível do título; use 1 quando o estado de erro substitui a página inteira (error.tsx). */
  headingLevel?: 1 | 2 | 3;
  className?: string;
}

export function ErrorState({
  title = 'Algo deu errado',
  message,
  onRetry,
  retryLabel = 'Tentar novamente',
  retryPending,
  headingLevel = 2,
  className,
}: ErrorStateProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div className={cx(styles.error, className)} role="alert">
      <Heading className={styles.title}>{title}</Heading>
      <p className={styles.message}>{message}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry} pending={retryPending}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
