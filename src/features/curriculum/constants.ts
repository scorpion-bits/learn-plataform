// Sem zod: helpers puros importáveis por Client Components.

/** Espelha as constraints de `course_modules` / `lessons` (docs/database.md). */
export const TITLE_MAX = 200;
/** Teto de sanidade para a duração de uma aula (24 h). */
export const DURATION_MAX_MINUTES = 1440;

/** Minutos digitados ("12") -> inteiro; vazio -> `null`; inválido -> `undefined`. */
export function parseMinutes(raw: string): number | null | undefined {
  const value = raw.trim();
  if (value === '') return null;
  if (!/^\d{1,4}$/.test(value)) return undefined;
  return Number(value);
}

export function minutesToSeconds(minutes: number | null): number | null {
  return minutes === null ? null : minutes * 60;
}

/** Segundos gravados -> minutos exibidos (arredonda para cima: 30 s vira 1 min). */
export function secondsToMinutes(seconds: number | null): number | null {
  return seconds === null ? null : Math.ceil(seconds / 60);
}
