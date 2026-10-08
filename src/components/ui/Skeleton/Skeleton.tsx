import type { CSSProperties } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './Skeleton.module.css';

export interface SkeletonProps {
  variant?: 'block' | 'line' | 'circle';
  /** CSS length (ex.: "100%", "12rem") ou número em px. */
  width?: string | number;
  height?: string | number;
  className?: string;
}

/** Placeholder de carregamento. Decorativo: o contêiner deve expor aria-busy / texto de status. */
export function Skeleton({ variant = 'block', width, height, className }: SkeletonProps) {
  const style: CSSProperties = { width, height };
  return (
    <span
      aria-hidden="true"
      className={cx(styles.skeleton, styles[variant], className)}
      style={style}
    />
  );
}
