import { describe, expect, it } from 'vitest';

import { mapCourseStudent } from './model';

const base = {
  enrollment_id: 'e1',
  user_id: 'u1',
  email: 'a@b.c',
  full_name: 'Ana',
  source: 'purchase' as const,
  granted_at: '2026-09-01T00:00:00Z',
  revoked_at: null,
  lesson_count: 3,
  completed_count: 1,
  total_count: 1,
};

describe('mapCourseStudent', () => {
  it('mapeia campos e calcula o progresso arredondado', () => {
    expect(mapCourseStudent(base)).toMatchObject({
      enrollmentId: 'e1',
      userId: 'u1',
      fullName: 'Ana',
      source: 'purchase',
      revokedAt: null,
      lessonCount: 3,
      completedCount: 1,
      progressPercent: 33,
    });
  });
  it('curso sem aulas -> 0%', () => {
    expect(mapCourseStudent({ ...base, lesson_count: 0, completed_count: 0 }).progressPercent).toBe(
      0,
    );
  });
  it('limita concluídas ao total (aula removida)', () => {
    const r = mapCourseStudent({ ...base, completed_count: 9 });
    expect(r.completedCount).toBe(3);
    expect(r.progressPercent).toBe(100);
  });
  it('converte bigint vindo como string', () => {
    expect(
      mapCourseStudent({
        ...base,
        lesson_count: '4' as unknown as number,
        completed_count: '2' as unknown as number,
      }).progressPercent,
    ).toBe(50);
  });
});
