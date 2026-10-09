import type { Metadata } from 'next';

import { LibraryView } from '@/features/library/components/LibraryView';
import { DEFAULT_TAB, parseTab } from '@/features/library/model';
import type { LibraryTab } from '@/features/library/model';
import { getLibrary } from '@/features/library/queries';
import { requireUser } from '@/lib/auth/dal';

export const metadata: Metadata = { title: 'Minha biblioteca' };
export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const tabHref = (tab: LibraryTab) =>
  tab === DEFAULT_TAB ? '/minha-biblioteca' : `/minha-biblioteca?aba=${tab}`;

export default async function LibraryPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser();
  const [{ aba }, courses] = await Promise.all([searchParams, getLibrary()]);
  return <LibraryView courses={courses} tab={parseTab(aba)} tabHref={tabHref} />;
}
