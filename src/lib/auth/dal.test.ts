import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

// redirect()/notFound() do Next lançam; imitamos com erros identificáveis.
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

const getClaims = vi.fn();
const rolesEq = vi.fn();
const profileMaybeSingle = vi.fn();
const from = vi.fn((table: string) => {
  if (table === 'user_roles') return { select: () => ({ eq: rolesEq }) };
  if (table === 'profiles') {
    return { select: () => ({ eq: () => ({ maybeSingle: profileMaybeSingle }) }) };
  }
  throw new Error(`tabela inesperada: ${table}`);
});
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getClaims }, from })),
}));

import {
  getCurrentProfile,
  getCurrentRole,
  getCurrentUser,
  requireAdmin,
  requireUser,
} from './dal';

function signedIn(extraClaims: Record<string, unknown> = {}) {
  getClaims.mockResolvedValue({
    data: { claims: { sub: 'user-1', email: 'ana@exemplo.com', ...extraClaims } },
    error: null,
  });
}

function anonymous() {
  getClaims.mockResolvedValue({ data: null, error: null });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getCurrentUser', () => {
  it('devolve id e email do JWT verificado', async () => {
    signedIn();
    await expect(getCurrentUser()).resolves.toEqual({ id: 'user-1', email: 'ana@exemplo.com' });
  });

  it('devolve null para anônimo ou erro do getClaims', async () => {
    anonymous();
    await expect(getCurrentUser()).resolves.toBeNull();
    getClaims.mockResolvedValue({ data: null, error: new Error('jwt inválido') });
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it('exige sub não vazio', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: '' } }, error: null });
    await expect(getCurrentUser()).resolves.toBeNull();
  });
});

describe('getCurrentRole', () => {
  it('anônimo -> null, sem consultar o banco', async () => {
    anonymous();
    await expect(getCurrentRole()).resolves.toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it('lê user_roles do banco', async () => {
    signedIn();
    rolesEq.mockResolvedValue({ data: [{ role: 'admin' }], error: null });
    await expect(getCurrentRole()).resolves.toBe('admin');
    expect(from).toHaveBeenCalledWith('user_roles');
    expect(rolesEq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('sem linha em user_roles -> student', async () => {
    signedIn();
    rolesEq.mockResolvedValue({ data: [], error: null });
    await expect(getCurrentRole()).resolves.toBe('student');
  });

  it('ignora papel declarado em metadata/claims', async () => {
    signedIn({
      role: 'admin',
      app_role: 'admin',
      user_metadata: { role: 'admin' },
      app_metadata: { role: 'admin' },
    });
    rolesEq.mockResolvedValue({ data: [{ role: 'student' }], error: null });
    await expect(getCurrentRole()).resolves.toBe('student');
  });

  it('erro do banco lança (fail closed), não vira student', async () => {
    signedIn();
    rolesEq.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(getCurrentRole()).rejects.toThrow();
  });
});

describe('getCurrentProfile', () => {
  it('usa full_name do perfil', async () => {
    signedIn();
    profileMaybeSingle.mockResolvedValue({
      data: { id: 'user-1', full_name: ' Ana Souza ', avatar_url: null },
      error: null,
    });
    await expect(getCurrentProfile()).resolves.toEqual({
      id: 'user-1',
      fullName: 'Ana Souza',
      avatarUrl: null,
    });
  });

  it('perfil ausente ou vazio degrada para o email', async () => {
    signedIn();
    profileMaybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(getCurrentProfile()).resolves.toMatchObject({ fullName: 'ana@exemplo.com' });
  });
});

describe('requireUser', () => {
  it('anônimo -> redirect /entrar', async () => {
    anonymous();
    await expect(requireUser()).rejects.toThrow('NEXT_REDIRECT:/entrar');
  });

  it('logado -> usuário', async () => {
    signedIn();
    await expect(requireUser()).resolves.toEqual({ id: 'user-1', email: 'ana@exemplo.com' });
  });
});

describe('requireAdmin', () => {
  it('anônimo -> redirect /entrar', async () => {
    anonymous();
    await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT:/entrar');
  });

  it('student -> notFound', async () => {
    signedIn();
    rolesEq.mockResolvedValue({ data: [{ role: 'student' }], error: null });
    await expect(requireAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('student com metadata de admin -> notFound', async () => {
    signedIn({ user_metadata: { role: 'admin' }, app_metadata: { role: 'admin' } });
    rolesEq.mockResolvedValue({ data: [], error: null });
    await expect(requireAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('admin -> ok', async () => {
    signedIn();
    rolesEq.mockResolvedValue({ data: [{ role: 'admin' }], error: null });
    await expect(requireAdmin()).resolves.toEqual({ id: 'user-1', email: 'ana@exemplo.com' });
  });
});
