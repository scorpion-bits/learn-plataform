import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ErrorState, Skeleton } from '@/components/ui';
import { StudentProfileView } from '@/features/students/components/StudentProfileView';
import { StudentSearch } from '@/features/students/components/StudentSearch';
import { StudentsList } from '@/features/students/components/StudentsList';
import type { StudentListItem, StudentProfile } from '@/features/students/model';
import { parseListParams } from '@/features/students/schemas';

export const metadata: Metadata = {
  title: 'Vitrine · alunos admin',
  robots: { index: false, follow: false },
};

const NAMES = ['Ana Souza', 'Bruno Lima', 'Carla Dias', 'Diego Rocha', 'Elisa Prado', 'Fábio Reis'];
const ALL: StudentListItem[] = Array.from({ length: 47 }, (_, i) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  email: `${NAMES[i % 6]!.split(' ')[0]!.toLowerCase()}${i}@exemplo.com`,
  fullName: `${NAMES[i % 6]} ${i + 1}`,
  isAdmin: i === 0,
  createdAt: new Date(Date.UTC(2026, 8, 30 - (i % 28))).toISOString(),
  activeEnrollments: i % 4,
  totalSpentCents: (i % 4) * 19_700,
  lastOrderAt: null,
}));

const PROFILE: StudentProfile = {
  id: ALL[1]!.id,
  fullName: 'Bruno Lima',
  email: 'bruno1@exemplo.com',
  createdAt: '2026-08-12T12:00:00Z',
  enrollments: [
    {
      id: 'e1',
      courseId: 'c1',
      courseTitle: 'Godot do zero',
      courseSlug: 'godot',
      source: 'purchase',
      grantedAt: '2026-08-14T12:00:00Z',
      revokedAt: null,
      revokeReason: null,
      lessonCount: 40,
      completedCount: 26,
      progressPercent: 65,
    },
    {
      id: 'e2',
      courseId: 'c2',
      courseTitle: 'Pixel art para jogos',
      courseSlug: 'pixel',
      source: 'admin_grant',
      grantedAt: '2026-09-01T12:00:00Z',
      revokedAt: null,
      revokeReason: null,
      lessonCount: 24,
      completedCount: 3,
      progressPercent: 13,
    },
    {
      id: 'e3',
      courseId: 'c3',
      courseTitle: 'Shaders 2D na prática',
      courseSlug: 'shaders',
      source: 'admin_grant',
      grantedAt: '2026-07-01T12:00:00Z',
      revokedAt: '2026-08-02T12:00:00Z',
      revokeReason: 'Atribuição de teste',
      lessonCount: 18,
      completedCount: 0,
      progressPercent: 0,
    },
    {
      id: 'e4',
      courseId: 'c4',
      courseTitle: 'Áudio para jogos indie',
      courseSlug: 'audio',
      source: 'purchase',
      grantedAt: '2026-06-01T12:00:00Z',
      revokedAt: '2026-06-05T12:00:00Z',
      revokeReason: 'refund',
      lessonCount: 12,
      completedCount: 2,
      progressPercent: 17,
    },
  ],
  orders: [
    {
      id: 'o1',
      courseTitle: 'Godot do zero',
      status: 'paid',
      source: 'checkout',
      amountCents: 19_700,
      createdAt: '2026-08-14T11:50:00Z',
      paidAt: '2026-08-14T12:00:00Z',
      refundRequestedAt: '2026-08-18T12:00:00Z',
      refundRequestedProgress: 65,
      refundedAt: null,
    },
    {
      id: 'o2',
      courseTitle: 'Áudio para jogos indie',
      status: 'refunded',
      source: 'checkout',
      amountCents: 14_700,
      createdAt: '2026-06-01T11:50:00Z',
      paidAt: '2026-06-01T12:00:00Z',
      refundRequestedAt: '2026-06-03T12:00:00Z',
      refundRequestedProgress: 17,
      refundedAt: '2026-06-05T12:00:00Z',
    },
  ],
};

const GRANTABLE = [
  { id: 'c3', title: 'Shaders 2D na prática' },
  { id: 'c5', title: 'Level design (arquivado)' },
];

type SP = Promise<Record<string, string | string[] | undefined>>;

/** Vitrine com dados fictícios. `?view=perfil`, `?state=loading|empty|error`, `?q=`, `?pagina=`. */
export default async function AdminStudentsShowcase({ searchParams }: { searchParams: SP }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const raw = await searchParams;
  const { q, page } = parseListParams(raw);
  const base = '/dev/admin-students';
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
    body = <ErrorState message="Não foi possível carregar os alunos. Tente novamente." />;
  } else if (raw.view === 'perfil') {
    body = <StudentProfileView profile={PROFILE} grantable={GRANTABLE} listPath={base} demo />;
  } else {
    const filtered =
      state === 'empty'
        ? []
        : ALL.filter((s) => `${s.fullName} ${s.email}`.toLowerCase().includes(q.toLowerCase()));
    body = (
      <>
        <h1 style={{ fontSize: 'var(--s-2)' }}>Alunos</h1>
        <StudentSearch basePath={base} initial={q} />
        <StudentsList
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
    <>
      <main
        style={{
          maxWidth: '72rem',
          margin: '0 auto',
          padding: 'var(--space-5) var(--space-4)',
          display: 'grid',
          gap: 'var(--space-4)',
        }}
      >
        {body}
      </main>
    </>
  );
}
