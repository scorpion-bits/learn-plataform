import { describe, expect, it } from 'vitest';

import { moveItem, nextPosition } from './order';
import { minutesToSeconds, parseMinutes, reorderModulesSchema, secondsToMinutes } from './schemas';

describe('moveItem', () => {
  it('move para cima e para baixo sem mutar', () => {
    const list = ['a', 'b', 'c'];
    expect(moveItem(list, 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(list, 1, 1)).toEqual(['a', 'c', 'b']);
    expect(list).toEqual(['a', 'b', 'c']);
  });
  it('limites e índices inválidos devolvem a mesma ordem', () => {
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], 5, -1)).toEqual(['a', 'b']);
  });
});

describe('nextPosition', () => {
  it('vazio começa em 0; lacunas não reaproveitam posição', () => {
    expect(nextPosition([])).toBe(0);
    expect(nextPosition([0, 1, 3])).toBe(4);
  });
});

describe('duração', () => {
  it('parseMinutes', () => {
    expect(parseMinutes('12')).toBe(12);
    expect(parseMinutes(' 0 ')).toBe(0);
    expect(parseMinutes('')).toBeNull();
    expect(parseMinutes('1,5')).toBeUndefined();
    expect(parseMinutes('-3')).toBeUndefined();
    expect(parseMinutes('abc')).toBeUndefined();
  });
  it('converte minutos <-> segundos', () => {
    expect(minutesToSeconds(12)).toBe(720);
    expect(minutesToSeconds(null)).toBeNull();
    expect(secondsToMinutes(720)).toBe(12);
    expect(secondsToMinutes(30)).toBe(1);
    expect(secondsToMinutes(null)).toBeNull();
  });
});

describe('reorderModulesSchema', () => {
  const ID = '11111111-1111-4111-8111-111111111111';
  it('exige uuids únicos', () => {
    expect(reorderModulesSchema.safeParse({ courseId: ID, ids: [ID] }).success).toBe(true);
    expect(reorderModulesSchema.safeParse({ courseId: ID, ids: [ID, ID] }).success).toBe(false);
    expect(reorderModulesSchema.safeParse({ courseId: ID, ids: ['x'] }).success).toBe(false);
  });
});
