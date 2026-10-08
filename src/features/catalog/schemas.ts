import { z } from 'zod';

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/** Filtros da URL. Valor inválido vira "sem filtro" (nunca erro). */
export const catalogFiltersSchema = z.object({
  categoria: slugSchema.max(80).optional().catch(undefined),
  nivel: z.enum(['beginner', 'intermediate', 'advanced']).optional().catch(undefined),
});

export type CatalogFilters = z.infer<typeof catalogFiltersSchema>;

export const courseSlugSchema = slugSchema.max(120);

/** `?categoria=a&categoria=b` chega como array: usa o primeiro valor. */
export function parseCatalogFilters(
  params: Record<string, string | string[] | undefined>,
): CatalogFilters {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return catalogFiltersSchema.parse({
    categoria: first(params.categoria),
    nivel: first(params.nivel),
  });
}
