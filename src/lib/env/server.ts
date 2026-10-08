import 'server-only';
import { z } from 'zod';
import { parseEnv } from './shared';

/**
 * Env secreto (somente servidor; `server-only` quebra o build se importado
 * de um Client Component). Dividido por domínio e lazy: cada getter valida só
 * o que usa, então o Supabase funciona sem chaves de pagamento (e vice-versa).
 */

const supabaseSchema = z.object({
  // Secret key nova (sb_secret_...); aceita também a service_role legada.
  SUPABASE_SECRET_KEY: z.string().min(1),
});

const paymentsSchema = z.object({
  ABACATEPAY_API_KEY: z.string().min(1),
  ABACATEPAY_WEBHOOK_SECRET: z.string().min(1),
  ABACATEPAY_WEBHOOK_HMAC_KEY: z.string().min(1),
});

export type SupabaseServerEnv = z.infer<typeof supabaseSchema>;
export type PaymentsEnv = z.infer<typeof paymentsSchema>;

let supabaseCached: SupabaseServerEnv | undefined;
let paymentsCached: PaymentsEnv | undefined;

export function getSupabaseServerEnv(): SupabaseServerEnv {
  supabaseCached ??= parseEnv(supabaseSchema, process.env, 'server');
  return supabaseCached;
}

export function getPaymentsEnv(): PaymentsEnv {
  paymentsCached ??= parseEnv(paymentsSchema, process.env, 'server');
  return paymentsCached;
}
