import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

const requireUser = vi.fn();
vi.mock('@/lib/auth/dal', () => ({ requireUser: () => requireUser(), requireAdmin: vi.fn() }));
vi.mock('@/features/catalog/queries', () => ({ getPublishedCourse: vi.fn() }));
vi.mock('@/lib/payments/abacatepay', () => ({
  createPixCharge: vi.fn(),
  isPaymentsConfigured: vi.fn(),
  PaymentProviderError: class extends Error {},
}));
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }));

const eqs: [string, unknown][] = [];
let result: { data: unknown; error: unknown } = { data: null, error: null };
const builder: Record<string, unknown> = {};
builder.select = () => builder;
builder.eq = (col: string, val: unknown) => {
  eqs.push([col, val]);
  return builder;
};
builder.maybeSingle = () => Promise.resolve(result);
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from: () => builder })),
}));

import { getOrderStatus } from './actions';

const USER = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', email: 'ana@exemplo.com' };
const ORDER = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
  eqs.length = 0;
  result = { data: null, error: null };
  requireUser.mockReset();
  requireUser.mockResolvedValue(USER);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('getOrderStatus', () => {
  it('rejeita anônimo antes de ler qualquer coisa', async () => {
    requireUser.mockRejectedValue(new Error('NEXT_REDIRECT /entrar'));
    await expect(getOrderStatus({ orderId: ORDER })).rejects.toThrow('NEXT_REDIRECT');
    expect(eqs).toEqual([]);
  });

  it('filtra pelo id do pedido e pelo user_id da sessão e devolve só status/validade', async () => {
    result = {
      data: { status: 'paid', expires_at: '2026-10-08T21:00:00.000Z', pix_br_code: 'segredo' },
      error: null,
    };
    const res = await getOrderStatus({ orderId: ORDER });
    expect(eqs).toEqual([
      ['id', ORDER],
      ['user_id', USER.id],
    ]);
    expect(res).toEqual({
      ok: true,
      data: { status: 'paid', expiresAt: '2026-10-08T21:00:00.000Z' },
    });
  });

  it('pedido de outro usuário (sem linha) não revela existência', async () => {
    const res = await getOrderStatus({ orderId: ORDER });
    expect(res).toMatchObject({ ok: false, error: 'Pedido não encontrado.' });
  });

  it('rejeita id inválido e ignora user_id vindo do input', async () => {
    expect(await getOrderStatus({ orderId: 'nao-e-uuid' })).toMatchObject({ ok: false });
    await getOrderStatus({ orderId: ORDER, userId: 'outro' });
    expect(eqs).not.toContainEqual(['user_id', 'outro']);
  });

  it('erro do banco vira mensagem genérica', async () => {
    result = { data: null, error: { code: 'XX000' } };
    expect(await getOrderStatus({ orderId: ORDER })).toMatchObject({ ok: false });
  });
});
