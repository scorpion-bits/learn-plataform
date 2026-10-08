import Link from 'next/link';
import { cx } from '@/lib/utils/cx';
import styles from './Pagination.module.css';

export interface PaginationProps {
  page: number;
  pageCount: number;
  /** Gera a URL de uma página (ex.: `(p) => `?pagina=${p}``). */
  buildHref: (page: number) => string;
  label?: string;
  className?: string;
}

function pageItems(page: number, count: number): Array<number | 'gap-start' | 'gap-end'> {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const items: Array<number | 'gap-start' | 'gap-end'> = [1];
  const from = Math.max(2, page - 1);
  const to = Math.min(count - 1, page + 1);
  if (from > 2) items.push('gap-start');
  for (let p = from; p <= to; p++) items.push(p);
  if (to < count - 1) items.push('gap-end');
  items.push(count);
  return items;
}

export function Pagination({
  page,
  pageCount,
  buildHref,
  label = 'Paginação',
  className,
}: PaginationProps) {
  if (pageCount <= 1) return null;
  const prev = page > 1 ? page - 1 : null;
  const next = page < pageCount ? page + 1 : null;

  return (
    <nav aria-label={label} className={cx(styles.nav, className)}>
      <ul className={styles.list}>
        <li>
          {prev ? (
            <Link href={buildHref(prev)} className={styles.item} rel="prev">
              Anterior
            </Link>
          ) : (
            <span className={cx(styles.item, styles.disabled)} aria-disabled="true">
              Anterior
            </span>
          )}
        </li>
        {pageItems(page, pageCount).map((item) =>
          typeof item === 'string' ? (
            <li key={item} className={styles.gap} aria-hidden="true">
              …
            </li>
          ) : (
            <li key={item} className={styles.number}>
              <Link
                href={buildHref(item)}
                className={cx(styles.item, item === page && styles.current)}
                aria-current={item === page ? 'page' : undefined}
                aria-label={`Página ${item}`}
              >
                {item}
              </Link>
            </li>
          ),
        )}
        <li>
          {next ? (
            <Link href={buildHref(next)} className={styles.item} rel="next">
              Próxima
            </Link>
          ) : (
            <span className={cx(styles.item, styles.disabled)} aria-disabled="true">
              Próxima
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
