import type { ZodType } from 'zod';

/**
 * Valida `source` com `schema` e, se falhar, lança um erro claro listando
 * todas as variáveis ausentes/inválidas (sem expor valores).
 */
export function parseEnv<T>(schema: ZodType<T>, source: unknown, scope: 'server' | 'client'): T {
  const result = schema.safeParse(source);
  if (result.success) return result.data;

  const names = [...new Set(result.error.issues.map((issue) => String(issue.path[0] ?? '?')))];
  throw new Error(
    `Variáveis de ambiente (${scope}) ausentes ou inválidas: ${names.join(', ')}. ` +
      'Veja .env.example e docs/architecture.md §6.',
  );
}
