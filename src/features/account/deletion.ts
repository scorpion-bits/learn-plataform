import 'server-only';

import { createServiceClient } from '@/lib/supabase/service';

/**
 * Exclusão de conta pelo titular (DB-008). Service role: só para a action
 * `deleteMyAccount`, depois do guard e da confirmação.
 */

export type AnonymizeResult =
  | 'anonymized'
  | 'already_anonymized'
  | 'not_found'
  | 'is_admin'
  | 'refund_pending'
  | 'payment_pending';

const ANONYMIZE_RESULTS: readonly AnonymizeResult[] = [
  'anonymized',
  'already_anonymized',
  'not_found',
  'is_admin',
  'refund_pending',
  'payment_pending',
];

/** ~100 anos: o login nunca mais funciona, mesmo que o soft delete falhe. */
export const DELETED_ACCOUNT_BAN = '876000h';

export class AccountDeletionError extends Error {
  constructor(readonly step: string) {
    super(`account deletion failed at ${step}`);
    this.name = 'AccountDeletionError';
  }
}

/** Banco: `anonymize_user()` (perfil, matrículas, progresso). Idempotente. */
export async function anonymizeUser(userId: string): Promise<AnonymizeResult> {
  const { data, error } = await createServiceClient().rpc('anonymize_user', { p_user_id: userId });
  if (error) throw new AccountDeletionError('anonymize_user');
  if (!ANONYMIZE_RESULTS.includes(data as AnonymizeResult)) {
    throw new AccountDeletionError('anonymize_user:unexpected');
  }
  return data as AnonymizeResult;
}

/**
 * Auth: apaga `user_metadata` (nome do cadastro), bane e faz soft delete.
 * Hard delete é impossível: `orders.user_id` é ON DELETE RESTRICT. O soft delete
 * do GoTrue mantém a linha (FK ok), ofusca email/telefone, apaga senha,
 * identidades, fatores MFA e sessões. Seguro repetir.
 */
export async function disableAuthUser(userId: string): Promise<void> {
  const { admin } = createServiceClient().auth;

  const current = await admin.getUserById(userId);
  if (current.error || !current.data.user) throw new AccountDeletionError('get_user');

  // O GoTrue faz merge do metadata: chave com `null` é removida (`{}` não apaga nada).
  const metadataKeys = Object.keys(current.data.user.user_metadata ?? {});
  const updated = await admin.updateUserById(userId, {
    ...(metadataKeys.length > 0
      ? { user_metadata: Object.fromEntries(metadataKeys.map((key) => [key, null])) }
      : {}),
    ban_duration: DELETED_ACCOUNT_BAN,
  });
  if (updated.error) throw new AccountDeletionError('update_user');

  const deleted = await admin.deleteUser(userId, true);
  if (deleted.error) throw new AccountDeletionError('soft_delete');
}
