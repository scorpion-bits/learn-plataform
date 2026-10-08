import type { ComponentPropsWithoutRef } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './Badge.module.css';

export type BadgeTone = 'neutral' | 'cyan' | 'mint' | 'amber' | 'coral' | 'violet';

export interface BadgeProps extends ComponentPropsWithoutRef<'span'> {
  tone?: BadgeTone;
}

/** Selo de status/origem: "Comprado", "Atribuído", "Rascunho", "Publicado". O texto carrega o significado; a cor só reforça. */
export function Badge({ tone = 'neutral', className, children, ...rest }: BadgeProps) {
  return (
    <span className={cx(styles.badge, styles[tone], className)} {...rest}>
      {children}
    </span>
  );
}
