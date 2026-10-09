import type { Database } from '@/types/database';

export type CourseStudent = {
  enrollmentId: string;
  userId: string;
  email: string;
  fullName: string;
  source: Database['public']['Enums']['enrollment_source'];
  grantedAt: string;
  revokedAt: string | null;
  lessonCount: number;
  completedCount: number;
  progressPercent: number;
};

type Row = Database['public']['Functions']['admin_course_students']['Returns'][number];

/** Linha da RPC -> item de UI; progresso arredondado e limitado a 0–100. */
export function mapCourseStudent(r: Row): CourseStudent {
  const lessonCount = Number(r.lesson_count);
  const completedCount = Math.min(Number(r.completed_count), lessonCount);
  return {
    enrollmentId: r.enrollment_id,
    userId: r.user_id,
    email: r.email,
    fullName: r.full_name,
    source: r.source,
    grantedAt: r.granted_at,
    revokedAt: r.revoked_at,
    lessonCount,
    completedCount,
    progressPercent: lessonCount > 0 ? Math.round((completedCount / lessonCount) * 100) : 0,
  };
}
