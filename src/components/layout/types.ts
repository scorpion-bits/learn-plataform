/** Dados mínimos do usuário que os shells exibem. Vêm por props: shells não buscam sessão. */
export interface ShellUser {
  name: string;
  email: string;
}

/** id do <main>: destino do skip-link. */
export const MAIN_ID = 'conteudo';

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}
