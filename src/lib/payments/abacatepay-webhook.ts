import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verificação dos webhooks da AbacatePay (docs/payments.md §4.1).
 *
 * Duas camadas, nesta ordem:
 * 1. `?webhookSecret=` — o segredo que NÓS cadastramos; prova a origem.
 * 2. `X-Webhook-Signature` — base64 de HMAC-SHA256 do corpo bruto com a chave
 *    PÚBLICA da AbacatePay. Só prova integridade (qualquer um pode calcular), por
 *    isso o "pago" ainda é confirmado reconsultando a API com a nossa chave.
 */

/**
 * Chave pública de assinatura dos webhooks, igual para todas as contas.
 * Não é segredo. Fonte: https://docs.abacatepay.com/pages/webhooks/security
 * (seção "Assinatura HMAC", copiada em 2026-10-08).
 */
export const ABACATEPAY_PUBLIC_HMAC_KEY =
  't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9';

/** Comparação em tempo constante; comprimentos diferentes → `false` (sem lançar). */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Assinatura esperada para um corpo bruto (UTF-8). Exportada para testes/fixtures. */
export function signWebhookBody(rawBody: string): string {
  return createHmac('sha256', ABACATEPAY_PUBLIC_HMAC_KEY)
    .update(Buffer.from(rawBody, 'utf8'))
    .digest('base64');
}

/** `true` se `X-Webhook-Signature` confere com o corpo bruto. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  return safeEqual(signWebhookBody(rawBody), signature.trim());
}
