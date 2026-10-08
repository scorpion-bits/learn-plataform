import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { IsoBackdrop } from '@/components/brand';
import { PublicShell } from '@/components/layout';
import { CatalogView } from '@/features/catalog/components/CatalogView';
import { CatalogSkeleton } from '@/features/catalog/components/CatalogSkeleton';
import { MOCK_CATEGORIES, MOCK_COURSES } from '@/features/catalog/mock';
import { parseCatalogFilters } from '@/features/catalog/schemas';
import type { CatalogFilters } from '@/features/catalog/schemas';

export const metadata: Metadata = {
  title: 'Vitrine · catálogo',
  robots: { index: false, follow: false },
};

function hrefFor(filters: CatalogFilters): string {
  const qs = new URLSearchParams();
  if (filters.categoria) qs.set('categoria', filters.categoria);
  if (filters.nivel) qs.set('nivel', filters.nivel);
  const s = qs.toString();
  return s ? `/dev/catalog?${s}` : '/dev/catalog';
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Vitrine temporária (STUDENT-002) com dados fictícios. `?state=empty|loading|owned`. */
export default async function CatalogShowcase({ searchParams }: { searchParams: SearchParams }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const params = await searchParams;
  const filters = parseCatalogFilters(params);
  const state = params.state;

  const visible = MOCK_COURSES.filter(
    (c) =>
      (!filters.categoria || c.categorySlug === filters.categoria) &&
      (!filters.nivel || c.level === filters.nivel),
  );

  return (
    <>
      <IsoBackdrop variant="full" />
      <PublicShell
        user={state === 'owned' ? { name: 'aluno@exemplo.com', email: 'aluno@exemplo.com' } : null}
      >
        {state === 'loading' ? (
          <CatalogSkeleton />
        ) : (
          <CatalogView
            courses={state === 'empty' ? [] : visible}
            categories={MOCK_CATEGORIES}
            filters={filters}
            ownedCourseIds={state === 'owned' ? ['1', '3'] : []}
            hrefFor={hrefFor}
            clearHref="/dev/catalog"
          />
        )}
      </PublicShell>
    </>
  );
}
