// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const SECRET = 'whsec_route_test_secret';
vi.mock('@/lib/env/server', () => ({
  getPaymentsEnv: () => ({ ABACATEPAY_API_KEY: 'abc_dev_FAKE', ABACATEPAY_WEBHOOK_SECRET: SECRET }),
}));
const createServiceClient = vi.fn(() => {
  throw new Error('o banco não deve ser tocado nestes casos');
});
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => createServiceClient() }));

import { signWebhookBody } from '@/lib/payments/abacatepay-webhook';

import { GET, POST } from './route';

const URL_BASE = 'https://app.test/api/webhooks/abacatepay';

function post(
  body: BodyInit,
  { secret = SECRET, signature }: { secret?: string; signature?: string } = {},
) {
  return new Request(`${URL_BASE}?webhookSecret=${encodeURIComponent(secret)}`, {
    method: 'POST',
    body,
    headers: signature ? { 'x-webhook-signature': signature } : {},
    // @ts-expect-error -- `duplex` é exigido pelo undici para corpo em stream.
    duplex: 'half',
  });
}

beforeEach(() => {
  createServiceClient.mockClear();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('/api/webhooks/abacatepay', () => {
  it('GET → 405 com Allow: POST', async () => {
    const res = GET();
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
  });

  it('POST com segredo errado → 401, sem cache', async () => {
    const res = await POST(post('{}', { secret: 'outro_segredo_qualquer' }));
    expect(res.status).toBe(401);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it('POST com corpo em stream acima de 64 KB → 413', async () => {
    const chunk = new TextEncoder().encode('x'.repeat(16 * 1024));
    let sent = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent++ < 5) controller.enqueue(chunk);
        else controller.close();
      },
    });
    const res = await POST(post(stream));
    expect(res.status).toBe(413);
  });

  it('POST com assinatura válida e JSON inválido → 400', async () => {
    const raw = '{"event":';
    const res = await POST(post(raw, { signature: signWebhookBody(raw) }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, result: 'invalid_payload' });
  });

  it('POST com assinatura inválida → 401', async () => {
    const res = await POST(post('{"event":"transparent.completed"}', { signature: 'AAAA' }));
    expect(res.status).toBe(401);
  });
});
