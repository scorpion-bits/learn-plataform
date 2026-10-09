import { ErrorState } from '@/components/ui';

import { listCourseStudents } from '../queries';
import styles from './CourseStudents.module.css';
import { CourseStudentsList } from './CourseStudentsList';
import { CourseStudentsSearch } from './CourseStudentsSearch';

/** Server Component da aba "Alunos": busca + lista; erro de leitura vira ErrorState. */
export async function CourseStudentsPanel({
  courseId,
  q,
  page,
}: {
  courseId: string;
  q: string;
  page: number;
}) {
  const basePath = `/admin/cursos/${courseId}`;
  let data;
  try {
    data = await listCourseStudents(courseId, { q, page });
  } catch {
    return (
      <ErrorState
        title="Não foi possível carregar os alunos"
        message="Recarregue a página para tentar novamente."
      />
    );
  }
  return (
    <div className={styles.root}>
      <CourseStudentsSearch basePath={basePath} initial={q} />
      <CourseStudentsList
        rows={data.rows}
        total={data.total}
        page={page}
        q={q}
        basePath={basePath}
      />
    </div>
  );
}
