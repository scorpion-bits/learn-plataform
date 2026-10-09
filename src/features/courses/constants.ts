// Sem zod: constantes e helpers puros importáveis por Client Components.

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
