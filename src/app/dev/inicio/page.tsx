import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { StudentShell } from '@/components/layout';
import { InicioView } from '@/features/library/components/InicioView';
import { pickContinueCourse } from '@/features/library/model';
import { MOCK_LESSON_TITLE, MOCK_LIBRARY } from '@/features/library/mock';

export const metadata: Metadata = {
  title: 'Vitrine · início',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Vitrine do `/inicio` (STUDENT-004) com dados fictícios; 404 em produção. `?state=empty`. */
export default async function InicioShowcase({ searchParams }: { searchParams: SearchParams }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { state } = await searchParams;
  const courses = state === 'empty' ? [] : MOCK_LIBRARY;
  const course = pickContinueCourse(courses);
  return (
    <StudentShell user={{ name: 'Ana Souza', email: 'ana@example.com' }}>
      <InicioView
        name="Ana"
        course={course}
        lessonTitle={course ? MOCK_LESSON_TITLE : null}
        libraryHref="/dev/biblioteca"
        catalogHref="/dev/catalog"
      />
    </StudentShell>
  );
}
