import { z } from 'zod';
import { parseEnv } from './shared';

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.url(),
});

export type ClientEnv = z.infer<typeof clientSchema>;

let cached: ClientEnv | undefined;

/**
 * Env público (seguro no browser). Lazy: só valida ao ser chamado, então
 * `next build` sem variáveis não falha.
 *
 * As NEXT_PUBLIC_* precisam ser referenciadas LITERALMENTE abaixo para o
 * Next inlinar os valores no bundle do cliente (process.env dinâmico não funciona).
 */
export function getClientEnv(): ClientEnv {
  cached ??= parseEnv(
    clientSchema,
    {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    },
    'client',
  );
  return cached;
}
