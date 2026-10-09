import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const rpc = vi.fn();
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ rpc }) }));

import { listCourseStudents } from './queries';

const row = {
  enrollment_id: 'e1',
  user_id: 'u1',
  email: 'a@b.c',
  full_name: 'Ana',
  source: 'admin_grant',
  granted_at: '2026-09-01T00:00:00Z',
  revoked_at: null,
  lesson_count: 2,
  completed_count: 1,
  total_count: 41,
};

describe('listCourseStudents', () => {
  beforeEach(() => rpc.mockReset());

  it('chama a RPC com busca e offset da página', async () => {
    rpc.mockResolvedValue({ data: [row], error: null });
    const res = await listCourseStudents('c1', { q: 'ana', page: 3 });
    expect(rpc).toHaveBeenCalledWith('admin_course_students', {
      p_course_id: 'c1',
      p_search: 'ana',
      p_limit: 20,
      p_offset: 40,
    });
    expect(res.total).toBe(41);
    expect(res.rows[0]).toMatchObject({ userId: 'u1', progressPercent: 50 });
  });

  it('sem busca envia undefined; sem linhas total 0', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    const res = await listCourseStudents('c1', { q: '', page: 1 });
    expect(rpc.mock.calls[0]![1].p_search).toBeUndefined();
    expect(res).toEqual({ rows: [], total: 0 });
  });

  it('erro vira mensagem genérica', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(listCourseStudents('c1', { q: '', page: 1 })).rejects.toThrow(
      'Não foi possível carregar os alunos do curso.',
    );
  });
});
