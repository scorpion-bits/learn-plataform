import { createBrowserClient } from '@supabase/ssr';
import { getClientEnv } from '@/lib/env/client';
import type { Database } from '@/types/database';

/**
 * Client Supabase para Client Components (browser). Usa a publishable key
 * (funciona também com a anon key legada). Sujeito a RLS.
 */
export function createClient() {
  const env = getClientEnv();
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
