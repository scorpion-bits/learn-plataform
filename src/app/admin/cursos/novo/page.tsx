import type { Metadata } from 'next';
import Link from 'next/link';

import { CourseForm } from '@/features/courses/components/CourseForm';
import { listCategories } from '@/features/courses/queries';

import styles from '../page.module.css';

export const metadata: Metadata = { title: 'Novo curso' };

export default async function NewCoursePage() {
  const categories = await listCategories();
  return (
    <div className={styles.page}>
      <Link className={styles.back} href="/admin/cursos">
        ← Cursos
      </Link>
      <h1 className={styles.title}>Novo curso</h1>
      <CourseForm categories={categories} />
    </div>
  );
}
