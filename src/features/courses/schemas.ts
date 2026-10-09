import { z } from 'zod';

import {
  COURSE_LEVELS,
  COURSE_STATUSES,
  PRICE_MAX_CENTS,
  SLUG_MAX,
  SLUG_PATTERN,
  SUBTITLE_MAX,
  TITLE_MAX,
  DESCRIPTION_MAX,
  parsePriceToCents,
} from './constants';

export * from './constants';

const priceSchema = z
  .string()
  .max(20, 'Preço inválido.')
  .transform((value, ctx) => {
    const cents = parsePriceToCents(value);
    if (cents === null) {
      ctx.addIssue({ code: 'custom', message: 'Informe um valor como 197,00.' });
      return z.NEVER;
    }
    if (cents > PRICE_MAX_CENTS) {
      ctx.addIssue({ code: 'custom', message: 'Preço acima do limite (R$ 100.000,00).' });
      return z.NEVER;
    }
    return cents;
  });

const emptyToNull = (value: string) => (value === '' ? null : value);

/** Campos editáveis de um curso, como chegam do formulário (strings). */
const courseFields = {
  title: z
    .string()
    .trim()
    .min(1, 'Informe o título.')
    .max(TITLE_MAX, `No máximo ${TITLE_MAX} caracteres.`),
  slug: z
    .string()
    .trim()
    .min(1, 'Informe o endereço (slug).')
    .max(SLUG_MAX, `No máximo ${SLUG_MAX} caracteres.`)
    .regex(SLUG_PATTERN, 'Use só letras minúsculas, números e hífens (ex.: godot-do-zero).'),
  subtitle: z
    .string()
    .trim()
    .max(SUBTITLE_MAX, `No máximo ${SUBTITLE_MAX} caracteres.`)
    .default('')
    .transform(emptyToNull),
  description: z
    .string()
    .max(DESCRIPTION_MAX, `No máximo ${DESCRIPTION_MAX} caracteres.`)
    .default(''),
  categoryId: z
    .union([z.literal(''), z.uuid('Categoria inválida.')])
    .default('')
    .transform(emptyToNull),
  level: z.enum(COURSE_LEVELS, 'Escolha um nível.'),
  price: priceSchema.default(0),
};

export const createCourseSchema = z.object(courseFields);

const COVER_PATH_PATTERN = /^courses\/([0-9a-f-]{36})\/[0-9a-f-]{36}\.(jpg|png|webp|avif)$/;

export const updateCourseSchema = z
  .object({
    id: z.uuid(),
    ...courseFields,
    /** '' remove a capa; caso contrário `courses/<id>/<uuid>.<ext>`. */
    coverPath: z.string().max(200).default(''),
  })
  .superRefine((value, ctx) => {
    if (value.coverPath === '') return;
    const match = COVER_PATH_PATTERN.exec(value.coverPath);
    if (!match || match[1] !== value.id) {
      ctx.addIssue({ code: 'custom', path: ['coverPath'], message: 'Capa inválida.' });
    }
  })
  .transform((value) => ({ ...value, coverPath: emptyToNull(value.coverPath) }));

export const setCourseStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(COURSE_STATUSES),
});

export const courseIdSchema = z.uuid();

export type CreateCourseInput = z.output<typeof createCourseSchema>;
export type UpdateCourseInput = z.output<typeof updateCourseSchema>;
export type SetCourseStatusInput = z.output<typeof setCourseStatusSchema>;
