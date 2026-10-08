import 'server-only';

import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

import { courseIdSchema } from './schemas';

/** Leituras do admin: usam o client do usuário; a RLS (`is_admin`) decide. */

export type AdminCourseRow = {
  id: string;
  slug: string;
  title: string;
  status: Database['public']['Enums']['course_status'];
  priceCents: number;
  coverPath: string | null;
  lessonCount: number;
  studentCount: number;
};

export type CategoryOption = { id: string; name: string };

export type AdminCourseDetail = Database['public']['Tables']['courses']['Row'] & {
  lessonCount: number;
};

function embeddedCount(value: unknown): number {
  return Array.isArray(value) ? ((value[0] as { count?: number } | undefined)?.count ?? 0) : 0;
}

/** Todos os cursos (qualquer status) com nº de aulas e de alunos com matrícula ativa. */
export async function listAdminCourses(): Promise<AdminCourseRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('courses')
    .select('id, slug, title, status, price_cents, cover_path, lessons(count), enrollments(count)')
    .is('enrollments.revoked_at', null)
    .order('created_at', { ascending: false });
  if (error) throw new Error('Não foi possível carregar os cursos.');

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    priceCents: row.price_cents,
    coverPath: row.cover_path,
    lessonCount: embeddedCount(row.lessons),
    studentCount: embeddedCount(row.enrollments),
  }));
}

export async function listCategories(): Promise<CategoryOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .order('position', { ascending: true });
  if (error) throw new Error('Não foi possível carregar as categorias.');
  return data ?? [];
}

/** Curso por id (qualquer status) ou `null` (id malformado ou inexistente). */
export const getAdminCourse = cache(async (id: string): Promise<AdminCourseDetail | null> => {
  if (!courseIdSchema.safeParse(id).success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('courses')
    .select('*, lessons(count)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('Não foi possível carregar o curso.');
  if (!data) return null;
  const { lessons, ...course } = data;
  return { ...course, lessonCount: embeddedCount(lessons) };
});
