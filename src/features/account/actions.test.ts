import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const requireUser = vi.fn();
vi.mock('@/lib/auth/dal', () => ({
  requireUser: () => requireUser(),
  requireAdmin: vi.fn(),
}));

let updatePayload: Record<string, unknown> | null;
let updateEq: [string, unknown] | null;
let profileResult: { data: unknown; error: unknown };
const updateUser = vi.fn();
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
    auth: { updateUser: (...a: unknown[]) => updateUser(...a) },
  })),
}));

import { changePassword, updateProfile } from './actions';

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
