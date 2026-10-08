import type { ReactNode } from 'react';

import { ChamferCard } from '@/components/brand';

import styles from './auth-form.module.css';

export function AuthCard({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: ReactNode;
  children: ReactNode;
}) {
  return (
    <ChamferCard as="section" className={styles.card} aria-labelledby="auth-title">
      <h1 id="auth-title" className={styles.title}>
        {title}
      </h1>
      {lead ? <p className={styles.lead}>{lead}</p> : null}
      {children}
    </ChamferCard>
  );
}
