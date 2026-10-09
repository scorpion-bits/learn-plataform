import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const requireUser = vi.fn();
const getCurrentRole = vi.fn();
const calls: string[] = [];
vi.mock('@/lib/auth/dal', () => ({
  requireUser: () => requireUser(),
  requireAdmin: vi.fn(),
  getCurrentRole: () => {
    calls.push('getCurrentRole');
    return getCurrentRole();
  },
}));

const anonymizeUser = vi.fn();
const disableAuthUser = vi.fn();
vi.mock('./deletion', async () => {
  class AccountDeletionError extends Error {
    constructor(readonly step: string) {
      super(step);
    }
  }
  return {
    AccountDeletionError,
    anonymizeUser: (id: string) => {
      calls.push('anonymizeUser');
      return anonymizeUser(id);
    },
    disableAuthUser: (id: string) => {
      calls.push('disableAuthUser');
      return disableAuthUser(id);
    },
  };
});

let updatePayload: Record<string, unknown> | null;
let updateEq: [string, unknown] | null;
let profileResult: { data: unknown; error: unknown };
const updateUser = vi.fn();
const signOut = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: (table: string) => {
      expect(table).toBe('profiles');
      const b: Record<string, unknown> = {};
      b.update = (payload: Record<string, unknown>) => {
        updatePayload = payload;
        return b;
      };
      b.eq = (col: string, val: unknown) => {
        updateEq = [col, val];
        return b;
      };
      b.select = () => b;
      b.maybeSingle = () => Promise.resolve(profileResult);
      return b;
    },
    auth: {
      updateUser: (...a: unknown[]) => updateUser(...a),
      signOut: (...a: unknown[]) => {
        calls.push('signOut');
        return signOut(...a);
      },
    },
  })),
}));

import { changePassword, deleteMyAccount, updateProfile } from './actions';
import { AccountDeletionError } from './deletion';

const USER = '22222222-2222-4222-8222-222222222222';

function form(values: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  updatePayload = null;
  updateEq = null;
  profileResult = { data: { id: USER }, error: null };
  updateUser.mockResolvedValue({ error: null });
  requireUser.mockResolvedValue({ id: USER, email: 'u@b.c' });
  calls.length = 0;
  getCurrentRole.mockResolvedValue('student');
  anonymizeUser.mockResolvedValue('anonymized');
  disableAuthUser.mockResolvedValue(undefined);
  signOut.mockResolvedValue({ error: null });
});

describe('updateProfile', () => {
  it('não autenticado: o guard rejeita antes de qualquer escrita', async () => {
    requireUser.mockRejectedValue(new Error('NEXT_REDIRECT'));
    await expect(updateProfile(form({ full_name: 'Ana' }))).rejects.toThrow('NEXT_REDIRECT');
    expect(updatePayload).toBeNull();
  });

  it('grava só full_name/phone/tax_id, na linha do próprio usuário', async () => {
    const r = await updateProfile(
      form({
        full_name: 'Ana Souza',
        phone: '(11) 94002-8922',
        tax_id: '111.444.777-35',
        id: 'outro-usuario',
        role: 'admin',
        avatar_url: 'http://x',
      }),
    );
    expect(r.ok).toBe(true);
    expect(updatePayload).toEqual({
      full_name: 'Ana Souza',
      phone: '11940028922',
      tax_id: '11144477735',
    });
    expect(updateEq).toEqual(['id', USER]);
  });

  it('entrada inválida não escreve e devolve erros por campo', async () => {
    const r = await updateProfile(form({ full_name: 'Ana', tax_id: '123' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors?.tax_id).toBeDefined();
    expect(updatePayload).toBeNull();
  });

  it('falha do banco vira erro genérico em pt-BR', async () => {
    profileResult = { data: null, error: { message: 'boom' } };
    const r = await updateProfile(form({ full_name: 'Ana' }));
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining('Não foi possível') });
  });
});

describe('changePassword', () => {
  it('não autenticado: rejeita sem chamar o Auth', async () => {
    requireUser.mockRejectedValue(new Error('NEXT_REDIRECT'));
    await expect(
      changePassword(form({ password: 'senha-forte-1', confirm_password: 'senha-forte-1' })),
    ).rejects.toThrow('NEXT_REDIRECT');
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('senha curta ou divergente não chama o Auth', async () => {
    const short = await changePassword(form({ password: 'curta', confirm_password: 'curta' }));
    const diff = await changePassword(
      form({ password: 'senha-forte-1', confirm_password: 'senha-forte-2' }),
    );
    expect(short.ok).toBe(false);
    expect(diff.ok).toBe(false);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('sucesso envia só a senha', async () => {
    const r = await changePassword(
      form({ password: 'senha-forte-1', confirm_password: 'senha-forte-1' }),
    );
    expect(r.ok).toBe(true);
    expect(updateUser).toHaveBeenCalledWith({ password: 'senha-forte-1' });
  });

  it.each([
    ['same_password', 'diferente da atual'],
    ['reauthentication_needed', 'Saia, entre novamente'],
    ['weak_password', 'mais forte'],
    ['unexpected', 'Não foi possível trocar'],
  ])('erro %s -> mensagem pt-BR', async (code, text) => {
    updateUser.mockResolvedValue({ error: { code } });
    const r = await changePassword(
      form({ password: 'senha-forte-1', confirm_password: 'senha-forte-1' }),
    );
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining(text) });
  });
});

describe('deleteMyAccount', () => {
  it('não autenticado: o guard rejeita antes de qualquer chamada', async () => {
    requireUser.mockRejectedValue(new Error('NEXT_REDIRECT'));
    await expect(deleteMyAccount(form({ email: 'u@b.c' }))).rejects.toThrow('NEXT_REDIRECT');
    expect(calls).toEqual([]);
  });

  it('sem e-mail: erro de validação, nada é chamado', async () => {
    const r = await deleteMyAccount(form({}));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors?.email).toBeDefined();
    expect(calls).toEqual([]);
  });

  it('e-mail divergente é recusado sem tocar no banco', async () => {
    const r = await deleteMyAccount(form({ email: 'outra@b.c' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors?.email?.[0]).toContain('e-mail desta conta');
    expect(calls).toEqual([]);
  });

  it('e-mail da sessão vazio nunca confirma', async () => {
    requireUser.mockResolvedValue({ id: USER, email: '' });
    const r = await deleteMyAccount(form({ email: ' ' }));
    expect(r.ok).toBe(false);
    expect(calls).toEqual([]);
  });

  it('admin é recusado antes de anonimizar', async () => {
    getCurrentRole.mockResolvedValue('admin');
    const r = await deleteMyAccount(form({ email: 'u@b.c' }));
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining('administrador') });
    expect(calls).toEqual(['getCurrentRole']);
  });

  it.each([
    ['is_admin', 'administrador'],
    ['refund_pending', 'reembolso em andamento'],
    ['payment_pending', 'pagamento PIX em aberto'],
    ['not_found', 'Tente novamente'],
  ])('banco devolve %s: recusa e não mexe no Auth', async (result, text) => {
    anonymizeUser.mockResolvedValue(result);
    const r = await deleteMyAccount(form({ email: 'u@b.c' }));
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining(text) });
    expect(calls).toEqual(['getCurrentRole', 'anonymizeUser']);
  });

  it('sucesso: ordem banco -> Auth -> sair, sempre com o id da sessão', async () => {
    const r = await deleteMyAccount(form({ email: '  U@B.C ', user_id: 'outro-usuario' }));
    expect(r).toEqual({ ok: true, data: { message: 'Sua conta foi excluída.' } });
    expect(calls).toEqual(['getCurrentRole', 'anonymizeUser', 'disableAuthUser', 'signOut']);
    expect(anonymizeUser).toHaveBeenCalledWith(USER);
    expect(disableAuthUser).toHaveBeenCalledWith(USER);
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('repetição após falha parcial (already_anonymized) conclui no Auth', async () => {
    anonymizeUser.mockResolvedValue('already_anonymized');
    const r = await deleteMyAccount(form({ email: 'u@b.c' }));
    expect(r.ok).toBe(true);
    expect(calls).toEqual(['getCurrentRole', 'anonymizeUser', 'disableAuthUser', 'signOut']);
  });

  it('falha no Auth: mensagem para tentar de novo, sessão mantida', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    disableAuthUser.mockRejectedValue(new AccountDeletionError('soft_delete'));
    const r = await deleteMyAccount(form({ email: 'u@b.c' }));
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining('Tente novamente') });
    expect(calls).not.toContain('signOut');
    expect(spy).toHaveBeenCalledWith('[account] delete failed', {
      userId: USER,
      step: 'soft_delete',
    });
    spy.mockRestore();
  });

  it('falha ao limpar cookies não desfaz a exclusão', async () => {
    signOut.mockRejectedValue(new Error('network'));
    const r = await deleteMyAccount(form({ email: 'u@b.c' }));
    expect(r.ok).toBe(true);
  });
});
