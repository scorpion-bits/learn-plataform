import type { ReactNode } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  /** Slot para ilustração (ex.: IsoCube vazio). Decorativo. */
  illustration?: ReactNode;
  /** Ação principal (ex.: <Button>). */
  action?: ReactNode;
  headingLevel?: 2 | 3 | 4;
  className?: string;
}

export function EmptyState({
  title,
  description,
  illustration,
  action,
  headingLevel = 2,
  className,
}: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div className={cx(styles.empty, className)}>
      {illustration ? (
        <div className={styles.illustration} aria-hidden="true">
          {illustration}
        </div>
      ) : null}
      <Heading className={styles.title}>{title}</Heading>
      {description ? <p className={styles.description}>{description}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
