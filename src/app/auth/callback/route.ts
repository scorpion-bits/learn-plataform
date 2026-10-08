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
  const { searchParams, origin } = request.nextUrl;
  const next = sanitizeNextPath(searchParams.get('next'));
  const failure = NextResponse.redirect(new URL('/entrar?erro=link-invalido', origin));

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

  const response = NextResponse.redirect(new URL(next, origin));
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
