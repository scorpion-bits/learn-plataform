import 'server-only';

import { cache } from 'react';

import { getCurrentUser } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';

import { deriveCategories, groupOutline, mapCatalogRow } from './model';
import type { CatalogCourse, CategoryOption, OutlineModule } from './model';
import { courseSlugSchema } from './schemas';

/**
 * Leituras públicas do catálogo. Só views com `security_invoker` e o client do
 * usuário (anon ou logado): a RLS decide o que volta. Nada de service role.
 */

export type CatalogData = {
  courses: CatalogCourse[];
  categories: CategoryOption[];
  /** ids dos cursos que o usuário logado já tem na biblioteca. */
  ownedCourseIds: string[];
};

/** Cursos publicados (todos; os filtros são aplicados em memória, o catálogo é pequeno). */
export async function getCatalog(): Promise<CatalogData> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('course_catalog')
    .select('*')
    .order('published_at', { ascending: false });
  if (error) throw new Error('Não foi possível carregar o catálogo.');

  const rows = data ?? [];
  const courses = rows.map(mapCatalogRow).filter((c): c is CatalogCourse => c !== null);
  return {
    courses,
    categories: deriveCategories(rows),
    ownedCourseIds: await getOwnedCourseIds(),
  };
}

/** Selo "Na sua biblioteca" é conforto de UX: se falhar, some em silêncio. */
async function getOwnedCourseIds(): Promise<string[]> {
  try {
    if (!(await getCurrentUser())) return [];
    const supabase = await createClient();
    const { data, error } = await supabase.from('my_library').select('course_id');
    if (error) return [];
    return (data ?? []).map((r) => r.course_id).filter((id): id is string => Boolean(id));
  } catch {
    return [];
  }
}

export type CoursePageData = {
  course: CatalogCourse;
  outline: OutlineModule[];
  signedIn: boolean;
  hasAccess: boolean;
};

/** Curso publicado por slug (memoizado por request: metadata + página). `null` se não existir. */
export const getPublishedCourse = cache(async (slug: string): Promise<CatalogCourse | null> => {
  const parsed = courseSlugSchema.safeParse(slug);
  if (!parsed.success) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('course_catalog')
    .select('*')
    .eq('slug', parsed.data)
    .maybeSingle();
  if (error) throw new Error('Não foi possível carregar o curso.');
  return data ? mapCatalogRow(data) : null;
});

export async function getCoursePage(slug: string): Promise<CoursePageData | null> {
  const course = await getPublishedCourse(slug);
  if (!course) return null;

  const supabase = await createClient();
  const [outlineRes, user] = await Promise.all([
    supabase.from('course_outline').select('*').eq('course_id', course.id),
    getCurrentUser(),
  ]);
  if (outlineRes.error) throw new Error('Não foi possível carregar a ementa.');

  let hasAccess = false;
  if (user) {
    // Se falhar, cai em "Comprar": o checkout/RLS ainda barram qualquer abuso.
    const { data } = await supabase
      .from('my_library')
      .select('course_id')
      .eq('course_id', course.id)
      .maybeSingle();
    hasAccess = Boolean(data);
  }

  return {
    course,
    outline: groupOutline(outlineRes.data ?? []),
    signedIn: Boolean(user),
    hasAccess,
  };
}
