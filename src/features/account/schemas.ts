import { z } from 'zod';

import { MIN_PASSWORD_LENGTH } from '@/features/auth/form-state';
import { isValidCpf, normalizeBrPhone, onlyDigits } from '@/lib/payments/tax-id';

export { MIN_PASSWORD_LENGTH };
export { IDLE_STATE, sameEmail } from './form-state';
export type { AccountFormState } from './form-state';
const MAX_PASSWORD_LENGTH = 72; // limite do bcrypt usado pelo Supabase

/** Campo opcional: vazio vira `null` (apaga o valor); preenchido segue a mesma regra do checkout. */
const optionalText = (max: number, tooLong: string) =>
  z
    .string()
    .trim()
    .max(max, tooLong)
    .optional()
    .transform((v) => (v ? v : null));

/**
 * Perfil editável. Só estas três colunas existem aqui: `user_id`, email, papel
 * etc. nunca vêm do input (campos extras são descartados pelo zod).
 */
export const profileSchema = z.object({
  full_name: z
    .string({ error: 'Informe seu nome.' })
    .trim()
    .min(2, 'Informe seu nome.')
    .max(100, 'Nome muito longo (máximo 100 caracteres).'),
  phone: optionalText(25, 'Telefone inválido.').transform((value, ctx) => {
    if (value === null) return null;
    const normalized = normalizeBrPhone(value);
    if (!normalized) {
      ctx.addIssue({ code: 'custom', message: 'Telefone inválido. Use DDD + número.' });
      return z.NEVER;
    }
    return normalized;
  }),
  tax_id: optionalText(20, 'CPF inválido.').transform((value, ctx) => {
    if (value === null) return null;
    const digits = onlyDigits(value);
    if (!isValidCpf(digits)) {
      ctx.addIssue({ code: 'custom', message: 'CPF inválido. Confira os números.' });
      return z.NEVER;
    }
    return digits;
  }),
});

export type ProfileInput = z.output<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    password: z
      .string({ error: 'Informe a nova senha.' })
      .min(MIN_PASSWORD_LENGTH, `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`)
      .max(MAX_PASSWORD_LENGTH, `A senha pode ter no máximo ${MAX_PASSWORD_LENGTH} caracteres.`),
    confirm_password: z.string({ error: 'Confirme a nova senha.' }),
  })
  .refine((v) => v.password === v.confirm_password, {
    path: ['confirm_password'],
    message: 'As senhas não conferem.',
  });

/** Exclusão de conta: o titular digita o próprio e-mail (comparado no servidor com o da sessão). */
export const deleteAccountSchema = z.object({
  email: z
    .string({ error: 'Digite seu e-mail para confirmar.' })
    .trim()
    .min(1, 'Digite seu e-mail para confirmar.')
    .max(320, 'E-mail inválido.'),
});
