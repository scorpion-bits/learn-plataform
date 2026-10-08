import 'server-only';

import { getCoverPublicUrl } from '@/features/materials/storage';
import { createClient } from '@/lib/supabase/server';

import { mapLibraryRow, sortByRecency } from './model';
import type { LibraryCourse } from './model';

/**
 * Leituras da biblioteca do aluno. Só a view `my_library` (security_invoker) com o client do
 * usuário: a RLS devolve apenas as matrículas ativas dele. Nada de service role.
 */

export type LibraryCourseView = LibraryCourse & { coverUrl: string | null };

function withCover(course: LibraryCourse): LibraryCourseView {
  let coverUrl: string | null = null;
  try {
    coverUrl = getCoverPublicUrl(course.coverPath);
  } catch {
    coverUrl = null; // env ausente: segue sem capa
  }
  return { ...course, coverUrl };
}

/** Todos os cursos da biblioteca, do acesso mais recente ao mais antigo. */
export async function getLibrary(): Promise<LibraryCourseView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('my_library').select('*');
  if (error) throw new Error('Não foi possível carregar sua biblioteca.');

  const courses = (data ?? []).map(mapLibraryRow).filter((c): c is LibraryCourse => c !== null);
  return sortByRecency(courses).map(withCover);
}

/** Título da aula de retomada. Conforto de UX: se falhar, o card segue sem a linha. */
export async function getLessonTitle(lessonId: string | null): Promise<string | null> {
  if (!lessonId) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('lessons')
      .select('title')
      .eq('id', lessonId)
      .maybeSingle();
    if (error) return null;
    return data?.title ?? null;
  } catch {
    return null;
  }
}
