import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { PAGE_SIZE } from '@/features/students/schemas';

import { mapCourseStudent } from './model';
import type { CourseStudent } from './model';

/** Matrículas do curso (admin) via RPC `admin_course_students` com o client do usuário. */
export async function listCourseStudents(
  courseId: string,
  { q, page }: { q: string; page: number },
): Promise<{ rows: CourseStudent[]; total: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_course_students', {
    p_course_id: courseId,
    p_search: q || undefined,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  if (error) throw new Error('Não foi possível carregar os alunos do curso.');
  return {
    rows: (data ?? []).map(mapCourseStudent),
    total: Number(data?.[0]?.total_count ?? 0),
  };
}
