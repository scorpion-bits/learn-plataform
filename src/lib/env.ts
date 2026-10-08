/**
 * Validação de variáveis de ambiente (zod), separada por escopo:
 *
 *  - `@/lib/env/client` -> `getClientEnv()`  (NEXT_PUBLIC_*, seguro no browser)
 *  - `@/lib/env/server` -> `getSupabaseServerEnv()` / `getPaymentsEnv()`  (secrets, `server-only`)
 *
 * Este arquivo reexporta apenas o lado cliente de propósito: importar o server
 * env exige o caminho explícito `@/lib/env/server`, para que nenhum secret seja
 * puxado por acidente em código que roda no browser.
 */
export { getClientEnv, type ClientEnv } from './env/client';
