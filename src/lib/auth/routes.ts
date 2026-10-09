import { sanitizeNextPath } from './redirect';

/**
 * Regras de rota do proxy (docs/architecture.md §3). Puro e sem I/O: o proxy
 * só garante sessão válida; o PAPEL é checado no DAL/banco, nunca aqui.
 */

/** Exigem usuário logado. `/admin` também exige papel admin, verificado em `requireAdmin()`. */
const PROTECTED_PREFIXES = [
  '/inicio',
  '/minha-biblioteca',
  '/aprender',
  '/conta',
  '/checkout',
  '/admin',
] as const;

/** Telas só para anônimos. `/recuperar-senha` e `/redefinir-senha` ficam de fora de propósito. */
const GUEST_ONLY_PATHS = ['/entrar', '/cadastro'] as const;

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

export function isGuestOnlyPath(pathname: string): boolean {
  return GUEST_ONLY_PATHS.some((path) => matchesPrefix(pathname, path));
}

/**
 * Decide o redirecionamento do proxy. Devolve um path relativo ou `null`
 * (deixar passar). `search` inclui o `?`.
 */
export function resolveAuthRedirect(input: {
  pathname: string;
  search: string;
  isAuthenticated: boolean;
}): string | null {
  const { pathname, search, isAuthenticated } = input;

  // Link de email que caiu na Site URL (redirect fora da allowlist do Supabase):
  // encaminha o `code` PKCE para o callback em vez de ignorá-lo na landing.
  if (pathname === '/') {
    const code = new URLSearchParams(search).get('code');
    if (code) return `/auth/callback?code=${encodeURIComponent(code)}&next=/inicio`;
  }

  if (!isAuthenticated && isProtectedPath(pathname)) {
    const next = sanitizeNextPath(`${pathname}${search}`, '');
    return next ? `/entrar?next=${encodeURIComponent(next)}` : '/entrar';
  }

  if (isAuthenticated && isGuestOnlyPath(pathname)) {
    const requested = new URLSearchParams(search).get('next');
    return sanitizeNextPath(requested);
  }

  return null;
}
