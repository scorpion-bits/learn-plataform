import type { Database } from '@/types/database';

export type StudentListItem = {
  id: string;
  email: string;
  fullName: string;
  isAdmin: boolean;
  createdAt: string;
  activeEnrollments: number;
  totalSpentCents: number;
  lastOrderAt: string | null;
};

export type StudentEnrollment = {
  id: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string | null;
  source: Database['public']['Enums']['enrollment_source'];
  grantedAt: string;
  revokedAt: string | null;
  revokeReason: string | null;
  lessonCount: number;
  completedCount: number;
  progressPercent: number;
};

export type StudentOrder = {
  id: string;
  courseTitle: string;
  status: Database['public']['Enums']['order_status'];
  source: Database['public']['Enums']['order_source'];
  amountCents: number;
  createdAt: string;
  paidAt: string | null;
  refundRequestedAt: string | null;
  refundRequestedProgress: number | null;
  refundedAt: string | null;
};

export type StudentProfile = {
  id: string;
  fullName: string;
  /** `null` quando a função de busca não devolveu o aluno. */
  email: string | null;
  createdAt: string;
  enrollments: StudentEnrollment[];
  orders: StudentOrder[];
};
