import { z } from 'zod';

import { DURATION_MAX_MINUTES, TITLE_MAX } from './constants';

export * from './constants';

/** Teto de itens numa reordenação (evita payload abusivo). */
export const REORDER_MAX_ITEMS = 500;

const id = z.uuid('Identificador inválido.');

const title = z
  .string()
  .trim()
  .min(1, 'Informe o título.')
  .max(TITLE_MAX, `No máximo ${TITLE_MAX} caracteres.`);

/** Lista completa de ids na nova ordem: não vazia e sem repetição. */
const orderedIds = z
  .array(id)
  .min(1, 'Lista vazia.')
  .max(REORDER_MAX_ITEMS)
  .refine((list) => new Set(list).size === list.length, 'Lista com ids repetidos.');

export const createModuleSchema = z.object({ courseId: id, title });
export const renameModuleSchema = z.object({ id, title });
export const deleteModuleSchema = z.object({ id });
export const reorderModulesSchema = z.object({ courseId: id, ids: orderedIds });

export const createLessonSchema = z.object({ moduleId: id, title });
export const renameLessonSchema = z.object({ id, title });
export const deleteLessonSchema = z.object({ id });
export const reorderLessonsSchema = z.object({ moduleId: id, ids: orderedIds });
export const setLessonPreviewSchema = z.object({ id, isPreview: z.boolean() });
export const setLessonDurationSchema = z.object({
  id,
  /** Minutos inteiros; `null` limpa a duração. */
  minutes: z
    .number('Informe a duração em minutos.')
    .int('Use minutos inteiros.')
    .min(0, 'A duração não pode ser negativa.')
    .max(DURATION_MAX_MINUTES, `No máximo ${DURATION_MAX_MINUTES} minutos.`)
    .nullable(),
});
