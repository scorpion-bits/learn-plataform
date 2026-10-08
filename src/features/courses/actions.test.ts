import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

class NotFoundError extends Error {}
const requireAdmin = vi.fn();
vi.mock('@/lib/auth/dal', () => ({
  requireAdmin: () => requireAdmin(),
  requireUser: vi.fn(),
}));

// Builder encadeável e "thenable" que resolve para `result`.
let result: { data: unknown; error: unknown };
const calls: { table: string; op: string; arg?: unknown }[] = [];
const remove = vi.fn(async () => ({ data: null, error: null }));
function builder(table: string) {
  const b: Record<string, unknown> = {};
  for (const op of ['insert', 'update', 'select', 'eq']) {
    b[op] = (arg?: unknown) => {
      calls.push({ table, op, arg });
      return b;
    };
  }
  b.single = () => Promise.resolve(result);
  b.maybeSingle = () => Promise.resolve(result);
  b.then = (res: (v: unknown) => unknown) => Promise.resolve(result).then(res);
  return b;
}
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: (t: string) => builder(t),
    storage: { from: () => ({ remove }) },
  })),
}));

import { createCourse, setCourseStatus, updateCourse } from './actions';

const ID = '11111111-1111-4111-8111-111111111111';
const input = { title: 'Godot', slug: 'godot', level: 'beginner', price: '197,00' };

beforeEach(() => {
  vi.clearAllMocks();
  calls.length = 0;
  requireAdmin.mockResolvedValue({ id: 'admin-1', email: 'a@b.c' });
  result = { data: { id: ID }, error: null };
});

describe('autorização', () => {
  it('não-admin é rejeitado antes de tocar no banco', async () => {
    requireAdmin.mockRejectedValue(new NotFoundError('notFound'));
    await expect(createCourse(input)).rejects.toBeInstanceOf(NotFoundError);
    await expect(updateCourse({ ...input, id: ID })).rejects.toBeInstanceOf(NotFoundError);
    await expect(setCourseStatus({ id: ID, status: 'published' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(calls).toHaveLength(0);
  });
});

describe('createCourse', () => {
  it('insere rascunho com preço em centavos e created_by', async () => {
    const res = await createCourse(input);
    expect(res).toEqual({ ok: true, data: { id: ID } });
    expect(calls.find((c) => c.op === 'insert')?.arg).toMatchObject({
      price_cents: 19700,
      status: 'draft',
      created_by: 'admin-1',
    });
  });
  it('input inválido não chega ao banco', async () => {
    const res = await createCourse({ ...input, slug: 'Slug Ruim' });
    expect(res).toMatchObject({ ok: false, fieldErrors: { slug: expect.any(Array) } });
    expect(calls).toHaveLength(0);
  });
  it('slug duplicado vira erro no campo', async () => {
    result = { data: null, error: { code: '23505', message: 'duplicate' } };
    const res = await createCourse(input);
    expect(res).toMatchObject({ ok: false, fieldErrors: { slug: [expect.any(String)] } });
  });
});

describe('setCourseStatus', () => {
  it('bloqueia publicação incompleta com mensagem do que falta', async () => {
    result = {
      data: { title: 'x', price_cents: 0, cover_path: null, lessons: [{ count: 0 }] },
      error: null,
    };
    const res = await setCourseStatus({ id: ID, status: 'published' });
    expect(res).toMatchObject({ ok: false });
    expect(!res.ok && res.error).toContain('capa');
    expect(calls.some((c) => c.op === 'update')).toBe(false);
  });
  it('publica quando completo', async () => {
    result = {
      data: { id: ID, title: 'x', price_cents: 100, cover_path: 'p', lessons: [{ count: 2 }] },
      error: null,
    };
    const res = await setCourseStatus({ id: ID, status: 'published' });
    expect(res).toMatchObject({ ok: true, data: { status: 'published' } });
    expect(calls.find((c) => c.op === 'update')?.arg).toEqual({ status: 'published' });
  });
  it('despublicar não exige os requisitos', async () => {
    const res = await setCourseStatus({ id: ID, status: 'draft' });
    expect(res.ok).toBe(true);
  });
});

describe('updateCourse', () => {
  it('remove a capa antiga quando trocada', async () => {
    result = { data: { cover_path: 'courses/old.png', id: ID }, error: null };
    const res = await updateCourse({ ...input, id: ID, coverPath: '' });
    expect(res.ok).toBe(true);
    expect(remove).toHaveBeenCalledWith(['courses/old.png']);
  });
});
