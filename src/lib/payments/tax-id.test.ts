import { describe, expect, it } from 'vitest';

import {
  formatBrPhone,
  formatCpf,
  isValidBrPhone,
  isValidCpf,
  maskCpf,
  normalizeBrPhone,
  onlyDigits,
} from './tax-id';

describe('isValidCpf', () => {
  it.each(['111.444.777-35', '11144477735', '529.982.247-25', '390.533.447-05'])(
    'aceita CPF válido %s',
    (cpf) => expect(isValidCpf(cpf)).toBe(true),
  );

  it.each([
    ['dígito verificador errado', '111.444.777-36'],
    ['segundo dígito errado', '529.982.247-26'],
    ['todos iguais', '000.000.000-00'],
    ['todos iguais (9)', '99999999999'],
    ['curto', '1114447773'],
    ['longo', '111444777350'],
    ['vazio', ''],
    ['letras', 'abc.def.ghi-jk'],
  ])('recusa %s', (_label, cpf) => expect(isValidCpf(cpf)).toBe(false));
});

describe('formatCpf / maskCpf', () => {
  it('formata progressivamente', () => {
    expect(formatCpf('111')).toBe('111');
    expect(formatCpf('1114')).toBe('111.4');
    expect(formatCpf('1114447')).toBe('111.444.7');
    expect(formatCpf('11144477735')).toBe('111.444.777-35');
    expect(formatCpf('111444777359999')).toBe('111.444.777-35');
  });

  it('mascara para log sem expor o CPF completo', () => {
    expect(maskCpf('111.444.777-35')).toBe('***.***.*77-35');
    expect(maskCpf('123')).toBe('***');
  });
});

describe('telefone BR', () => {
  it.each([
    ['(11) 94002-8922', '11940028922'],
    ['(11) 4002-8922', '1140028922'],
    ['+55 11 94002-8922', '11940028922'],
    ['55 (21) 3333-4444', '2133334444'],
  ])('normaliza %s', (input, expected) => {
    expect(normalizeBrPhone(input)).toBe(expected);
    expect(isValidBrPhone(input)).toBe(true);
  });

  it.each([
    ['DDD com zero', '(01) 94002-8922'],
    ['DDD começando com zero', '(10) 94002-8922'],
    ['celular sem 9', '(11) 84002-8922'],
    ['fixo começando com 9', '(11) 9002-8922'],
    ['curto', '1199999'],
    ['longo', '119400289221'],
    ['vazio', ''],
  ])('recusa %s', (_label, input) => expect(normalizeBrPhone(input)).toBeNull());

  it('formata progressivamente', () => {
    expect(formatBrPhone('')).toBe('');
    expect(formatBrPhone('1')).toBe('(1');
    expect(formatBrPhone('119')).toBe('(11) 9');
    expect(formatBrPhone('1140028922')).toBe('(11) 4002-8922');
    expect(formatBrPhone('11940028922')).toBe('(11) 94002-8922');
    expect(formatBrPhone('+55 (11) 94002-8922')).toBe('(11) 94002-8922');
    expect(formatBrPhone('55999998888')).toBe('(55) 99999-8888');
  });

  it('onlyDigits', () => expect(onlyDigits('+55 (11) 9-8')).toBe('551198'));
});
