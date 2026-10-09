import 'server-only';

import { createServiceClient } from '@/lib/supabase/service';

/**
 * ÚNICO uso do service role deste domínio: `fulfill_order` na reconsulta
 * admin (PAY-005). A função é `security definer`, só `service_role` executa,
 * e valida estado, valor e cobrança dentro da transação (idempotente).
 *
 * Quem chama (a action) já provou admin + provedor dizendo `PAID`.
 * Retorna o código de resultado (`fulfilled`, `already_paid`, …).
 */
export async function fulfillOrderAsService(input: {
  orderId: string;
  billingId: string;
  amountCents: number;
}): Promise<string> {
  const client = createServiceClient();
  const { data, error } = await client.rpc('fulfill_order', {
    p_order_id: input.orderId,
    p_provider_billing_id: input.billingId,
    p_amount_cents: input.amountCents,
  });
  if (error || typeof data !== 'string') throw new Error('Falha ao chamar fulfill_order.');
  return data;
}
