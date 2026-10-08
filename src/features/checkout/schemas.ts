import { z } from 'zod';

import { courseSlugSchema } from '@/features/catalog/schemas';
import { isValidCpf, normalizeBrPhone, onlyDigits } from '@/lib/payments/tax-id';

/**
 * Input do checkout. Só identificadores e dados pessoais do comprador:
 * preço, `user_id` e curso resolvido vêm SEMPRE do servidor (campos extras são ignorados).
 */
export const startCheckoutSchema = z.object({
  courseSlug: courseSlugSchema,
  taxId: z
    .string({ error: 'Informe o CPF.' })
    .trim()
    .min(1, 'Informe o CPF.')
    .max(20, 'CPF inválido.')
    .transform(onlyDigits)
    .refine(isValidCpf, 'CPF inválido. Confira os números.'),
  phone: z
    .string({ error: 'Informe o celular.' })
    .trim()
    .min(1, 'Informe o celular.')
    .max(25, 'Telefone inválido.')
    .transform((value, ctx) => {
      const normalized = normalizeBrPhone(value);
      if (!normalized) {
        ctx.addIssue({ code: 'custom', message: 'Telefone inválido. Use DDD + número.' });
        return z.NEVER;
      }
      return normalized;
    }),
});

export type StartCheckoutInput = z.output<typeof startCheckoutSchema>;

/** Id do pedido na URL `/checkout/pedido/[orderId]`. */
export const orderIdSchema = z.uuid();

/** Validade da cobrança PIX pedida ao provedor (docs/payments.md §2). */
export const PIX_EXPIRES_IN_SECONDS = 3600;

/** Pedido pendente só é reaproveitado se ainda tiver pelo menos isto de validade. */
export const REUSE_MIN_REMAINING_MS = 60_000;

/** Pedido pendente sem QR mais novo que isto é considerado "em andamento" (outra aba/clique). */
export const IN_FLIGHT_GRACE_MS = 2 * 60_000;
