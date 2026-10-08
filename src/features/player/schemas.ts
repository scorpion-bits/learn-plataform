import { z } from 'zod';

import { courseSlugSchema } from '@/features/catalog/schemas';

/** Parâmetros de rota e inputs de actions do player. Valor inválido nunca chega ao banco. */

export const lessonIdSchema = z.uuid();
export const materialIdSchema = z.uuid();

export { courseSlugSchema };

/** Registrar que o aluno abriu a aula (retomada). */
export const registerVisitSchema = z.object({ lessonId: lessonIdSchema });
export type RegisterVisitInput = z.infer<typeof registerVisitSchema>;

/** Concluir / desfazer a conclusão de uma aula. `completed` é estrito: nada de coerção. */
export const setLessonCompletedSchema = z.object({
  lessonId: lessonIdSchema,
  completed: z.boolean(),
});
export type SetLessonCompletedInput = z.infer<typeof setLessonCompletedSchema>;

/** Pedir a signed URL de um arquivo de aula. */
export const downloadMaterialSchema = z.object({ materialId: materialIdSchema });
export type DownloadMaterialInput = z.infer<typeof downloadMaterialSchema>;
