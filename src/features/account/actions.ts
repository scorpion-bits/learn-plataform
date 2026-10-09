'use server';

import { revalidatePath } from 'next/cache';

import { ActionError, userAction } from '@/lib/auth/actions';
import { createClient } from '@/lib/supabase/server';

import { changePasswordSchema, profileSchema } from './schemas';

/** Salva nome, telefone e CPF do próprio usuário (client do usuário: RLS + GRANT por coluna). */
export const updateProfile = userAction(profileSchema, async (input, { user }) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .update({ full_name: input.full_name, phone: input.phone, tax_id: input.tax_id })
    .eq('id', user.id)
    .select('id')
    .maybeSingle();
  if (error || !data) throw new ActionError('Não foi possível salvar seus dados. Tente novamente.');

  revalidatePath('/conta');
  revalidatePath('/', 'layout'); // o nome aparece no menu do usuário
  return { message: 'Dados salvos.' };
});

/** Troca a senha da sessão atual. Mensagens pt-BR por código de erro do Auth. */
export const changePassword = userAction(changePasswordSchema, async ({ password }) => {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    switch (error.code) {
      case 'same_password':
        throw new ActionError('A nova senha precisa ser diferente da atual.', {
          password: ['Escolha uma senha diferente da atual.'],
        });
      case 'weak_password':
        throw new ActionError('Escolha uma senha mais forte.', {
          password: ['Escolha uma senha mais forte.'],
        });
      case 'reauthentication_needed':
      case 'session_expired':
      case 'session_not_found':
      case 'refresh_token_not_found':
      case 'user_not_found':
        throw new ActionError(
          'Sua sessão é antiga demais para trocar a senha. Saia, entre novamente e tente de novo.',
        );
      default:
        throw new ActionError('Não foi possível trocar a senha agora. Tente novamente.');
    }
  }
  return { message: 'Senha alterada com sucesso.' };
});
