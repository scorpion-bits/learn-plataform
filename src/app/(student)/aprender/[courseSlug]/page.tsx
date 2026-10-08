import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { getResumeTarget } from '@/features/player/queries';
import { requireUser } from '@/lib/auth/dal';

// Dados pessoais (progresso): nunca cacheado nem pré-renderizado.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Continuar curso', robots: { index: false } };

type Params = Promise<{ courseSlug: string }>;

/**
 * `/aprender/<curso>` só decide para onde ir: aula de retomada (última com atividade;
 * senão a primeira não concluída; senão a primeira). Sem aula aberta -> página do curso.
 */
export default async function ResumeCoursePage({ params }: { params: Params }) {
  const { courseSlug } = await params;
  const user = await requireUser();

  const target = await getResumeTarget(courseSlug, user.id);
  if (!target) notFound();
  if (target.kind === 'course') redirect(`/cursos/${target.courseSlug}`);
  redirect(`/aprender/${target.courseSlug}/${target.lessonId}`);
}
