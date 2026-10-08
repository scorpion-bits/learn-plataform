import 'server-only';

import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

/** Leituras do admin: usam o client do usuário; a RLS (`is_admin`) decide. */

export type CurriculumLesson = {
  id: string;
  title: string;
  position: number;
  durationSeconds: number | null;
  isPreview: boolean;
  materialCount: number;
};

export type CurriculumModule = {
  id: string;
  title: string;
  position: number;
  lessons: CurriculumLesson[];
};

function embeddedCount(value: unknown): number {
  return Array.isArray(value) ? ((value[0] as { count?: number } | undefined)?.count ?? 0) : 0;
}

/** Módulos do curso (com aulas), em ordem. Id malformado => lista vazia. */
export async function getCurriculum(courseId: string): Promise<CurriculumModule[]> {
  if (!z.uuid().safeParse(courseId).success) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('course_modules')
    .select(
      'id, title, position, lessons(id, title, position, duration_seconds, is_preview, lesson_materials(count))',
    )
    .eq('course_id', courseId)
    .order('position', { ascending: true })
    .order('position', { ascending: true, referencedTable: 'lessons' });
  if (error) throw new Error('Não foi possível carregar a ementa.');

  return (data ?? []).map((module) => ({
    id: module.id,
    title: module.title,
    position: module.position,
    lessons: (module.lessons ?? []).map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      position: lesson.position,
      durationSeconds: lesson.duration_seconds,
      isPreview: lesson.is_preview,
      materialCount: embeddedCount(lesson.lesson_materials),
    })),
  }));
}
