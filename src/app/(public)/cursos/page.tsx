import type { Metadata } from 'next';

import { CatalogView } from '@/features/catalog/components/CatalogView';
import { withCover } from '@/features/catalog/presenters';
import { getCatalog } from '@/features/catalog/queries';
import { parseCatalogFilters } from '@/features/catalog/schemas';

export const metadata: Metadata = {
  title: 'Cursos',
  description: 'Catálogo de cursos de game dev da Scorpion Bits: filtre por categoria e nível.',
  alternates: { canonical: '/cursos' },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseCatalogFilters(await searchParams);
  const { courses, categories, ownedCourseIds } = await getCatalog();

  const visible = courses.filter(
    (c) =>
      (!filters.categoria || c.categorySlug === filters.categoria) &&
      (!filters.nivel || c.level === filters.nivel),
  );

  return (
    <CatalogView
      courses={visible.map(withCover)}
      categories={categories}
      filters={filters}
      ownedCourseIds={ownedCourseIds}
    />
  );
}
