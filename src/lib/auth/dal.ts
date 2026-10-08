import 'server-only';

import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

/**
 * Data Access Layer de autenticação (docs/authentication.md).
 *
 * - Identidade: `auth.getClaims()` (JWT verificado; nunca `getSession()`).
 * - Papel: SEMPRE consultado em `public.user_roles` (RLS: o usuário lê o próprio).
 *   Nunca de `user_metadata`, claims, cookie ou input.
 * - Memoizado por request com `React.cache`.
 * - Guard em layout não protege Server Actions: cada action chama o guard (ver `actions.ts`).
 */

export type AppRole = Database['public']['Enums']['app_role'];

export interface CurrentUser {
  id: string;
  email: string;
}

export interface CurrentProfile {
  id: string;
  fullName: string;
  avatarUrl: string | null;
}

/** Usuário autenticado ou `null`. Sem consulta ao banco (verifica o JWT). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims || typeof claims.sub !== 'string' || claims.sub.length === 0) return null;
  return { id: claims.sub, email: typeof claims.email === 'string' ? claims.email : '' };
});

/** Perfil do usuário atual (tabela `profiles`) ou `null` se anônimo. */
export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw new Error('Não foi possível carregar o perfil.');

  return {
    id: user.id,
    // O trigger `handle_new_user` cria o perfil; se faltar, degrada para o email.
    fullName: data?.full_name?.trim() || user.email,
    avatarUrl: data?.avatar_url ?? null,
  };
});

/**
 * Papel do usuário atual, lido de `user_roles` (banco). `null` se anônimo.
 * Falha do banco lança (não vira "student" em silêncio) — fail closed.
 */
export const getCurrentRole = cache(async (): Promise<AppRole | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
  if (error) throw new Error('Não foi possível verificar as permissões.');

  return data?.some((row) => row.role === 'admin') ? 'admin' : 'student';
});

/** Exige login. Anônimo -> `/entrar` (o `next` é montado pelo proxy). */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar');
  return user;
}

/**
 * Exige papel admin. Anônimo -> `/entrar`; logado não-admin -> `notFound()`
 * (não revela que o painel existe).
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  const role = await getCurrentRole();
  if (role !== 'admin') notFound();
  return user;
}
