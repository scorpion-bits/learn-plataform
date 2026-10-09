// Sem zod: importável por Client Components sem inflar o bundle.

export { MIN_PASSWORD_LENGTH } from '@/features/auth/form-state';

/** Comparação de e-mail sem diferenciar maiúsculas/espaços. */
export function sameEmail(a: string, b: string): boolean {
  const norm = (v: string) => v.trim().toLowerCase();
  return norm(a) !== '' && norm(a) === norm(b);
}

/** Estado das formas da página (consumido por `useActionState`). */
export type AccountFormState =
  | { status: 'idle' }
  | {
      status: 'error';
      message: string;
      fieldErrors?: Record<string, string[] | undefined>;
    }
  | { status: 'success'; message: string };

export const IDLE_STATE: AccountFormState = { status: 'idle' };
