import type { Metadata } from 'next';

import { StudentSearch } from '@/features/students/components/StudentSearch';
import { StudentsList } from '@/features/students/components/StudentsList';
import { listStudents } from '@/features/students/queries';
import { parseListParams } from '@/features/students/schemas';

import styles from './page.module.css';

export const metadata: Metadata = { title: 'Alunos' };

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { q, page } = parseListParams(await searchParams);
  const { rows, total } = await listStudents(q, page);
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Alunos</h1>
      <StudentSearch basePath="/admin/alunos" initial={q} />
      <StudentsList rows={rows} total={total} page={page} q={q} basePath="/admin/alunos" />
    </div>
  );
}
