import { describe, expect, it } from 'vitest';

import {
  courseSlugSchema,
  downloadMaterialSchema,
  lessonIdSchema,
  registerVisitSchema,
} from './schemas';

const UUID = '50000000-0000-4000-8000-000000000003';

describe('schemas do player', () => {
  it('lessonId precisa ser uuid', () => {
    expect(lessonIdSchema.safeParse(UUID).success).toBe(true);
    expect(lessonIdSchema.safeParse('../etc').success).toBe(false);
    expect(lessonIdSchema.safeParse('').success).toBe(false);
  });

  it('slug do curso: kebab-case', () => {
    expect(courseSlugSchema.safeParse('godot-do-zero').success).toBe(true);
    expect(courseSlugSchema.safeParse('Godot Do Zero').success).toBe(false);
    expect(courseSlugSchema.safeParse('a/b').success).toBe(false);
  });

  it('inputs de action rejeitam campos faltando ou malformados', () => {
    expect(registerVisitSchema.safeParse({ lessonId: UUID }).success).toBe(true);
    expect(registerVisitSchema.safeParse({}).success).toBe(false);
    expect(downloadMaterialSchema.safeParse({ materialId: UUID }).success).toBe(true);
    expect(downloadMaterialSchema.safeParse({ materialId: 'x' }).success).toBe(false);
  });
});
