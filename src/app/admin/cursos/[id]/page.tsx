import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Tabs } from '@/components/ui';
import { CourseForm } from '@/features/courses/components/CourseForm';
import { StatusControl } from '@/features/courses/components/StatusControl';
import { getAdminCourse, listCategories } from '@/features/courses/queries';
import { formatCentsForInput } from '@/features/courses/schemas';
import { getCoverPublicUrl } from '@/features/materials/storage';

import styles from '../page.module.css';

export const metadata: Metadata = { title: 'Editar curso' };

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [course, categories] = await Promise.all([getAdminCourse(id), listCategories()]);
  if (!course) notFound();

  const info = (
    <div className={styles.layout}>
      <div className={styles.statusBox}>
        <StatusControl
          courseId={course.id}
          status={course.status}
          title={course.title}
          priceCents={course.price_cents}
          coverPath={course.cover_path}
          lessonCount={course.lessonCount}
        />
      </div>
      <CourseForm
        categories={categories}
        course={{
          id: course.id,
          title: course.title,
          slug: course.slug,
          subtitle: course.subtitle ?? '',
          description: course.description ?? '',
          categoryId: course.category_id ?? '',
          level: course.level,
          price: course.price_cents > 0 ? formatCentsForInput(course.price_cents) : '',
          coverPath: course.cover_path ?? '',
          coverUrl: getCoverPublicUrl(course.cover_path),
        }}
      />
    </div>
  );

  return (
    <div className={styles.page}>
      <Link className={styles.back} href="/admin/cursos">
        ← Cursos
      </Link>
      <h1 className={styles.title}>{course.title}</h1>
      <Tabs
        label="Seções do curso"
        items={[
          { value: 'info', label: 'Informações', panel: info },
          { value: 'syllabus', label: 'Ementa (em breve)', panel: null, disabled: true },
          { value: 'students', label: 'Alunos (em breve)', panel: null, disabled: true },
        ]}
      />
    </div>
  );
}
