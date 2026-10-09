import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const getPaymentsEnv = vi.fn();
vi.mock('@/lib/env/server', () => ({ getPaymentsEnv: () => getPaymentsEnv() }));

import {
  PROVIDER_TIMEOUT_MS,
  PaymentProviderError,
  createPixCharge,
  getPixStatus,
  isPaymentsConfigured,
  refundPixCharge,
} from './abacatepay';

const KEY = 'abc_dev_FAKE_KEY_for_tests';
const ORDER = '11111111-1111-4111-8111-111111111111';

const input = {
  orderId: ORDER,
  amountCents: 4990,
  description: 'Curso: Godot do zero',
  customer: {
    name: 'Ana Souza',
    email: 'ana@exemplo.com',
    taxId: '11144477735',
    cellphone: '11940028922',
  },
  expiresInSeconds: 3600,
  metadata: { courseId: 'c1' },
};

const okCharge = {
  data: {
    id: 'pix_char_abc123',
    amount: 4990,
    status: 'PENDING',
    devMode: true,
    brCode: '00020160014BR.GOV.BCB.PIX',
    brCodeBase64: 'data:image/png;base64,iVBORw0KG==',
    platformFee: 80,
    expiresAt: '2026-10-08T19:38:28.573Z',
    customer: { taxId: '***' },
  },
  success: true,
  error: null,
};

const fetchMock = vi.fn();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

async function expectCode(promise: Promise<unknown>, code: string) {
  const err = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(PaymentProviderError);
  expect((err as PaymentProviderError).code).toBe(code);
  // Nunca vaza a chave nem o CPF na mensagem.
  expect((err as Error).message).not.toContain(KEY);
  expect((err as Error).message).not.toContain('11144477735');
  expect((err as Error).message).not.toContain('111.444.777-35');
  return err as PaymentProviderError;
}

beforeEach(() => {
  vi.clearAllMocks();
  getPaymentsEnv.mockReturnValue({ ABACATEPAY_API_KEY: KEY, ABACATEPAY_WEBHOOK_SECRET: 's' });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('createPixCharge', () => {
  it('envia o contrato v2 e devolve os campos usados', async () => {
    fetchMock.mockResolvedValue(json(okCharge));
    const charge = await createPixCharge(input);

    expect(charge).toEqual({
      billingId: 'pix_char_abc123',
      status: 'PENDING',
      brCode: '00020160014BR.GOV.BCB.PIX',
      brCodeBase64: 'data:image/png;base64,iVBORw0KG==',
      expiresAt: '2026-10-08T19:38:28.573Z',
    });

    const [url, init] = fetchMock.mock.calls[0]! as [string, RequestInit];
    expect(url).toBe('https://api.abacatepay.com/v2/transparents/create');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${KEY}`);
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(init.body as string)).toEqual({
      method: 'PIX',
      data: {
        amount: 4990,
        description: 'Curso: Godot do zero',
        expiresIn: 3600,
        externalId: ORDER,
        customer: {
          name: 'Ana Souza',
          email: 'ana@exemplo.com',
          taxId: '111.444.777-35',
          cellphone: '(11) 94002-8922',
        },
        metadata: { courseId: 'c1', orderId: ORDER },
      },
    });
  });

  it('base64 cru vira data URL PNG; URL externa é recusada', async () => {
    fetchMock.mockResolvedValueOnce(
      json({ ...okCharge, data: { ...okCharge.data, brCodeBase64: 'iVBORw0KG==' } }),
    );
    expect((await createPixCharge(input)).brCodeBase64).toBe('data:image/png;base64,iVBORw0KG==');

    fetchMock.mockResolvedValueOnce(
      json({
        ...okCharge,
        data: { ...okCharge.data, brCodeBase64: 'https://evil.example/qr.png' },
      }),
    );
    await expectCode(createPixCharge(input), 'provider_unavailable');
  });

  it('status desconhecido vira UNKNOWN', async () => {
    fetchMock.mockResolvedValue(json({ ...okCharge, data: { ...okCharge.data, status: 'WAT' } }));
    expect((await createPixCharge(input)).status).toBe('UNKNOWN');
  });

  it('valor divergente na resposta é erro', async () => {
    fetchMock.mockResolvedValue(json({ ...okCharge, data: { ...okCharge.data, amount: 1 } }));
    await expectCode(createPixCharge(input), 'provider_unavailable');
  });

  it('recusa valor inválido sem chamar a API', async () => {
    await expectCode(createPixCharge({ ...input, amountCents: 0 }), 'invalid_request');
    await expectCode(createPixCharge({ ...input, amountCents: 10.5 }), 'invalid_request');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [401, 'unauthorized'],
    [403, 'unauthorized'],
    [400, 'invalid_request'],
    [422, 'invalid_request'],
    [429, 'provider_unavailable'],
    [500, 'provider_unavailable'],
    [503, 'provider_unavailable'],
  ])('HTTP %i -> %s', async (status, code) => {
    fetchMock.mockResolvedValue(
      json({ data: null, success: false, error: 'Bad 111.444.777-35' }, status),
    );
    const err = await expectCode(createPixCharge(input), code);
    expect(err.status).toBe(status);
  });

  it('2xx com success=false -> invalid_request (sem repassar o texto do provedor)', async () => {
    fetchMock.mockResolvedValue(
      json({ data: null, success: false, error: 'CPF 111.444.777-35 inválido' }),
    );
    await expectCode(createPixCharge(input), 'invalid_request');
  });

  it('envelope ou dados inesperados -> provider_unavailable', async () => {
    fetchMock.mockResolvedValueOnce(json(['nope']));
    await expectCode(createPixCharge(input), 'provider_unavailable');
    fetchMock.mockResolvedValueOnce(
      json({ data: { id: 'pix_char_1' }, success: true, error: null }),
    );
    await expectCode(createPixCharge(input), 'provider_unavailable');
    fetchMock.mockResolvedValueOnce(new Response('<html>', { status: 200 }));
    await expectCode(createPixCharge(input), 'provider_unavailable');
  });

  it('falha de rede -> provider_unavailable', async () => {
    fetchMock.mockRejectedValue(new TypeError(`fetch failed Bearer ${KEY}`));
    await expectCode(createPixCharge(input), 'provider_unavailable');
  });

  it(`timeout de ${PROVIDER_TIMEOUT_MS} ms aborta e vira provider_unavailable`, async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal!.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          );
        }),
    );
    const pending = expectCode(createPixCharge(input), 'provider_unavailable');
    await vi.advanceTimersByTimeAsync(PROVIDER_TIMEOUT_MS - 1);
    expect((fetchMock.mock.calls[0]![1] as RequestInit).signal!.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const err = await pending;
    expect(err.message).toMatch(/a tempo/);
  });

  it('sem env -> provider_unavailable sem chamar a API', async () => {
    getPaymentsEnv.mockImplementation(() => {
      throw new Error('Variáveis de ambiente (server) ausentes ou inválidas: ABACATEPAY_API_KEY');
    });
    await expectCode(createPixCharge(input), 'provider_unavailable');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(isPaymentsConfigured()).toBe(false);
  });
});

describe('getPixStatus', () => {
  it('consulta /transparents/check e mapeia o status', async () => {
    fetchMock.mockResolvedValue(
      json({
        data: { id: 'pix_char_abc123', status: 'PAID', expiresAt: '2026-03-04T15:48:59.876Z' },
        success: true,
        error: null,
      }),
    );
    expect(await getPixStatus('pix_char_abc123')).toEqual({
      billingId: 'pix_char_abc123',
      status: 'PAID',
      expiresAt: '2026-03-04T15:48:59.876Z',
      amountCents: null,
    });
    const [url, init] = fetchMock.mock.calls[0]! as [string, RequestInit];
    expect(url).toBe('https://api.abacatepay.com/v2/transparents/check?id=pix_char_abc123');
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
  });

  it('recusa id com caracteres estranhos sem chamar a API', async () => {
    await expectCode(getPixStatus('pix&id=../x'), 'invalid_request');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('resposta de outra cobrança é erro', async () => {
    fetchMock.mockResolvedValue(
      json({ data: { id: 'pix_char_other', status: 'PAID' }, success: true, error: null }),
    );
    await expectCode(getPixStatus('pix_char_abc123'), 'provider_unavailable');
  });

  it('401 -> unauthorized', async () => {
    fetchMock.mockResolvedValue(json({ error: 'Insufficient permissions' }, 401));
    await expectCode(getPixStatus('pix_char_abc123'), 'unauthorized');
  });
});

describe('refundPixCharge', () => {
  const ok = { data: { id: 'tran_1', status: 'COMPLETE' }, success: true, error: null };

  it('chama POST /transparents/refund com id e motivo', async () => {
    fetchMock.mockResolvedValue(json(ok));
    expect(await refundPixCharge('pix_char_abc123')).toEqual({ alreadyRefunded: false });
    const [url, init] = fetchMock.mock.calls[0]! as [string, RequestInit];
    expect(url).toBe('https://api.abacatepay.com/v2/transparents/refund');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toMatchObject({ id: 'pix_char_abc123' });
  });

  it('INSUFFICIENT_FUNDS -> código próprio (HTTP 400 e 2xx com success:false)', async () => {
    fetchMock.mockResolvedValueOnce(json({ success: false, error: 'INSUFFICIENT_FUNDS' }, 400));
    const err = await expectCode(refundPixCharge('pix_char_abc123'), 'insufficient_funds');
    expect(err.message).not.toContain('INSUFFICIENT_FUNDS');
    fetchMock.mockResolvedValueOnce(json({ success: false, error: 'INSUFFICIENT_FUNDS' }));
    await expectCode(refundPixCharge('pix_char_abc123'), 'insufficient_funds');
  });

  it('cobrança já reembolsada vira sucesso idempotente', async () => {
    fetchMock.mockResolvedValue(
      json({ success: false, error: 'Esta cobrança já foi reembolsada.' }, 400),
    );
    expect(await refundPixCharge('pix_char_abc123')).toEqual({ alreadyRefunded: true });
  });

  it('disputa, não reembolsável, 401 e id inválido', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: 'TRANSACTION_UNDER_DISPUTE' }, 400));
    await expectCode(refundPixCharge('pix_char_abc123'), 'under_dispute');
    fetchMock.mockResolvedValueOnce(json({ error: 'TRANSACTION_NOT_REFUNDABLE' }, 400));
    await expectCode(refundPixCharge('pix_char_abc123'), 'not_refundable');
    fetchMock.mockResolvedValueOnce(json({ error: 'x' }, 401));
    await expectCode(refundPixCharge('pix_char_abc123'), 'unauthorized');
    fetchMock.mockClear();
    await expectCode(refundPixCharge('../x'), 'invalid_request');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
