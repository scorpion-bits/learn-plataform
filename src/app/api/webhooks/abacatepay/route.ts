import { handleAbacatePayWebhook, readLimitedText } from '@/features/payments-webhook/handler';

/**
 * Webhook da AbacatePay (PAY-003). Só adapta Request/Response; a lógica está em
 * `src/features/payments-webhook/handler.ts`. Fora do proxy (`src/proxy.ts`
 * exclui `/api/webhooks`): sem sessão, sem cookies.
 *
 * Nunca logar `request.url`: a query string contém o `webhookSecret`.
 */
export const runtime = 'nodejs';
export const maxDuration = 30;

const NO_STORE = { 'Cache-Control': 'private, no-store' };

export async function POST(request: Request): Promise<Response> {
  const result = await handleAbacatePayWebhook({
    webhookSecret: new URL(request.url).searchParams.get('webhookSecret'),
    signature: request.headers.get('x-webhook-signature'),
    contentLength: request.headers.get('content-length'),
    readBody: (maxBytes) => readLimitedText(request.body, maxBytes),
  });
  return Response.json(result.body, { status: result.status, headers: NO_STORE });
}

export function GET(): Response {
  return Response.json(
    { ok: false, result: 'method_not_allowed' },
    { status: 405, headers: { ...NO_STORE, Allow: 'POST' } },
  );
}
