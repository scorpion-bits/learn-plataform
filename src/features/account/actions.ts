'use server';

import { revalidatePath } from 'next/cache';

import { ActionError, userAction } from '@/lib/auth/actions';
import { getCurrentRole } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';

import { AccountDeletionError, anonymizeUser, disableAuthUser } from './deletion';
import { changePasswordSchema, deleteAccountSchema, profileSchema, sameEmail } from './schemas';

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

const DELETE_RETRY = 'Não foi possível excluir sua conta agora. Tente novamente em instantes.';

/**
 * Exclui a conta do próprio usuário (LGPD, DB-008). Ordem:
 *   guard -> e-mail confere -> não é admin -> anonymize_user (banco, recusa
 *   reembolso/PIX pendente) -> Auth (limpa metadata, bane, soft delete) -> sai.
 * Tudo é idempotente: se o Auth falhar, o usuário (ainda logado) pode repetir.
 */
export const deleteMyAccount = userAction(deleteAccountSchema, async ({ email }, { user }) => {
  if (!sameEmail(email, user.email)) {
    throw new ActionError('O e-mail digitado não é o desta conta.', {
      email: ['Digite exatamente o e-mail desta conta.'],
    });
  }

  if ((await getCurrentRole()) === 'admin') {
    throw new ActionError(
      'Contas de administrador não podem ser excluídas por aqui. Fale com o responsável pela plataforma.',
    );
  }

  try {
    const result = await anonymizeUser(user.id);
    switch (result) {
      case 'anonymized':
      case 'already_anonymized':
        break;
      case 'is_admin':
        throw new ActionError(
          'Contas de administrador não podem ser excluídas por aqui. Fale com o responsável pela plataforma.',
        );
      case 'refund_pending':
        throw new ActionError(
          'Você tem um reembolso em andamento. Aguarde a conclusão do reembolso para excluir a conta.',
        );
      case 'payment_pending':
        throw new ActionError(
          'Você tem um pagamento PIX em aberto. Aguarde ele expirar ou ser confirmado para excluir a conta.',
        );
      case 'not_found':
        throw new ActionError(DELETE_RETRY);
    }

    await disableAuthUser(user.id);
  } catch (error) {
    if (error instanceof AccountDeletionError) {
      console.error('[account] delete failed', { userId: user.id, step: error.step });
      throw new ActionError(DELETE_RETRY);
    }
    throw error;
  }

  // As sessões já foram removidas pelo soft delete; aqui só limpamos os cookies.
  try {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // sessão já inválida: nada a fazer
  }

  revalidatePath('/', 'layout');
  return { message: 'Sua conta foi excluída.' };
});
