import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getClientEnv } from '@/lib/env/client';
import type { Database } from '@/types/database';

/**
 * Client Supabase para Server Components, Server Actions e Route Handlers.
 * Usa a publishable key (funciona também com a anon key legada) e a sessão
 * do usuário via cookies. Sujeito a RLS.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const env = getClientEnv();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado de um Server Component (cookies somente leitura).
            // Ignorar é seguro se o proxy.ts renovar a sessão (AUTH-001).
          }
        },
      },
    },
  );
}
