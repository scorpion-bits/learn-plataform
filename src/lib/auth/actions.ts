import 'server-only';

import { z } from 'zod';

import { requireAdmin, requireUser } from './dal';
import type { CurrentUser } from './dal';

/**
 * Compositores de Server Actions: guard -> zod -> handler -> resultado tipado.
 * Server Actions são endpoints públicos: o guard é a PRIMEIRA coisa a rodar
 * (antes mesmo de ler o input).
 *
 * Uso:
 *   // features/courses/actions.ts
 *   'use server';
 *   export const createCourse = adminAction(createCourseSchema, async (input, { user }) => {
 *     ...
 *     return { id };
 *   });
 *
 * Com `useActionState`: `(prev, formData) => createCourse(formData)`.
 * Erros esperados: `throw new ActionError('Slug já existe', { slug: ['Já em uso'] })`.
 * `redirect()`/`notFound()` e erros inesperados propagam (error boundary), sem vazar mensagem.
 */

export type FieldErrors = Record<string, string[] | undefined>;

export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; error: string; fieldErrors?: FieldErrors };

export class ActionError extends Error {
  readonly fieldErrors?: FieldErrors;
  constructor(message: string, fieldErrors?: FieldErrors) {
    super(message);
    this.name = 'ActionError';
    this.fieldErrors = fieldErrors;
  }
}

export interface ActionContext {
  user: CurrentUser;
}

export const INVALID_INPUT_MESSAGE = 'Dados inválidos. Revise os campos e tente novamente.';

function toPlainInput(input: unknown): unknown {
  // `<form action>` envia FormData (com chaves internas `$ACTION_*` que o schema ignora).
  if (typeof FormData !== 'undefined' && input instanceof FormData) {
    return Object.fromEntries(input.entries());
  }
  return input;
}

function build<S extends z.ZodType, R>(
  guard: () => Promise<CurrentUser>,
  schema: S,
  handler: (input: z.output<S>, ctx: ActionContext) => Promise<R>,
) {
  return async (input?: unknown): Promise<ActionResult<R>> => {
    const user = await guard(); // 1) autenticação/autorização

    const parsed = schema.safeParse(toPlainInput(input)); // 2) validação
    if (!parsed.success) {
      return {
        ok: false,
        error: INVALID_INPUT_MESSAGE,
        fieldErrors: z.flattenError(parsed.error as z.ZodError).fieldErrors as FieldErrors,
      };
    }

    try {
      return { ok: true, data: await handler(parsed.data, { user }) }; // 3) regra de negócio
    } catch (error) {
      if (error instanceof ActionError) {
        return { ok: false, error: error.message, fieldErrors: error.fieldErrors };
      }
      throw error;
    }
  };
}

/** Action para qualquer usuário logado. */
export function userAction<S extends z.ZodType, R>(
  schema: S,
  handler: (input: z.output<S>, ctx: ActionContext) => Promise<R>,
) {
  return build(requireUser, schema, handler);
}

/** Action só para admin (papel lido de `user_roles`; não-admin -> notFound). */
export function adminAction<S extends z.ZodType, R>(
  schema: S,
  handler: (input: z.output<S>, ctx: ActionContext) => Promise<R>,
) {
  return build(requireAdmin, schema, handler);
}
