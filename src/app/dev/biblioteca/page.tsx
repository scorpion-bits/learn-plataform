import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { StudentShell } from '@/components/layout';
import { LibraryView } from '@/features/library/components/LibraryView';
import { LibrarySkeleton } from '@/features/library/components/LibrarySkeleton';
import { DEFAULT_TAB, parseTab } from '@/features/library/model';
import type { LibraryTab } from '@/features/library/model';
import { MOCK_LIBRARY } from '@/features/library/mock';

export const metadata: Metadata = {
  title: 'Vitrine · biblioteca',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const tabHref = (tab: LibraryTab) =>
  tab === DEFAULT_TAB ? '/dev/biblioteca' : `/dev/biblioteca?aba=${tab}`;

/** Vitrine de `/minha-biblioteca` (STUDENT-004); 404 em produção. `?aba=` · `?state=empty|loading`. */
export default async function LibraryShowcase({ searchParams }: { searchParams: SearchParams }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const params = await searchParams;
  const state = params.state;
  return (
    <StudentShell user={{ name: 'Ana Souza', email: 'ana@example.com' }}>
      {state === 'loading' ? (
        <LibrarySkeleton />
      ) : (
        <LibraryView
          courses={state === 'empty' ? [] : MOCK_LIBRARY}
          tab={parseTab(params.aba)}
          tabHref={tabHref}
          catalogHref="/dev/catalog"
        />
      )}
    </StudentShell>
  );
}
