import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('server-only', () => ({}));

const requireUser = vi.fn();
const requireAdmin = vi.fn();
vi.mock('./dal', () => ({ requireUser: () => requireUser(), requireAdmin: () => requireAdmin() }));

import { ActionError, adminAction, userAction } from './actions';

const user = { id: 'u1', email: 'a@b.com' };
const schema = z.object({ title: z.string().min(3) });

beforeEach(() => {
  vi.clearAllMocks();
  requireUser.mockResolvedValue(user);
  requireAdmin.mockResolvedValue(user);
});

describe('userAction', () => {
  it('guard -> valida -> handler com contexto', async () => {
    const handler = vi.fn(async (input: { title: string }) => ({ echoed: input.title }));
    const result = await userAction(schema, handler)({ title: 'Godot' });
    expect(result).toEqual({ ok: true, data: { echoed: 'Godot' } });
    expect(handler).toHaveBeenCalledWith({ title: 'Godot' }, { user });
  });

  it('input inválido -> fieldErrors e handler não roda', async () => {
    const handler = vi.fn();
    const result = await userAction(schema, handler)({ title: 'x' });
    expect(result).toMatchObject({ ok: false, fieldErrors: { title: expect.any(Array) } });
    expect(handler).not.toHaveBeenCalled();
  });

  it('aceita FormData', async () => {
    const fd = new FormData();
    fd.set('title', 'Pixel art');
    fd.set('$ACTION_ID_abc', '1');
    const result = await userAction(schema, async (i) => i.title)(fd);
    expect(result).toEqual({ ok: true, data: 'Pixel art' });
  });

  it('anônimo: o guard barra antes de ler o input', async () => {
    requireUser.mockRejectedValue(new Error('NEXT_REDIRECT:/entrar'));
    const handler = vi.fn();
    await expect(userAction(schema, handler)({ title: 'Godot' })).rejects.toThrow('NEXT_REDIRECT');
    expect(handler).not.toHaveBeenCalled();
  });

  it('ActionError vira resultado; outros erros propagam', async () => {
    const expected = await userAction(schema, async () => {
      throw new ActionError('Slug já existe', { slug: ['Já em uso'] });
    })({ title: 'Godot' });
    expect(expected).toEqual({
      ok: false,
      error: 'Slug já existe',
      fieldErrors: { slug: ['Já em uso'] },
    });

    await expect(
      userAction(schema, async () => {
        throw new Error('NEXT_REDIRECT:/x');
      })({ title: 'Godot' }),
    ).rejects.toThrow('NEXT_REDIRECT');
  });
});

describe('adminAction', () => {
  it('usa requireAdmin, não requireUser', async () => {
    await adminAction(schema, async () => 1)({ title: 'Godot' });
    expect(requireAdmin).toHaveBeenCalledTimes(1);
    expect(requireUser).not.toHaveBeenCalled();
  });

  it('não-admin (notFound) barra antes do handler', async () => {
    requireAdmin.mockRejectedValue(new Error('NEXT_NOT_FOUND'));
    const handler = vi.fn();
    await expect(adminAction(schema, handler)({ title: 'Godot' })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
    expect(handler).not.toHaveBeenCalled();
  });
});
