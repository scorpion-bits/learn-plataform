'use server';

import { getMaterialDownloadUrl } from '@/features/materials/storage';
import type { MaterialDownloadError } from '@/features/materials/storage';
import { ActionError, userAction } from '@/lib/auth/actions';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

import { downloadMaterialSchema, registerVisitSchema } from './schemas';

/** Postgres: RLS recusou (42501) / aula inexistente (23503). Nada a registrar; não é erro do aluno. */
const NOT_REGISTERED_CODES = new Set(['42501', '23503']);

/**
 * Registra a retomada: upsert em `lesson_progress` só com (user_id, lesson_id).
 * O trigger BEFORE UPDATE `set_updated_at` move `updated_at` para agora e NÃO mexe em
 * `completed_at` (concluir é STUDENT-007). `course_id` é preenchido pelo trigger e o
 * GRANT não permite enviá-lo, por isso não vai no payload. Sem acesso ao curso (prévia),
 * a RLS barra o insert e a action devolve `registered: false`.
 */
export const registerLessonVisit = userAction(
  registerVisitSchema,
  async ({ lessonId }, { user }) => {
    const supabase = await createClient();
    const row = {
      user_id: user.id,
      lesson_id: lessonId,
    } as Database['public']['Tables']['lesson_progress']['Insert'];
    const { error } = await supabase
      .from('lesson_progress')
      .upsert(row, { onConflict: 'user_id,lesson_id' });

    if (error) {
      if (error.code && NOT_REGISTERED_CODES.has(error.code)) return { registered: false };
      throw new Error('Não foi possível registrar a aula.');
    }
    return { registered: true };
  },
);

const DOWNLOAD_ERRORS: Record<MaterialDownloadError, string> = {
  invalid_id: 'Arquivo inválido.',
  // inexistente e sem acesso são indistinguíveis de propósito (RLS)
  not_found: 'Arquivo não encontrado ou sem acesso. Atualize a página e tente de novo.',
  not_a_file: 'Este material não é um arquivo para download.',
  unavailable: 'Não foi possível preparar o download agora. Tente de novo em instantes.',
};

/**
 * Signed URL curta (≤ 10 min) de um arquivo de aula. O acesso é decidido pela RLS dentro de
 * `getMaterialDownloadUrl` (client do usuário); aqui só exigimos login e validamos o id.
 */
export const requestMaterialDownload = userAction(
  downloadMaterialSchema,
  async ({ materialId }) => {
    const result = await getMaterialDownloadUrl(materialId);
    if (!result.ok) throw new ActionError(DOWNLOAD_ERRORS[result.error]);
    return { url: result.data.url, fileName: result.data.fileName };
  },
);
