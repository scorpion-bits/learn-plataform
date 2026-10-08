'use server';

import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';

/**
 * Encerra a sessão (chamado por um <form action> — POST, nunca GET).
 * Telas de login/cadastro/recuperação entram aqui em AUTH-003.
 */
export async function signOut(): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  await supabase.auth.signOut(); // limpa os cookies de sessão desta resposta
  redirect('/');
}
