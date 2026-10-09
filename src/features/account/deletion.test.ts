import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const rpc = vi.fn();
const getUserById = vi.fn();
const updateUserById = vi.fn();
const deleteUser = vi.fn();
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    rpc: (...a: unknown[]) => rpc(...a),
    auth: {
      admin: {
        getUserById: (...a: unknown[]) => getUserById(...a),
        updateUserById: (...a: unknown[]) => updateUserById(...a),
        deleteUser: (...a: unknown[]) => deleteUser(...a),
      },
    },
  }),
}));

import {
  AccountDeletionError,
  DELETED_ACCOUNT_BAN,
  anonymizeUser,
  disableAuthUser,
} from './deletion';

const USER = '22222222-2222-4222-8222-222222222222';

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ data: 'anonymized', error: null });
  getUserById.mockResolvedValue({
    data: { user: { id: USER, user_metadata: { full_name: 'Ana', name: 'Ana S' } } },
    error: null,
  });
  updateUserById.mockResolvedValue({ data: { user: {} }, error: null });
  deleteUser.mockResolvedValue({ data: {}, error: null });
});

describe('anonymizeUser', () => {
  it('chama a RPC com o id e devolve o resultado', async () => {
    await expect(anonymizeUser(USER)).resolves.toBe('anonymized');
    expect(rpc).toHaveBeenCalledWith('anonymize_user', { p_user_id: USER });
  });

  it('erro ou resultado desconhecido lança AccountDeletionError', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'x' } });
    await expect(anonymizeUser(USER)).rejects.toBeInstanceOf(AccountDeletionError);
    rpc.mockResolvedValueOnce({ data: 'weird', error: null });
    await expect(anonymizeUser(USER)).rejects.toBeInstanceOf(AccountDeletionError);
  });
});

describe('disableAuthUser', () => {
  it('remove cada chave do metadata, bane e faz soft delete (nessa ordem)', async () => {
    await disableAuthUser(USER);
    expect(updateUserById).toHaveBeenCalledWith(USER, {
      user_metadata: { full_name: null, name: null },
      ban_duration: DELETED_ACCOUNT_BAN,
    });
    expect(deleteUser).toHaveBeenCalledWith(USER, true);
    const [updatedAt] = updateUserById.mock.invocationCallOrder;
    const [deletedAt] = deleteUser.mock.invocationCallOrder;
    expect(updatedAt).toBeLessThan(deletedAt ?? 0);
  });

  it('metadata vazio: só bane', async () => {
    getUserById.mockResolvedValue({ data: { user: { id: USER, user_metadata: {} } }, error: null });
    await disableAuthUser(USER);
    expect(updateUserById).toHaveBeenCalledWith(USER, { ban_duration: DELETED_ACCOUNT_BAN });
  });

  it.each([
    [
      'get_user',
      () => getUserById.mockResolvedValue({ data: { user: null }, error: { message: 'x' } }),
    ],
    [
      'update_user',
      () => updateUserById.mockResolvedValue({ data: null, error: { message: 'x' } }),
    ],
    ['soft_delete', () => deleteUser.mockResolvedValue({ data: null, error: { message: 'x' } })],
  ])('falha em %s lança com o passo', async (step, arrange) => {
    arrange();
    await expect(disableAuthUser(USER)).rejects.toMatchObject({ step });
  });

  it('falha no ban não chega ao soft delete', async () => {
    updateUserById.mockResolvedValue({ data: null, error: { message: 'x' } });
    await expect(disableAuthUser(USER)).rejects.toBeInstanceOf(AccountDeletionError);
    expect(deleteUser).not.toHaveBeenCalled();
  });
});
