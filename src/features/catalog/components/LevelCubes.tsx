import { IsoCube } from '@/components/brand';

import { LEVEL_CUBES, LEVEL_LABEL } from '../model';
import type { CourseLevel } from '../model';
import styles from './LevelCubes.module.css';

/** Nível em 1–3 cubos preenchidos + rótulo textual (a cor/forma nunca é a única pista). */
export function LevelCubes({ level }: { level: CourseLevel }) {
  const filled = LEVEL_CUBES[level];
  return (
    <span className={styles.root}>
      <span className={styles.cubes} aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <IsoCube key={n} size={14} state={n <= filled ? 'filled' : 'empty'} tone="cyan" />
        ))}
      </span>
      <span>
        <span className={styles.sr}>Nível: </span>
        {LEVEL_LABEL[level]}
      </span>
    </span>
  );
}
