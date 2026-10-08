import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

class NotFoundError extends Error {}
const requireAdmin = vi.fn();
vi.mock('@/lib/auth/dal', () => ({
  requireAdmin: () => requireAdmin(),
  requireUser: vi.fn(),
}));

let result: { data: unknown; error: unknown };
let queue: { data: unknown; error: unknown }[] = [];
const next = () => queue.shift() ?? result;
const calls: { table: string; op: string; args: unknown[] }[] = [];
function builder(table: string) {
  const b: Record<string, unknown> = {};
  for (const op of ['insert', 'update', 'select', 'eq', 'is']) {
    b[op] = (...args: unknown[]) => {
      calls.push({ table, op, args });
      return b;
    };
  }
  b.maybeSingle = () => Promise.resolve(next());
  b.then = (res: (v: unknown) => unknown) => Promise.resolve(next()).then(res);
  return b;
}
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from: (t: string) => builder(t) })),
}));

import { grantCourse, removeAssignment, revokePurchase } from './actions';

const ID = '11111111-1111-4111-8111-111111111111';
const COURSE = '22222222-2222-4222-8222-222222222222';
const ENR = '33333333-3333-4333-8333-333333333333';

beforeEach(() => {
  vi.clearAllMocks();
  calls.length = 0;
  queue = [];
  requireAdmin.mockResolvedValue({ id: 'admin-1', email: 'a@b.c' });
  result = { data: [{ id: ENR }], error: null };
});

const ops = (op: string) => calls.filter((c) => c.op === op);

describe('autorização', () => {
  it('não-admin é rejeitado antes de tocar no banco', async () => {
    requireAdmin.mockRejectedValue(new NotFoundError('notFound'));
    await expect(grantCourse({ userId: ID, courseId: COURSE })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(
      removeAssignment({ enrollmentId: ENR, userId: ID, reason: 'teste' }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      revokePurchase({ enrollmentId: ENR, userId: ID, reason: 'fraude' }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(calls).toHaveLength(0);
  });
});

describe('grantCourse', () => {
  it('granted_by vem da sessão, não do input', async () => {
    result = { data: { status: 'published' }, error: null };
    const res = await grantCourse({
      userId: ID,
      courseId: COURSE,
      granted_by: 'hacker',
      grantedBy: 'hacker',
    });
    expect(res.ok).toBe(true);
    expect(ops('insert')[0]!.args[0]).toEqual({
      user_id: ID,
      course_id: COURSE,
      source: 'admin_grant',
      granted_by: 'admin-1',
    });
  });

  it('recusa curso em rascunho', async () => {
    result = { data: { status: 'draft' }, error: null };
    const res = await grantCourse({ userId: ID, courseId: COURSE });
    expect(res.ok).toBe(false);
    expect(ops('insert')).toHaveLength(0);
  });

  it('atribuição duplicada vira erro de campo', async () => {
    queue = [
      { data: { status: 'archived' }, error: null },
      { data: null, error: { code: '23505' } },
    ];
    const res = await grantCourse({ userId: ID, courseId: COURSE });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.fieldErrors?.courseId).toBeDefined();
  });
});

describe('removeAssignment', () => {
  it('exige motivo', async () => {
    const res = await removeAssignment({ enrollmentId: ENR, userId: ID, reason: '   ' });
    expect(res.ok).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it('só atualiza matrículas admin_grant ativas, nunca purchase', async () => {
    const res = await removeAssignment({ enrollmentId: ENR, userId: ID, reason: 'fim do teste' });
    expect(res.ok).toBe(true);
    const eqs = ops('eq').map((c) => c.args);
    expect(eqs).toContainEqual(['source', 'admin_grant']);
    expect(eqs).not.toContainEqual(['source', 'purchase']);
    expect(ops('is')[0]!.args).toEqual(['revoked_at', null]);
    expect(ops('update')[0]!.args[0]).toMatchObject({
      revoked_by: 'admin-1',
      revoke_reason: 'fim do teste',
    });
  });

  it('id de uma compra não casa nenhuma linha -> erro, nada revogado', async () => {
    result = { data: [], error: null };
    const res = await removeAssignment({ enrollmentId: ENR, userId: ID, reason: 'tentativa' });
    expect(res.ok).toBe(false);
  });
});

describe('revokePurchase', () => {
  it('exige motivo e só atua em purchase', async () => {
    expect((await revokePurchase({ enrollmentId: ENR, userId: ID, reason: '' })).ok).toBe(false);
    expect(calls).toHaveLength(0);
    const res = await revokePurchase({
      enrollmentId: ENR,
      userId: ID,
      reason: 'fraude confirmada',
    });
    expect(res.ok).toBe(true);
    const eqs = ops('eq').map((c) => c.args);
    expect(eqs).toContainEqual(['source', 'purchase']);
    expect(eqs).not.toContainEqual(['source', 'admin_grant']);
  });
});
