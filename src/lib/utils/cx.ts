/** Junta nomes de classe ignorando valores falsos (substitui o clsx). */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
