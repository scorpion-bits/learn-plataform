import Link from 'next/link';

import { LEVELS, LEVEL_LABEL } from '../model';
import type { CategoryOption } from '../model';
import type { CatalogFilters as Filters } from '../schemas';
import styles from './CatalogFilters.module.css';

export function catalogHref(filters: Filters): string {
  const qs = new URLSearchParams();
  if (filters.categoria) qs.set('categoria', filters.categoria);
  if (filters.nivel) qs.set('nivel', filters.nivel);
  const s = qs.toString();
  return s ? `/cursos?${s}` : '/cursos';
}

export interface CatalogFiltersProps {
  categories: CategoryOption[];
  filters: Filters;
  /** Base do link (a vitrine /dev usa outra). */
  hrefFor?: (filters: Filters) => string;
}

function Chip({ href, active, children }: { href: string; active: boolean; children: string }) {
  return (
    <li>
      <Link
        href={href}
        className={styles.chip}
        aria-current={active ? 'true' : undefined}
        scroll={false}
      >
        {children}
      </Link>
    </li>
  );
}

/** Chips de categoria e nível; o estado vive na URL (links, funcionam sem JS). */
export function CatalogFilters({
  categories,
  filters,
  hrefFor = catalogHref,
}: CatalogFiltersProps) {
  return (
    <nav className={styles.root} aria-label="Filtrar cursos">
      {categories.length > 0 && (
        <section className={styles.group} aria-labelledby="filtro-categoria">
          <h2 id="filtro-categoria" className={styles.label}>
            Categoria
          </h2>
          <ul className={styles.list}>
            <Chip href={hrefFor({ ...filters, categoria: undefined })} active={!filters.categoria}>
              Todas
            </Chip>
            {categories.map((c) => (
              <Chip
                key={c.slug}
                href={hrefFor({ ...filters, categoria: c.slug })}
                active={filters.categoria === c.slug}
              >
                {c.name}
              </Chip>
            ))}
          </ul>
        </section>
      )}
      <section className={styles.group} aria-labelledby="filtro-nivel">
        <h2 id="filtro-nivel" className={styles.label}>
          Nível
        </h2>
        <ul className={styles.list}>
          <Chip href={hrefFor({ ...filters, nivel: undefined })} active={!filters.nivel}>
            Todos
          </Chip>
          {LEVELS.map((level) => (
            <Chip
              key={level}
              href={hrefFor({ ...filters, nivel: level })}
              active={filters.nivel === level}
            >
              {LEVEL_LABEL[level]}
            </Chip>
          ))}
        </ul>
      </section>
    </nav>
  );
}
