import { describe, expect, it } from 'vitest';

import { grantCourseSchema, parseListParams, revokeEnrollmentSchema } from './schemas';

const ID = '11111111-1111-4111-8111-111111111111';

describe('parseListParams', () => {
  it('normaliza q e pagina inválidos', () => {
    expect(parseListParams({})).toEqual({ q: '', page: 1 });
    expect(parseListParams({ q: '  ana  ', pagina: '3' })).toEqual({ q: 'ana', page: 3 });
    expect(parseListParams({ q: ['a'], pagina: '-2' })).toEqual({ q: '', page: 1 });
    expect(parseListParams({ pagina: 'abc' }).page).toBe(1);
    expect(parseListParams({ q: 'x'.repeat(300) }).q).toHaveLength(100);
  });
});

describe('revokeEnrollmentSchema', () => {
  it('exige motivo', () => {
    expect(
      revokeEnrollmentSchema.safeParse({ enrollmentId: ID, userId: ID, reason: '  ' }).success,
    ).toBe(false);
    expect(revokeEnrollmentSchema.safeParse({ enrollmentId: ID, userId: ID }).success).toBe(false);
    expect(
      revokeEnrollmentSchema.parse({ enrollmentId: ID, userId: ID, reason: ' fraude ' }).reason,
    ).toBe('fraude');
  });
});

describe('grantCourseSchema', () => {
  it('ignora granted_by vindo do input', () => {
    const parsed = grantCourseSchema.parse({
      userId: ID,
      courseId: ID,
      grantedBy: 'x',
      granted_by: 'x',
    });
    expect(parsed).toEqual({ userId: ID, courseId: ID });
  });
});
