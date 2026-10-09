import { describe, expect, it } from 'vitest';

import { changePasswordSchema, profileSchema } from './schemas';

describe('profileSchema', () => {
  it('normaliza nome, telefone e CPF (mascarados)', () => {
    const r = profileSchema.parse({
      full_name: '  Ana Souza ',
      phone: '(11) 94002-8922',
      tax_id: '111.444.777-35',
    });
    expect(r).toEqual({ full_name: 'Ana Souza', phone: '11940028922', tax_id: '11144477735' });
  });
  it('telefone e CPF vazios ou ausentes viram null', () => {
    expect(profileSchema.parse({ full_name: 'Ana', phone: '', tax_id: '  ' })).toEqual({
      full_name: 'Ana',
      phone: null,
      tax_id: null,
    });
    expect(profileSchema.parse({ full_name: 'Ana' })).toMatchObject({ phone: null, tax_id: null });
  });
  it('rejeita nome curto/vazio, CPF e telefone inválidos', () => {
    expect(profileSchema.safeParse({ full_name: 'A' }).success).toBe(false);
    expect(profileSchema.safeParse({}).success).toBe(false);
    expect(profileSchema.safeParse({ full_name: 'Ana', tax_id: '111.111.111-11' }).success).toBe(
      false,
    );
    expect(profileSchema.safeParse({ full_name: 'Ana', phone: '123' }).success).toBe(false);
  });
  it('descarta campos fora da lista (ex.: id, role, email)', () => {
    const r = profileSchema.parse({ full_name: 'Ana', id: 'x', role: 'admin', email: 'a@b.c' });
    expect(Object.keys(r).sort()).toEqual(['full_name', 'phone', 'tax_id']);
  });
});

describe('changePasswordSchema', () => {
  it('aceita senhas iguais com 8+ caracteres', () => {
    expect(
      changePasswordSchema.safeParse({
        password: 'senha-forte-1',
        confirm_password: 'senha-forte-1',
      }).success,
    ).toBe(true);
  });
  it('rejeita senha curta', () => {
    expect(
      changePasswordSchema.safeParse({ password: 'curta', confirm_password: 'curta' }).success,
    ).toBe(false);
  });
  it('rejeita confirmação divergente no campo confirm_password', () => {
    const r = changePasswordSchema.safeParse({
      password: 'senha-forte-1',
      confirm_password: 'outra-senha-1',
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(['confirm_password']);
  });
});
