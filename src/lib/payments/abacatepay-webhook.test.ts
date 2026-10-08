// @vitest-environment node
import { createHmac } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  ABACATEPAY_PUBLIC_HMAC_KEY,
  safeEqual,
  signWebhookBody,
  verifyWebhookSignature,
} from './abacatepay-webhook';

describe('abacatepay-webhook', () => {
  it('assinatura = base64(HMAC-SHA256(chave pública, corpo bruto UTF-8))', () => {
    const raw = '{"event":"transparent.completed","data":{"x":"ção"}}';
    const expected = createHmac('sha256', ABACATEPAY_PUBLIC_HMAC_KEY)
      .update(raw, 'utf8')
      .digest('base64');
    expect(signWebhookBody(raw)).toBe(expected);
    expect(verifyWebhookSignature(raw, expected)).toBe(true);
  });

  it('recusa assinatura ausente, de outro corpo ou de outro tamanho', () => {
    const raw = '{"a":1}';
    expect(verifyWebhookSignature(raw, null)).toBe(false);
    expect(verifyWebhookSignature(raw, '')).toBe(false);
    expect(verifyWebhookSignature(raw, signWebhookBody('{"a":2}'))).toBe(false);
    expect(verifyWebhookSignature(raw, 'abc')).toBe(false);
  });

  it('safeEqual não lança com comprimentos diferentes', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abcd')).toBe(false);
    expect(safeEqual('', 'x')).toBe(false);
  });
});
