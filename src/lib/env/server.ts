import 'server-only';
import { z } from 'zod';
import { parseEnv } from './shared';

const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
  ABACATEPAY_API_KEY: z.string().min(1),
  ABACATEPAY_WEBHOOK_SECRET: z.string().min(1),
  ABACATEPAY_WEBHOOK_HMAC_KEY: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | undefined;

/**
 * Env secreto (somente servidor; `server-only` quebra o build se importado
 * de um Client Component). Lazy: valida só na primeira chamada em runtime.
 */
export function getServerEnv(): ServerEnv {
  cached ??= parseEnv(serverSchema, process.env, 'server');
  return cached;
}
