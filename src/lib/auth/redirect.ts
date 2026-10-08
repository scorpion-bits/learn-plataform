/**
 * Sanitização do parâmetro `next` (open redirect). Aceita SOMENTE paths
 * internos do próprio site; qualquer outra coisa vira `fallback`.
 *
 * Sem `server-only`: também é usado pelo proxy e por testes.
 */

export const DEFAULT_AFTER_LOGIN = '/inicio';

const MAX_LENGTH = 2048;
const MAX_DECODE_ROUNDS = 3;
/**
 * Telas só-para-anônimos: voltar para elas depois do login criaria um loop.
 * `/redefinir-senha` fica de fora de propósito (destino legítimo do link de recuperação).
 */
const AUTH_SCREENS = ['/entrar', '/cadastro'];

/**
 * Caracteres que nunca devem aparecer num path interno: controle C0/C1,
 * espaços (inclui NBSP e espaços Unicode), backslash e invisíveis de formatação.
 * Escrito com `\\u` para o arquivo continuar ASCII.
 */
const FORBIDDEN_CHARS = new RegExp(
  '[\\u0000-\\u0020\\u007f-\\u00a0\\\\\\u1680\\u180e\\u2000-\\u200f\\u2028-\\u202f\\u205f-\\u206f\\u3000\\ufeff]',
);

/** `allowSpace`: nas formas decodificadas, `%20` legítimo (ex.: `?q=a%20b`) é aceito; o bruto não. */
function isSafeForm(value: string, allowSpace: boolean): boolean {
  if (!value.startsWith('/')) return false; // relativo, esquema (https:, javascript:) ou vazio
  if (value.startsWith('//')) return false; // protocol-relative
  return !FORBIDDEN_CHARS.test(allowSpace ? value.replaceAll(' ', '') : value);
}

function isAuthScreen(pathname: string): boolean {
  return AUTH_SCREENS.some((screen) => pathname === screen || pathname.startsWith(`${screen}/`));
}

/**
 * Devolve um path interno seguro (`/algo?x=1#y`) ou `fallback`.
 *
 * Rejeita: `//evil`, `/\evil`, `https://…`, `javascript:…`, `%2F%2F`, `%5C`,
 * caracteres de controle/espaços (também codificados, inclusive em dupla
 * codificação) e URLs malformadas.
 */
export function sanitizeNextPath(
  raw: string | string[] | null | undefined,
  fallback: string = DEFAULT_AFTER_LOGIN,
): string {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_LENGTH) return fallback;

  // Verifica a forma bruta e cada nível de decodificação (%2F%2F, %255C, %0d%0a…).
  let current = raw;
  for (let round = 0; round <= MAX_DECODE_ROUNDS; round += 1) {
    if (!isSafeForm(current, round > 0)) return fallback;
    let decoded: string;
    try {
      decoded = decodeURIComponent(current);
    } catch {
      return fallback; // % malformado
    }
    if (decoded === current) break;
    current = decoded;
  }

  // Última barreira: o parser de URL tem de manter a origem fictícia.
  const base = 'http://internal.invalid';
  let url: URL;
  try {
    url = new URL(raw, base);
  } catch {
    return fallback;
  }
  if (url.origin !== base) return fallback;

  const normalized = `${url.pathname}${url.search}${url.hash}`;
  if (!isSafeForm(normalized, false) || isAuthScreen(url.pathname)) return fallback;
  return normalized;
}
