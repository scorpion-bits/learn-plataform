'use client';

import { useOptimistic, useTransition } from 'react';

import { Badge, Button, useToast } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';

import { setCourseStatus } from '../actions';
import { publishBlockers } from '../rules';
import { STATUS_LABELS } from '../constants';
import type { CourseStatus } from '../constants';
import styles from './StatusControl.module.css';

export const STATUS_TONES: Record<CourseStatus, BadgeTone> = {
  draft: 'amber',
  published: 'mint',
  archived: 'neutral',
};

interface Props {
  courseId: string;
  status: CourseStatus;
  title: string;
  priceCents: number;
  coverPath: string | null;
  lessonCount: number;
}

/** Status com atualização otimista: o selo muda no clique e volta se a action falhar. */
export function StatusControl({
  courseId,
  status,
  title,
  priceCents,
  coverPath,
  lessonCount,
}: Props) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(status);
  const missing = publishBlockers({ title, priceCents, coverPath, lessonCount });

  function change(next: CourseStatus, success: string) {
    startTransition(async () => {
      setOptimistic(next);
      const result = await setCourseStatus({ id: courseId, status: next });
      if (result.ok) toast({ tone: 'success', title: success });
      else
        toast({
          tone: 'error',
          title: 'Não foi possível alterar o status',
          description: result.error,
          duration: 10000,
        });
    });
  }

  return (
    <div className={styles.root}>
      <div className={styles.line}>
        <span className={styles.label}>Status</span>
        <Badge tone={STATUS_TONES[optimistic]}>{STATUS_LABELS[optimistic]}</Badge>
      </div>
      <div className={styles.buttons}>
        {optimistic !== 'published' && (
          <Button
            type="button"
            size="sm"
            pending={pending}
            onClick={() => change('published', 'Curso publicado')}
          >
            Publicar
          </Button>
        )}
        {optimistic === 'published' && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            pending={pending}
            onClick={() => change('draft', 'Curso voltou para rascunho')}
          >
            Despublicar
          </Button>
        )}
        {optimistic !== 'archived' && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => change('archived', 'Curso arquivado')}
          >
            Arquivar
          </Button>
        )}
      </div>
      {optimistic !== 'published' && missing.length > 0 && (
        <p className={styles.hint}>Para publicar falta: {missing.join('; ')}.</p>
      )}
    </div>
  );
}
