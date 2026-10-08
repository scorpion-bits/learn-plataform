import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getClientEnv } from '@/lib/env/client';
import { getSupabaseServerEnv } from '@/lib/env/server';
import type { Database } from '@/types/database';

/**
 * Client Supabase com a secret key (funciona também com a service_role legada).
 * BYPASSA RLS: use apenas em código de servidor confiável (webhooks, jobs),
 * nunca com input não validado. Sem sessão persistida.
 */
export function createServiceClient() {
  return createSupabaseClient<Database>(
    getClientEnv().NEXT_PUBLIC_SUPABASE_URL,
    getSupabaseServerEnv().SUPABASE_SECRET_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
