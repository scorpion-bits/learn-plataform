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
  className?: string;
}

export function ErrorState({
  title = 'Algo deu errado',
  message,
  onRetry,
  retryLabel = 'Tentar novamente',
  retryPending,
  className,
}: ErrorStateProps) {
  return (
    <div className={cx(styles.error, className)} role="alert">
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.message}>{message}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry} pending={retryPending}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
