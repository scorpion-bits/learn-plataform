import 'server-only';

import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

import type { MaterialType } from './schemas';

/** Leituras do editor de materiais: client do usuário; a RLS (`is_admin`) decide. */

/** Linha serializável para o editor (sem `storage_path`: o cliente não precisa dele). */
export type EditorMaterial = {
  id: string;
  type: MaterialType;
  title: string | null;
  position: number;
  body: string | null;
  externalUrl: string | null;
  videoProvider: string | null;
  videoId: string | null;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
};

export type LessonEditorData = {
  lesson: { id: string; title: string; moduleTitle: string };
  materials: EditorMaterial[];
};

/**
 * Aula + materiais em ordem. `null` quando o id é malformado, a aula não existe
 * ou NÃO pertence ao curso da URL (a página responde `notFound()`).
 */
export async function getLessonEditorData(
  courseId: string,
  lessonId: string,
): Promise<LessonEditorData | null> {
  if (!z.uuid().safeParse(courseId).success || !z.uuid().safeParse(lessonId).success) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lessons')
    .select(
      'id, title, course_modules(title), lesson_materials(id, type, title, position, body, external_url, video_provider, video_id, file_name, file_size, mime_type)',
    )
    .eq('id', lessonId)
    .eq('course_id', courseId)
    .order('position', { ascending: true, referencedTable: 'lesson_materials' })
    .maybeSingle();
  if (error) throw new Error('Não foi possível carregar a aula.');
  if (!data) return null;

  const moduleRow = Array.isArray(data.course_modules)
    ? data.course_modules[0]
    : data.course_modules;

  return {
    lesson: { id: data.id, title: data.title, moduleTitle: moduleRow?.title ?? '' },
    materials: (data.lesson_materials ?? []).map((m) => ({
      id: m.id,
      type: m.type,
      title: m.title,
      position: m.position,
      body: m.body,
      externalUrl: m.external_url,
      videoProvider: m.video_provider,
      videoId: m.video_id,
      fileName: m.file_name,
      fileSize: m.file_size,
      mimeType: m.mime_type,
    })),
  };
}
