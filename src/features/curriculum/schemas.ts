import { z } from 'zod';

/** Espelha as constraints de `course_modules` / `lessons` (docs/database.md). */
export const TITLE_MAX = 200;
/** Teto de sanidade para a duração de uma aula (24 h). */
export const DURATION_MAX_MINUTES = 1440;
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

/** Minutos digitados ("12") -> inteiro; vazio -> `null`; inválido -> `undefined`. */
export function parseMinutes(raw: string): number | null | undefined {
  const value = raw.trim();
  if (value === '') return null;
  if (!/^\d{1,4}$/.test(value)) return undefined;
  return Number(value);
}

export function minutesToSeconds(minutes: number | null): number | null {
  return minutes === null ? null : minutes * 60;
}

/** Segundos gravados -> minutos exibidos (arredonda para cima: 30 s vira 1 min). */
export function secondsToMinutes(seconds: number | null): number | null {
  return seconds === null ? null : Math.ceil(seconds / 60);
}
