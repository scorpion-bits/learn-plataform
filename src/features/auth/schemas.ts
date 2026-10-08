import { z } from 'zod';

export const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72; // limite do bcrypt usado pelo Supabase

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Informe seu email.')
  .max(254, 'Email muito longo.')
  .pipe(z.email('Informe um email válido.'));

const newPassword = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`)
  .max(MAX_PASSWORD_LENGTH, `A senha pode ter no máximo ${MAX_PASSWORD_LENGTH} caracteres.`);

/** Opcional e sempre sanitizado depois (`sanitizeNextPath`); aqui só limita o tamanho. */
const next = z.string().max(2048).optional();

export const signInSchema = z.object({
  email,
  // Login não revela regras de senha: só exige que exista.
  password: z.string().min(1, 'Informe sua senha.').max(1024),
  next,
});

export const signUpSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, 'Informe seu nome.')
      .max(100, 'Nome muito longo (máximo 100 caracteres).'),
    email,
    password: newPassword,
    confirm_password: z.string(),
  })
  .refine((v) => v.password === v.confirm_password, {
    path: ['confirm_password'],
    message: 'As senhas não conferem.',
  });

export const recoverPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password: newPassword, confirm_password: z.string() })
  .refine((v) => v.password === v.confirm_password, {
    path: ['confirm_password'],
    message: 'As senhas não conferem.',
  });

/** Estado devolvido pelas actions de formulário (consumido por `useActionState`). */
export type AuthFormState =
  | { status: 'idle' }
  | {
      status: 'error';
      message: string;
      fieldErrors?: Record<string, string[] | undefined>;
      /** Valores não sensíveis para repovoar o formulário (nunca senhas). */
      values?: Record<string, string>;
    }
  | { status: 'success'; message: string };

export const IDLE_STATE: AuthFormState = { status: 'idle' };
