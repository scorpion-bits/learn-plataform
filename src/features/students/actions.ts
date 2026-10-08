'use server';

import { revalidatePath } from 'next/cache';

import { ActionError, adminAction } from '@/lib/auth/actions';
import { createClient } from '@/lib/supabase/server';

import { grantCourseSchema, revokeEnrollmentSchema } from './schemas';

function revalidate(userId: string) {
  revalidatePath('/admin/alunos');
  revalidatePath(`/admin/alunos/${userId}`);
}

/** Atribui um curso (`admin_grant`). `granted_by` é SEMPRE o admin da sessão. */
export const grantCourse = adminAction(grantCourseSchema, async (input, { user }) => {
  const supabase = await createClient();

  const { data: course, error: readError } = await supabase
    .from('courses')
    .select('status')
    .eq('id', input.courseId)
    .maybeSingle();
  if (readError) throw new Error('Falha ao ler o curso.');
  if (!course)
    throw new ActionError('Curso não encontrado.', { courseId: ['Curso não encontrado.'] });
  if (course.status === 'draft') {
    throw new ActionError('Só é possível atribuir cursos publicados ou arquivados.', {
      courseId: ['Curso em rascunho não pode ser atribuído.'],
    });
  }

  const { error } = await supabase.from('enrollments').insert({
    user_id: input.userId,
    course_id: input.courseId,
    source: 'admin_grant',
    granted_by: user.id,
  });
  if (error) {
    if (error.code === '23505') {
      const msg = 'Este aluno já tem uma atribuição ativa para este curso.';
      throw new ActionError(msg, { courseId: [msg] });
    }
    throw new Error('Falha ao atribuir o curso.');
  }

  revalidate(input.userId);
  return { userId: input.userId };
});

/** Revogação lógica restrita à `source` informada (nunca toca a outra origem). */
async function revokeEnrollment(
  source: 'admin_grant' | 'purchase',
  input: { enrollmentId: string; userId: string; reason: string },
  adminId: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('enrollments')
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: adminId,
      revoke_reason: input.reason,
    })
    .eq('id', input.enrollmentId)
    .eq('user_id', input.userId)
    .eq('source', source)
    .is('revoked_at', null)
    .select('id');
  if (error) throw new Error('Falha ao revogar a matrícula.');
  if (!data || data.length === 0) {
    throw new ActionError(
      source === 'admin_grant'
        ? 'Atribuição não encontrada, já revogada ou não é uma atribuição manual.'
        : 'Compra não encontrada, já revogada ou não é uma matrícula comprada.',
    );
  }
  revalidate(input.userId);
  return { userId: input.userId };
}

/** Remove uma atribuição manual. Matrículas `purchase` nunca são afetadas. */
export const removeAssignment = adminAction(revokeEnrollmentSchema, (input, { user }) =>
  revokeEnrollment('admin_grant', input, user.id),
);

/** Revoga o acesso de uma compra (uso excepcional; o reembolso é feito em Pedidos). */
export const revokePurchase = adminAction(revokeEnrollmentSchema, (input, { user }) =>
  revokeEnrollment('purchase', input, user.id),
);
