import { z } from 'zod';

/** Espelha as constraints de `courses` (docs/database.md). */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const SLUG_MAX = 100;
export const TITLE_MAX = 200;
export const SUBTITLE_MAX = 300;
export const DESCRIPTION_MAX = 20000;
/** R$ 100.000,00 — teto de sanidade (a coluna é integer). */
export const PRICE_MAX_CENTS = 10_000_000;

export const COVER_MAX_BYTES = 5 * 1024 * 1024; // bucket course-covers
export const COVER_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;
export const COVER_EXTENSIONS: Record<(typeof COVER_MIME_TYPES)[number], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

export const COURSE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export const COURSE_STATUSES = ['draft', 'published', 'archived'] as const;
export type CourseLevel = (typeof COURSE_LEVELS)[number];
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const LEVEL_LABELS: Record<CourseLevel, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};
export const STATUS_LABELS: Record<CourseStatus, string> = {
  draft: 'Rascunho',
  published: 'Publicado',
  archived: 'Arquivado',
};

/** "Godot do zero!" -> "godot-do-zero" (kebab-case ASCII, até 100 caracteres). */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, '');
}

/**
 * "197", "197,5", "1.997,50", "R$ 97,00" -> centavos. `null` se inválido.
 * Sem ponto flutuante: separa inteiro e fração como texto.
 */
export function parsePriceToCents(raw: string): number | null {
  const value = raw.replace(/^R\$\s*/i, '').trim();
  if (value === '') return 0;
  const match = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/.exec(value);
  if (!match) return null;
  const reais = Number((match[1] ?? '').replaceAll('.', ''));
  const cents = Number((match[2] ?? '').padEnd(2, '0'));
  const total = reais * 100 + cents;
  return Number.isSafeInteger(total) ? total : null;
}

/** 19700 -> "197,00" (valor do campo de edição). */
export function formatCentsForInput(cents: number): string {
  const reais = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, '0');
  return `${reais},${rest}`;
}

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
