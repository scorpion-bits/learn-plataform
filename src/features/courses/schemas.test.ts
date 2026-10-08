import { describe, expect, it } from 'vitest';

import {
  createCourseSchema,
  formatCentsForInput,
  parsePriceToCents,
  setCourseStatusSchema,
  slugify,
  updateCourseSchema,
} from './schemas';
import { publishBlockers } from './rules';

const ID = '11111111-1111-4111-8111-111111111111';
const valid = { title: 'Godot do zero', slug: 'godot-do-zero', level: 'beginner', price: '197,00' };

describe('slugify', () => {
  it('remove acentos e símbolos', () => {
    expect(slugify('  Criação de Jogos: Pixel Art!  ')).toBe('criacao-de-jogos-pixel-art');
  });
  it('limita a 100 caracteres sem hífen final', () => {
    const s = slugify('a'.repeat(99) + ' b');
    expect(s.length).toBeLessThanOrEqual(100);
    expect(s.endsWith('-')).toBe(false);
  });
});

describe('parsePriceToCents', () => {
  it.each([
    ['197', 19700],
    ['197,5', 19750],
    ['1.997,50', 199750],
    ['R$ 97,00', 9700],
    ['', 0],
  ])('%s -> %s', (raw, cents) => expect(parsePriceToCents(raw)).toBe(cents));
  it.each(['abc', '1,234', '-5', '1.99'])('rejeita %s', (raw) =>
    expect(parsePriceToCents(raw)).toBeNull(),
  );
  it('formata para o campo', () => expect(formatCentsForInput(19705)).toBe('197,05'));
});

describe('createCourseSchema', () => {
  it('converte preço para centavos e vazios para null', () => {
    const out = createCourseSchema.parse(valid);
    expect(out.price).toBe(19700);
    expect(out.subtitle).toBeNull();
    expect(out.categoryId).toBeNull();
  });
  it.each(['Godot', 'a--b', '-a', 'a-', 'a b'])('rejeita slug %s', (slug) => {
    expect(createCourseSchema.safeParse({ ...valid, slug }).success).toBe(false);
  });
  it('rejeita nível, preço e título inválidos', () => {
    expect(createCourseSchema.safeParse({ ...valid, level: 'x' }).success).toBe(false);
    expect(createCourseSchema.safeParse({ ...valid, price: 'abc' }).success).toBe(false);
    expect(createCourseSchema.safeParse({ ...valid, price: '200.000,00' }).success).toBe(false);
    expect(createCourseSchema.safeParse({ ...valid, title: '  ' }).success).toBe(false);
  });
});

describe('updateCourseSchema', () => {
  it('aceita capa do próprio curso e vazio como null', () => {
    const cover = `courses/${ID}/22222222-2222-4222-8222-222222222222.webp`;
    expect(updateCourseSchema.parse({ ...valid, id: ID, coverPath: cover }).coverPath).toBe(cover);
    expect(updateCourseSchema.parse({ ...valid, id: ID, coverPath: '' }).coverPath).toBeNull();
  });
  it('rejeita capa de outro curso ou fora do padrão', () => {
    const other =
      'courses/33333333-3333-4333-8333-333333333333/22222222-2222-4222-8222-222222222222.png';
    expect(updateCourseSchema.safeParse({ ...valid, id: ID, coverPath: other }).success).toBe(
      false,
    );
    expect(updateCourseSchema.safeParse({ ...valid, id: ID, coverPath: '../x.png' }).success).toBe(
      false,
    );
  });
});

describe('setCourseStatusSchema / publishBlockers', () => {
  it('valida status', () => {
    expect(setCourseStatusSchema.safeParse({ id: ID, status: 'published' }).success).toBe(true);
    expect(setCourseStatusSchema.safeParse({ id: ID, status: 'deleted' }).success).toBe(false);
  });
  it('lista o que falta', () => {
    expect(publishBlockers({ title: 'x', priceCents: 0, coverPath: null, lessonCount: 0 })).toEqual(
      ['preço maior que zero', 'capa', 'pelo menos uma aula'],
    );
    expect(publishBlockers({ title: 'x', priceCents: 1, coverPath: 'p', lessonCount: 1 })).toEqual(
      [],
    );
  });
});
