import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { isGuestOnlyPath, isProtectedPath } from '@/lib/auth/routes';
import { getClientEnv } from '@/lib/env/client';
import type { Database } from '@/types/database';

export interface SessionResult {
  /** Resposta que carrega os cookies renovados. Redirects devem copiá-los (ver `redirectWithSession`). */
  response: NextResponse;
  isAuthenticated: boolean;
}

/**
 * Renova a sessão do Supabase no proxy (Next 16 `src/proxy.ts`).
 *
 * - SEM consulta ao banco: só valida o JWT (`getClaims`, JWKS local) e, se
 *   preciso, renova o token — os cookies novos vão na resposta.
 * - Não decide papel. Admin é checado em `requireAdmin()` + RLS.
 * - Sem env configurada, rotas públicas passam (dev/build sem Supabase); rotas
 *   protegidas ou de entrada falham fechado (erro), nunca "liberam".
 */
export async function updateSession(request: NextRequest): Promise<SessionResult> {
  let response = NextResponse.next({ request });

  let env: ReturnType<typeof getClientEnv>;
  try {
    env = getClientEnv();
  } catch (error) {
    const { pathname } = request.nextUrl;
    if (isProtectedPath(pathname) || isGuestOnlyPath(pathname)) throw error;
    return { response, isAuthenticated: false };
  }

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          // Cabeçalhos anti-cache enviados pelo @supabase/ssr quando há Set-Cookie de sessão.
          Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // Nada entre createServerClient e getClaims: o refresh acontece aqui.
  const { data, error } = await supabase.auth.getClaims();
  const isAuthenticated = !error && typeof data?.claims?.sub === 'string';

  return { response, isAuthenticated };
}

/** Redirect que preserva os cookies de sessão renovados em `session.response`. */
export function redirectWithSession(
  request: NextRequest,
  session: SessionResult,
  target: string,
): NextResponse {
  const redirect = NextResponse.redirect(new URL(target, request.url));
  session.response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  session.response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'cache-control') redirect.headers.set(key, value);
  });
  return redirect;
}
