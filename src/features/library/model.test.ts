import { describe, expect, it } from 'vitest';

import {
  continueHref,
  countByTab,
  filterByTab,
  firstName,
  mapLibraryRow,
  parseTab,
  pickContinueCourse,
  resolveOrigin,
} from './model';
import type { LibraryCourse, LibraryRow } from './model';

const course = (over: Partial<LibraryCourse> & { slug: string }): LibraryCourse => ({
  courseId: `id-${over.slug}`,
  title: over.slug.toUpperCase(),
  subtitle: null,
  coverPath: null,
  lessonCount: 10,
  completedCount: 0,
  progressPercent: 0,
  isCompleted: false,
  origin: 'purchase',
  firstGrantedAt: '2026-01-01T00:00:00Z',
  lastAccessedAt: null,
  lastLessonId: null,
  ...over,
});

const A = course({ slug: 'a', lastAccessedAt: '2026-03-01T00:00:00Z', progressPercent: 30 });
const B = course({ slug: 'b', lastAccessedAt: '2026-05-01T00:00:00Z', progressPercent: 50 });
const C = course({
  slug: 'c',
  isCompleted: true,
  completedCount: 10,
  progressPercent: 100,
  lastAccessedAt: '2026-06-01T00:00:00Z',
});
const D = course({ slug: 'd', firstGrantedAt: '2026-04-01T00:00:00Z' }); // nunca aberto

describe('resolveOrigin (selo)', () => {
  it('compra vence atribuição quando há as duas', () => {
    expect(resolveOrigin({ sources: ['purchase', 'admin_grant'], has_purchase: true })).toBe(
      'purchase',
    );
    expect(resolveOrigin({ sources: ['admin_grant', 'purchase'] })).toBe('purchase');
  });
  it('só atribuição -> Atribuído; só compra -> Comprado', () => {
    expect(resolveOrigin({ sources: ['admin_grant'], has_admin_grant: true })).toBe('admin_grant');
    expect(resolveOrigin({ sources: ['purchase'], has_purchase: true })).toBe('purchase');
  });
});

describe('mapLibraryRow', () => {
  const row = {
    course_id: 'c1',
    slug: 'godot',
    title: 'Godot',
    subtitle: null,
    cover_path: null,
    course_status: 'published',
    level: 'beginner',
    sources: ['admin_grant', 'purchase'],
    has_purchase: true,
    has_admin_grant: true,
    first_granted_at: '2026-01-01T00:00:00Z',
    lesson_count: 4,
    completed_count: 9,
    progress_percent: 140,
    is_completed: false,
    last_accessed_at: null,
    last_lesson_id: null,
  } as LibraryRow;

  it('normaliza e limita contagens/percentual', () => {
    expect(mapLibraryRow(row)).toMatchObject({
      origin: 'purchase',
      completedCount: 4,
      progressPercent: 100,
    });
  });
  it('descarta linha sem id/slug/título', () => {
    expect(mapLibraryRow({ ...row, slug: null })).toBeNull();
  });
});

describe('parseTab', () => {
  it('aceita as três abas; o resto cai em "em-andamento"', () => {
    expect(parseTab('concluidos')).toBe('concluidos');
    expect(parseTab('todos')).toBe('todos');
    expect(parseTab(['concluidos', 'todos'])).toBe('concluidos');
    expect(parseTab('hack')).toBe('em-andamento');
    expect(parseTab(undefined)).toBe('em-andamento');
  });
});

describe('agrupamento por aba', () => {
  const all = [A, B, C, D];
  it('em andamento = não concluídos (inclui nunca abertos), mais recente primeiro', () => {
    expect(filterByTab(all, 'em-andamento').map((c) => c.slug)).toEqual(['b', 'a', 'd']);
  });
  it('concluídos', () => {
    expect(filterByTab(all, 'concluidos').map((c) => c.slug)).toEqual(['c']);
  });
  it('todos, ordenados por recência', () => {
    expect(filterByTab(all, 'todos').map((c) => c.slug)).toEqual(['c', 'b', 'a', 'd']);
  });
  it('contagens', () => {
    expect(countByTab(all)).toEqual({ 'em-andamento': 3, concluidos: 1, todos: 4 });
    expect(countByTab([])).toEqual({ 'em-andamento': 0, concluidos: 0, todos: 0 });
  });
});

describe('pickContinueCourse', () => {
  it('escolhe o não concluído com acesso mais recente (ignora concluídos)', () => {
    expect(pickContinueCourse([A, B, C, D])?.slug).toBe('b');
  });
  it('nunca aberto fica depois dos já acessados', () => {
    expect(pickContinueCourse([D, A])?.slug).toBe('a');
  });
  it('só nunca abertos: o matriculado mais recentemente', () => {
    const older = course({ slug: 'old', firstGrantedAt: '2026-01-01T00:00:00Z' });
    expect(pickContinueCourse([older, D])?.slug).toBe('d');
  });
  it('tudo concluído: ainda devolve o mais recente', () => {
    const C2 = { ...C, slug: 'c2', lastAccessedAt: '2026-07-01T00:00:00Z' };
    expect(pickContinueCourse([C, C2])?.slug).toBe('c2');
  });
  it('sem cursos: null', () => {
    expect(pickContinueCourse([])).toBeNull();
  });
});

describe('continueHref / firstName', () => {
  it('com aula de retomada vai direto; sem ela, pela raiz do curso', () => {
    expect(continueHref({ slug: 'x', lastLessonId: 'l1' })).toBe('/aprender/x/l1');
    expect(continueHref({ slug: 'x', lastLessonId: null })).toBe('/aprender/x');
  });
  it('primeiro nome', () => {
    expect(firstName('  Ana Maria Souza ')).toBe('Ana');
    expect(firstName('')).toBeNull();
    expect(firstName(null)).toBeNull();
  });
});
