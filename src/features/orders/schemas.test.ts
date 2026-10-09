import { describe, expect, it } from 'vitest';

import {
  manualSaleSchema,
  orderActionSchema,
  parseBrlToCents,
  parseOrderListParams,
} from './schemas';

describe('parseOrderListParams', () => {
  it('padrões e valores inválidos', () => {
    expect(parseOrderListParams({})).toEqual({
      q: '',
      page: 1,
      status: null,
      refundQueue: false,
    });
    expect(parseOrderListParams({ status: 'hack', pagina: '-3', q: ['x'] })).toMatchObject({
      status: null,
      page: 1,
      q: '',
    });
  });
  it('filtro=reembolso ignora status', () => {
    expect(parseOrderListParams({ filtro: 'reembolso', status: 'pending' })).toMatchObject({
      refundQueue: true,
      status: null,
    });
    expect(parseOrderListParams({ status: 'paid', pagina: '3', q: ' ana ' })).toMatchObject({
      status: 'paid',
      page: 3,
      q: 'ana',
    });
  });
});

describe('parseBrlToCents', () => {
  it.each([
    ['197', 19_700],
    ['197,00', 19_700],
    ['R$ 1.970,50', 197_050],
    ['197.5', 19_750],
    ['0,99', 99],
  ])('%s -> %i', (input, cents) => expect(parseBrlToCents(input)).toBe(cents));
  it.each(['', 'abc', '0', '-5', '1,234', '99999999', '1e3'])('rejeita %j', (input) =>
    expect(parseBrlToCents(input)).toBeNull(),
  );
});

describe('manualSaleSchema', () => {
  const courseId = '33333333-3333-4333-8333-333333333333';
  it('normaliza email e valor; valor vazio = preço do curso', () => {
    expect(manualSaleSchema.parse({ email: ' A@B.CO ', courseId, amount: '10,50' })).toEqual({
      email: 'a@b.co',
      courseId,
      amount: 1050,
    });
    expect(
      manualSaleSchema.parse({ email: 'a@b.co', courseId, amount: '' }).amount,
    ).toBeUndefined();
  });
  it('rejeita email, curso e valor inválidos', () => {
    expect(manualSaleSchema.safeParse({ email: 'x', courseId }).success).toBe(false);
    expect(manualSaleSchema.safeParse({ email: 'a@b.co', courseId: 'x' }).success).toBe(false);
    expect(manualSaleSchema.safeParse({ email: 'a@b.co', courseId, amount: 'x' }).success).toBe(
      false,
    );
  });
});

describe('orderActionSchema', () => {
  it('só aceita uuid e ignora campos extras', () => {
    const id = '33333333-3333-4333-8333-333333333333';
    expect(orderActionSchema.parse({ orderId: id, amount: 1 })).toEqual({ orderId: id });
    expect(orderActionSchema.safeParse({ orderId: '1' }).success).toBe(false);
  });
});
