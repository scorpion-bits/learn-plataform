import { Skeleton } from '@/components/ui';

import styles from './PlayerView.module.css';

/** Mesma geometria do player: topo, vídeo 16:9 + texto e barra inferior. */
export function PlayerSkeleton() {
  return (
    <div className={styles.skeleton} aria-busy="true" role="status">
      <span className={styles.sr}>Carregando aula…</span>
      <div className={styles.skeletonTop}>
        <Skeleton variant="circle" width={36} height={36} />
        <Skeleton variant="line" width="min(60%, 22rem)" />
      </div>
      <div className={styles.skeletonMain}>
        <Skeleton variant="line" width="9rem" />
        <Skeleton variant="line" width="min(100%, 24rem)" height="2rem" />
        <Skeleton variant="block" className={styles.skeletonVideo} />
        <Skeleton variant="line" />
        <Skeleton variant="line" width="80%" />
      </div>
      <div className={styles.skeletonActions}>
        <Skeleton variant="block" height={44} />
        <Skeleton variant="block" height={44} />
        <Skeleton variant="block" height={44} />
      </div>
    </div>
  );
}
