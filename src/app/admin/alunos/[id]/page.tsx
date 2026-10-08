import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { StudentProfileView } from '@/features/students/components/StudentProfileView';
import { getStudentProfile, listGrantableCourses } from '@/features/students/queries';

export const metadata: Metadata = { title: 'Aluno' };

export default async function AdminStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getStudentProfile(id);
  if (!profile) notFound();
  const grantable = await listGrantableCourses(profile.id);
  return <StudentProfileView profile={profile} grantable={grantable} listPath="/admin/alunos" />;
}
