import type { ShellUser } from './types';

/**
 * Usuário fictício só para validar os shells enquanto não há auth (AUTH-002).
 * Em produção devolve `null`: nunca exibe dados falsos. Remover com o AUTH-002.
 */
export function devUser(): ShellUser | null {
  if (process.env.NODE_ENV === 'production') return null;
  return { name: 'Ana Souza', email: 'ana@exemplo.com' };
}
