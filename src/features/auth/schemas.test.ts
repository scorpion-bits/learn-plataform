import { describe, expect, it } from 'vitest';

import { recoverPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from './schemas';

describe('signInSchema', () => {
  it('normaliza o email e aceita qualquer senha não vazia', () => {
    const r = signInSchema.parse({ email: '  Ana@Exemplo.com ', password: 'x' });
    expect(r.email).toBe('ana@exemplo.com');
  });
  it('rejeita email inválido e senha vazia', () => {
    const r = signInSchema.safeParse({ email: 'nao-e-email', password: '' });
    expect(r.success).toBe(false);
  });
});

describe('signUpSchema', () => {
  const valid = {
    full_name: 'Ana Silva',
    email: 'ana@exemplo.com',
    password: 'senha-forte-1',
    confirm_password: 'senha-forte-1',
  };
  it('aceita dados válidos', () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });
  it('exige senha com pelo menos 8 caracteres', () => {
    const r = signUpSchema.safeParse({
      ...valid,
      password: '1234567',
      confirm_password: '1234567',
    });
    expect(r.success).toBe(false);
  });
  it('exige confirmação igual, com erro no campo confirm_password', () => {
    const r = signUpSchema.safeParse({ ...valid, confirm_password: 'outra-senha' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(['confirm_password']);
  });
  it('exige nome', () => {
    expect(signUpSchema.safeParse({ ...valid, full_name: ' ' }).success).toBe(false);
  });
});

describe('recoverPasswordSchema / resetPasswordSchema', () => {
  it('valida email', () => {
    expect(recoverPasswordSchema.safeParse({ email: 'x' }).success).toBe(false);
    expect(recoverPasswordSchema.safeParse({ email: 'a@b.co' }).success).toBe(true);
  });
  it('redefinição exige >= 8 e confirmação', () => {
    expect(
      resetPasswordSchema.safeParse({ password: 'abc', confirm_password: 'abc' }).success,
    ).toBe(false);
    expect(
      resetPasswordSchema.safeParse({ password: 'abcdefgh', confirm_password: 'abcdefgX' }).success,
    ).toBe(false);
    expect(
      resetPasswordSchema.safeParse({ password: 'abcdefgh', confirm_password: 'abcdefgh' }).success,
    ).toBe(true);
  });
});
