'use client';

import { useId, useState, useTransition } from 'react';

import { Button, Dialog, Field, Select, Textarea, useToast } from '@/components/ui';

import { grantCourse, removeAssignment, revokePurchase } from '../actions';
import { REASON_MAX } from '../schemas';
import styles from './Students.module.css';

/** `demo`: vitrine — não chama a action, só simula o sucesso. */
interface DemoProp {
  demo?: boolean;
}

export function GrantCourseForm({
  userId,
  courses,
  demo,
}: DemoProp & { userId: string; courses: { id: string; title: string }[] }) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [courseId, setCourseId] = useState('');
  const [error, setError] = useState<string>();

  if (courses.length === 0) {
    return <p className={styles.muted}>Nenhum curso disponível para atribuir a este aluno.</p>;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    start(async () => {
      if (demo) {
        toast({ tone: 'success', title: 'Curso atribuído (simulação)' });
        return;
      }
      const result = await grantCourse({ userId, courseId });
      if (result.ok) {
        setCourseId('');
        toast({ tone: 'success', title: 'Curso atribuído' });
      } else setError(result.fieldErrors?.courseId?.[0] ?? result.error);
    });
  }

  return (
    <form className={styles.grant} onSubmit={submit}>
      <Field label="Atribuir curso" error={error} required>
        <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="">Selecione um curso…</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" pending={pending} disabled={!courseId}>
        Atribuir
      </Button>
    </form>
  );
}

const COPY = {
  assignment: {
    trigger: 'Remover atribuição',
    title: 'Remover atribuição',
    description: 'O aluno perde o acesso concedido manualmente. O histórico é mantido.',
    confirm: 'Remover atribuição',
    success: 'Atribuição removida',
    variant: 'secondary' as const,
  },
  purchase: {
    trigger: 'Revogar compra',
    title: 'Revogar acesso de compra',
    description:
      'Use apenas após reembolso ou fraude; o reembolso em si é feito em Pedidos. Esta ação revoga o acesso do aluno ao curso comprado.',
    confirm: 'Revogar compra',
    success: 'Compra revogada',
    variant: 'danger' as const,
  },
};

export function RevokeEnrollmentButton({
  kind,
  enrollmentId,
  userId,
  courseTitle,
  demo,
}: DemoProp & {
  kind: keyof typeof COPY;
  enrollmentId: string;
  userId: string;
  courseTitle: string;
}) {
  const copy = COPY[kind];
  const { toast } = useToast();
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    start(async () => {
      if (demo) {
        setOpen(false);
        toast({ tone: 'success', title: `${copy.success} (simulação)` });
        return;
      }
      const act = kind === 'assignment' ? removeAssignment : revokePurchase;
      const result = await act({ enrollmentId, userId, reason });
      if (result.ok) {
        setOpen(false);
        setReason('');
        toast({ tone: 'success', title: copy.success });
      } else setError(result.fieldErrors?.reason?.[0] ?? result.error);
    });
  }

  return (
    <>
      <Button type="button" size="sm" variant={copy.variant} onClick={() => setOpen(true)}>
        {copy.trigger}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`${copy.title}: ${courseTitle}`}
        description={copy.description}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form={`${uid}-form`}
              variant={kind === 'purchase' ? 'danger' : 'primary'}
              pending={pending}
            >
              {copy.confirm}
            </Button>
          </>
        }
      >
        <form id={`${uid}-form`} onSubmit={submit}>
          <Field label="Motivo" error={error} required hint="Fica registrado no histórico.">
            <Textarea
              rows={3}
              maxLength={REASON_MAX}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
        </form>
      </Dialog>
    </>
  );
}
