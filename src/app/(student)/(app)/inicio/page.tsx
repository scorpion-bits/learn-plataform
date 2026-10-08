import type { Metadata } from 'next';

import { InicioView } from '@/features/library/components/InicioView';
import { firstName, pickContinueCourse } from '@/features/library/model';
import { getLessonTitle, getLibrary } from '@/features/library/queries';
import { getCurrentProfile, requireUser } from '@/lib/auth/dal';

export const metadata: Metadata = { title: 'Início' };
// progresso do usuário: sempre dinâmico (Cache-Control private, no-store)
export const dynamic = 'force-dynamic';

export default async function InicioPage() {
  const user = await requireUser();
  const [courses, profile] = await Promise.all([getLibrary(), getCurrentProfile()]);
  const course = pickContinueCourse(courses);
  const lessonTitle = course ? await getLessonTitle(course.lastLessonId) : null;
  const name = firstName(profile?.fullName) ?? firstName(user.email.split('@')[0]);

  return <InicioView name={name} course={course} lessonTitle={lessonTitle} />;
}
