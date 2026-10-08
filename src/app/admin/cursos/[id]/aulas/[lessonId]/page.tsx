import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getAdminCourse } from '@/features/courses/queries';
import { MaterialsEditor } from '@/features/materials/components/MaterialsEditor';
import { getLessonEditorData } from '@/features/materials/queries';

import styles from './page.module.css';

export const metadata: Metadata = { title: 'Materiais da aula' };

export default async function LessonMaterialsPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id, lessonId } = await params;
  const [course, data] = await Promise.all([getAdminCourse(id), getLessonEditorData(id, lessonId)]);
  // Aula de outro curso (ou inexistente) é 404: o id do curso na URL precisa bater com o da aula.
  if (!course || !data) notFound();

  return (
    <div className={styles.page}>
      <nav className={styles.crumbs} aria-label="Você está em">
        <ol className={styles.crumbList}>
          <li>
            <Link href="/admin/cursos">Cursos</Link>
          </li>
          <li>
            <Link href={`/admin/cursos/${course.id}`}>{course.title}</Link>
          </li>
          <li>
            <Link href={`/admin/cursos/${course.id}?tab=syllabus`}>Ementa</Link>
          </li>
          <li className={styles.crumbCurrent} aria-current="page">
            {data.lesson.title}
          </li>
        </ol>
      </nav>
      <header className={styles.head}>
        <h1 className={styles.title}>{data.lesson.title}</h1>
        <p className={styles.sub}>
          Materiais da aula{data.lesson.moduleTitle ? ` · ${data.lesson.moduleTitle}` : ''}
        </p>
      </header>
      <MaterialsEditor courseId={course.id} lessonId={data.lesson.id} materials={data.materials} />
    </div>
  );
}
