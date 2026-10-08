import Link from 'next/link';

import { PERIODS } from '../schemas';
import type { Period } from '../schemas';
import styles from './PeriodSelector.module.css';

/** Chips de período: links reais (`?periodo=`), funcionam sem JS. */
export function PeriodSelector({
  current,
  basePath = '/admin',
}: {
  current: Period;
  basePath?: string;
}) {
  return (
    <nav aria-label="Período" className={styles.nav}>
      <ul className={styles.list}>
        {PERIODS.map((p) => (
          <li key={p}>
            <Link
              href={`${basePath}?periodo=${p}`}
              className={styles.chip}
              aria-current={p === current ? 'page' : undefined}
              scroll={false}
            >
              {p} dias
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
