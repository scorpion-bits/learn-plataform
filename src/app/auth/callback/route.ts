import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

import { sanitizeNextPath } from '@/lib/auth/redirect';
import { createClient } from '@/lib/supabase/server';

const OTP_TYPES: readonly EmailOtpType[] = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
];

/**
 * Destino dos links de email do Supabase (confirmação de cadastro, recuperação
 * de senha). Troca `code` (PKCE) ou `token_hash`+`type` por uma sessão em
 * cookies e redireciona para `next` — sempre um path interno sanitizado.
 * Falha -> `/entrar?erro=link-invalido` (mensagem genérica, sem detalhes do erro).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = sanitizeNextPath(searchParams.get('next'));
  const failure = redirectTo('/entrar?erro=link-invalido');

  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return failure;
  } else if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return failure;
  } else {
    return failure;
  }

  return redirectTo(next);
}

/**
 * Redirect com `Location` RELATIVO: o navegador resolve no mesmo host em que os cookies de
 * sessão acabaram de ser gravados. `request.nextUrl.origin` pode ser o host em que o servidor
 * escuta (ex.: `localhost` atrás de `next start` acessado por 127.0.0.1), não o do navegador.
 * `path` sempre vem de `sanitizeNextPath` ou é constante (nunca externo).
 */
function redirectTo(path: string) {
  return new NextResponse(null, {
    status: 303,
    headers: { Location: path, 'Cache-Control': 'private, no-store' },
  });
}
