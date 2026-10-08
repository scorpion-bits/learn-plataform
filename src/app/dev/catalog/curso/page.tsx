import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { IsoBackdrop } from '@/components/brand';
import { PublicShell } from '@/components/layout';
import { CourseSkeleton } from '@/features/catalog/components/CourseSkeleton';
import { CourseView } from '@/features/catalog/components/CourseView';
import { MOCK_COURSES, MOCK_OUTLINE } from '@/features/catalog/mock';

export const metadata: Metadata = {
  title: 'Vitrine · página do curso',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Vitrine temporária (STUDENT-003). `?state=anon|buy|owned|loading`. */
export default async function CourseShowcase({ searchParams }: { searchParams: SearchParams }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { state } = await searchParams;
  const signedIn = state === 'buy' || state === 'owned';

  return (
    <>
      <IsoBackdrop variant="full" />
      <PublicShell
        user={signedIn ? { name: 'aluno@exemplo.com', email: 'aluno@exemplo.com' } : null}
      >
        {state === 'loading' ? (
          <CourseSkeleton />
        ) : (
          <CourseView
            course={MOCK_COURSES[0]!}
            outline={MOCK_OUTLINE}
            signedIn={signedIn}
            hasAccess={state === 'owned'}
          />
        )}
      </PublicShell>
    </>
  );
}
