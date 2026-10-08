import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PublicShell } from '@/components/layout';
import { MOCK_COURSES } from '@/features/catalog/mock';

import { LandingView } from '../../(public)/_landing/LandingView';

export const metadata: Metadata = {
  title: 'Vitrine · landing',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Vitrine temporária (STUDENT-001) com cursos fictícios. `?state=empty|owned`. */
export default async function LandingShowcase({ searchParams }: { searchParams: SearchParams }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { state } = await searchParams;
  const user = state === 'owned' ? { name: 'aluno@exemplo.com', email: 'aluno@exemplo.com' } : null;

  return (
    <PublicShell user={user}>
      <LandingView
        signedIn={state === 'owned'}
        courses={state === 'empty' ? [] : MOCK_COURSES.slice(0, 3)}
      />
    </PublicShell>
  );
}
