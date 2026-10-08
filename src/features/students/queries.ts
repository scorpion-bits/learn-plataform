import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

import { PAGE_SIZE, studentIdSchema } from './schemas';
import type { StudentListItem, StudentProfile } from './model';

/** Leituras do admin com o client do usuário; a RLS / `is_admin()` decidem. */

export async function listStudents(
  q: string,
  page: number,
): Promise<{ rows: StudentListItem[]; total: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_students', {
    p_search: q || undefined,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  if (error) throw new Error('Não foi possível carregar os alunos.');
  const rows = (data ?? []).map((r) => ({
    id: r.user_id,
    email: r.email,
    fullName: r.full_name,
    isAdmin: r.is_admin,
    createdAt: r.created_at,
    activeEnrollments: Number(r.active_enrollments),
    totalSpentCents: Number(r.total_spent_cents),
    lastOrderAt: r.last_order_at,
  }));
  return { rows, total: Number(data?.[0]?.total_count ?? 0) };
}

type OrderStatus = Database['public']['Enums']['order_status'];

/** Perfil completo; `null` se o id é inválido ou não existe. */
export async function getStudentProfile(id: string): Promise<StudentProfile | null> {
  if (!studentIdSchema.safeParse(id).success) return null;
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('Não foi possível carregar o aluno.');
  if (!profile) return null;

  const [enrollRes, orderRes, progressRes, emailRes] = await Promise.all([
    supabase
      .from('enrollments')
      .select(
        'id, source, granted_at, revoked_at, revoke_reason, course_id, courses(title, slug, lessons(count))',
      )
      .eq('user_id', id)
      .order('granted_at', { ascending: false }),
    supabase
      .from('orders')
      .select(
        'id, status, source, amount_cents, created_at, paid_at, refund_requested_at, refund_requested_progress, refunded_at, courses(title)',
      )
      .eq('user_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('lesson_progress')
      .select('course_id')
      .eq('user_id', id)
      .not('completed_at', 'is', null),
    // Email só existe em auth.users: a única leitura admin é a função de busca.
    supabase.rpc('admin_students', {
      p_search: profile.full_name || undefined,
      p_limit: 200,
      p_offset: 0,
    }),
  ]);
  if (enrollRes.error || orderRes.error || progressRes.error) {
    throw new Error('Não foi possível carregar o aluno.');
  }

  const completedByCourse = new Map<string, number>();
  for (const p of progressRes.data ?? []) {
    completedByCourse.set(p.course_id, (completedByCourse.get(p.course_id) ?? 0) + 1);
  }

  const enrollments = (enrollRes.data ?? []).map((e) => {
    const course = Array.isArray(e.courses) ? e.courses[0] : e.courses;
    const lessonsRel = course?.lessons as unknown;
    const total = Array.isArray(lessonsRel)
      ? ((lessonsRel[0] as { count?: number } | undefined)?.count ?? 0)
      : 0;
    const done = Math.min(completedByCourse.get(e.course_id) ?? 0, total);
    return {
      id: e.id,
      courseId: e.course_id,
      courseTitle: course?.title ?? 'Curso removido',
      courseSlug: course?.slug ?? null,
      source: e.source,
      grantedAt: e.granted_at,
      revokedAt: e.revoked_at,
      revokeReason: e.revoke_reason,
      lessonCount: total,
      completedCount: done,
      progressPercent: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  });

  const orders = (orderRes.data ?? []).map((o) => {
    const course = Array.isArray(o.courses) ? o.courses[0] : o.courses;
    return {
      id: o.id,
      courseTitle: course?.title ?? 'Curso removido',
      status: o.status as OrderStatus,
      source: o.source,
      amountCents: o.amount_cents,
      createdAt: o.created_at,
      paidAt: o.paid_at,
      refundRequestedAt: o.refund_requested_at,
      refundRequestedProgress: o.refund_requested_progress,
      refundedAt: o.refunded_at,
    };
  });

  const email = (emailRes.data ?? []).find((r) => r.user_id === id)?.email ?? null;

  return {
    id: profile.id,
    fullName: profile.full_name,
    email,
    createdAt: profile.created_at,
    enrollments,
    orders,
  };
}

/** Cursos que podem receber atribuição: publicados/arquivados sem `admin_grant` ativo para o aluno. */
export async function listGrantableCourses(
  userId: string,
): Promise<{ id: string; title: string }[]> {
  const supabase = await createClient();
  const [coursesRes, activeRes] = await Promise.all([
    supabase
      .from('courses')
      .select('id, title')
      .in('status', ['published', 'archived'])
      .order('title', { ascending: true }),
    supabase
      .from('enrollments')
      .select('course_id')
      .eq('user_id', userId)
      .eq('source', 'admin_grant')
      .is('revoked_at', null),
  ]);
  if (coursesRes.error || activeRes.error) throw new Error('Não foi possível carregar os cursos.');
  const taken = new Set((activeRes.data ?? []).map((e) => e.course_id));
  return (coursesRes.data ?? []).filter((c) => !taken.has(c.id));
}
