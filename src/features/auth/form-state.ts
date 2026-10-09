// Sem zod: importável por Client Components sem inflar o bundle.

export const MIN_PASSWORD_LENGTH = 8;

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
