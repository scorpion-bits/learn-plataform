import type { NextRequest } from 'next/server';

import { resolveAuthRedirect } from '@/lib/auth/routes';
import { redirectWithSession, updateSession } from '@/lib/supabase/proxy';

/**
 * Proxy (Next 16; antigo middleware). Renova a sessão e redireciona:
 * anônimo em rota protegida -> /entrar?next=…; logado em /entrar|/cadastro -> /inicio.
 * NÃO consulta o banco nem o papel (ver docs/authentication.md).
 */
export async function proxy(request: NextRequest) {
  const session = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  const target = resolveAuthRedirect({
    pathname,
    search,
    isAuthenticated: session.isAuthenticated,
  });
  if (target) return redirectWithSession(request, session, target);

  return session.response;
}

export const config = {
  matcher: [
    // Exclui estáticos, otimização de imagem, metadados, arquivos com extensão e o webhook (sem sessão).
    '/((?!_next/static|_next/image|api/webhooks|favicon\\.ico|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?|css|js|map|txt)$).*)',
  ],
};
