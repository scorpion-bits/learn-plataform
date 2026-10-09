import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ErrorState, Skeleton } from '@/components/ui';
import { CourseStudentsList } from '@/features/course-students/components/CourseStudentsList';
import { CourseStudentsSearch } from '@/features/course-students/components/CourseStudentsSearch';
import type { CourseStudent } from '@/features/course-students/model';
import { parseListParams } from '@/features/students/schemas';

export const metadata: Metadata = {
  title: 'Vitrine · alunos do curso',
  robots: { index: false, follow: false },
};

const NAMES = ['Ana Souza', 'Bruno Lima', 'Carla Dias', 'Diego Rocha', 'Elisa Prado', 'Fábio Reis'];
const ALL: CourseStudent[] = Array.from({ length: 47 }, (_, i) => {
  const completedCount = (i * 7) % 41;
  return {
    enrollmentId: `e${i}`,
    userId: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    email: `${NAMES[i % 6]!.split(' ')[0]!.toLowerCase()}${i}@exemplo.com`,
    fullName: `${NAMES[i % 6]} ${i + 1}`,
    source: i % 3 === 0 ? 'admin_grant' : 'purchase',
    grantedAt: new Date(Date.UTC(2026, 8, 30 - (i % 28))).toISOString(),
    revokedAt: i % 9 === 4 ? '2026-10-01T12:00:00Z' : null,
    lessonCount: 40,
    completedCount,
    progressPercent: Math.round((completedCount / 40) * 100),
  };
});

type SP = Promise<Record<string, string | string[] | undefined>>;

/** Vitrine com dados fictícios. `?state=loading|empty|error`, `?q=`, `?pagina=`. */
export default async function AdminCourseStudentsShowcase({ searchParams }: { searchParams: SP }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const raw = await searchParams;
  const { q, page } = parseListParams(raw);
  const base = '/dev/admin-course-students';
  const state = raw.state;

  let body;
  if (state === 'loading') {
    body = (
      <div role="status" aria-label="Carregando alunos" style={{ display: 'grid', gap: '1rem' }}>
        <Skeleton height="3.5rem" />
        <Skeleton height="3.5rem" />
        <Skeleton height="3.5rem" />
      </div>
    );
  } else if (state === 'error') {
    body = (
      <ErrorState title="Não foi possível carregar os alunos" message="Recarregue a página." />
    );
  } else {
    const filtered =
      state === 'empty'
        ? []
        : ALL.filter((s) => `${s.fullName} ${s.email}`.toLowerCase().includes(q.toLowerCase()));
    body = (
      <>
        <CourseStudentsSearch basePath={base} initial={q} />
        <CourseStudentsList
          rows={filtered.slice((page - 1) * 20, page * 20)}
          total={filtered.length}
          page={page}
          q={q}
          basePath={base}
        />
      </>
    );
  }

  return (
    <main
      style={{
        maxWidth: '72rem',
        margin: '0 auto',
        padding: 'var(--space-5) var(--space-4)',
        display: 'grid',
        gap: 'var(--space-4)',
      }}
    >
      <h1 style={{ fontSize: 'var(--s-2)' }}>Godot do zero · Alunos</h1>
      {body}
    </main>
  );
}
