/**
 * CPF e telefone BR: normalização, validação e máscaras.
 * Funções puras (sem I/O), usadas no schema do checkout (servidor) e nas
 * máscaras leves do formulário (cliente). Nada aqui é secreto.
 */

/** Mantém só os dígitos. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * CPF válido: 11 dígitos, não repetidos (000…, 111…) e dígitos verificadores
 * corretos (módulo 11). Aceita com ou sem máscara.
 */
export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split('').map(Number);
  const check = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += digits[i]! * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return check(9) === digits[9] && check(10) === digits[10];
}

/** "11144477735" -> "111.444.777-35" (parcial enquanto digita). */
export function formatCpf(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** CPF mascarado para exibição/log: "***.***.*77-35". Nunca logue o CPF completo. */
export function maskCpf(value: string): string {
  const d = onlyDigits(value);
  if (d.length !== 11) return '***';
  return `***.***.*${d.slice(7, 9)}-${d.slice(9)}`;
}

/**
 * Normaliza um telefone BR para DDD + número (10 ou 11 dígitos), aceitando o
 * prefixo +55/55. Retorna `null` se inválido:
 * - DDD de 11 a 99 (sem zero em nenhum dígito);
 * - celular: 9 dígitos começando com 9;
 * - fixo: 8 dígitos começando com 2 a 5.
 */
export function normalizeBrPhone(value: string): string | null {
  let d = onlyDigits(value);
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return null;

  const ddd = d.slice(0, 2);
  const number = d.slice(2);
  if (!/^[1-9]{2}$/.test(ddd)) return null;
  if (number.length === 9 && !number.startsWith('9')) return null;
  if (number.length === 8 && !/^[2-5]/.test(number)) return null;
  return d;
}

export function isValidBrPhone(value: string): boolean {
  return normalizeBrPhone(value) !== null;
}

/**
 * "11940028922" -> "(11) 94002-8922"; "1140028922" -> "(11) 4002-8922" (parcial enquanto digita).
 * Colado com +55 (mais de 11 dígitos), descarta o código do país.
 */
export function formatBrPhone(value: string): string {
  let d = onlyDigits(value);
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  const split = rest.length === 9 ? 5 : 4;
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}
