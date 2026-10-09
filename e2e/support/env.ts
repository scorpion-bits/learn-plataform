import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { z } from 'zod';

/**
 * Env dos testes E2E (ADR-021). Carrega `.env.e2e.local` (gerado por
 * `e2e/scripts/write-env.sh`) ou, na falta dele, `.env` (é o que o CI cria). Variáveis já
 * presentes no processo têm prioridade (`process.loadEnvFile` não sobrescreve).
 *
 * Trava de segurança: os testes criam usuários/cursos com o service role, então SÓ rodam
 * contra um Supabase em loopback. Um `.env.local` de projeto remoto nunca é lido aqui.
 */
export const E2E_ENV_FILES = ['.env.e2e.local', '.env'] as const;

let loaded = false;
function loadEnvFiles(): void {
  if (loaded) return;
  loaded = true;
  for (const file of E2E_ENV_FILES) {
    const path = resolve(process.cwd(), file);
    if (existsSync(path)) process.loadEnvFile(path);
  }
}

/** Segredo do webhook usado pelo app e pelos testes (precisa ser o mesmo nos dois). */
export const DEFAULT_E2E_WEBHOOK_SECRET = 'e2e-webhook-secret';
export const DEFAULT_E2E_MOCK_PORT = 4010;

const LOOPBACK = new Set(['localhost', '127.0.0.1']);

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.url().default('http://127.0.0.1:3000'),
  ABACATEPAY_API_KEY: z.string().min(1).default('abc_dev_e2e'),
  ABACATEPAY_WEBHOOK_SECRET: z.string().min(1).default(DEFAULT_E2E_WEBHOOK_SECRET),
  E2E_MOCK_PORT: z.coerce.number().int().positive().default(DEFAULT_E2E_MOCK_PORT),
  /** Mailpit do Supabase local (`[local_smtp]` em supabase/config.toml, porta 54324). */
  E2E_MAILPIT_URL: z.url().default('http://127.0.0.1:54324'),
});

export interface E2eEnv {
  supabaseUrl: string;
  publishableKey: string;
  secretKey: string;
  siteUrl: string;
  apiKey: string;
  webhookSecret: string;
  mockPort: number;
  /** `http://127.0.0.1:<porta>/v2`: o valor de `ABACATEPAY_API_BASE_URL` do app. */
  mockBaseUrl: string;
  mailpitUrl: string;
}

export function loadE2eEnv(): E2eEnv {
  loadEnvFiles();
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map((i) => String(i.path[0])))].join(', ');
    throw new Error(
      `Env E2E ausente/inválida: ${names}. Rode e2e/scripts/write-env.sh com o Supabase local no ar (docs/development.md › E2E).`,
    );
  }
  const env = parsed.data;
  const host = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname;
  if (!LOOPBACK.has(host)) {
    throw new Error(
      `Os testes E2E só rodam contra o Supabase local (localhost/127.0.0.1); recebido: ${host}.`,
    );
  }
  return {
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    secretKey: env.SUPABASE_SECRET_KEY,
    siteUrl: env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, ''),
    apiKey: env.ABACATEPAY_API_KEY,
    webhookSecret: env.ABACATEPAY_WEBHOOK_SECRET,
    mockPort: env.E2E_MOCK_PORT,
    mockBaseUrl: `http://127.0.0.1:${env.E2E_MOCK_PORT}/v2`,
    mailpitUrl: env.E2E_MAILPIT_URL.replace(/\/+$/, ''),
  };
}
