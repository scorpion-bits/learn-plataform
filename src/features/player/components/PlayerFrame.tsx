'use client';

import { useRouter } from 'next/navigation';
import { useOptimistic, useState, useTransition } from 'react';
import type { ReactNode } from 'react';

import { CubeProgress } from '@/components/brand';
import { PlayerShell } from '@/components/layout';
import { Button, useToast } from '@/components/ui';

import { setLessonCompleted } from '../actions';
import type { OutlineModuleView } from '../model';
import { adjustedCompletedCount, isCourseComplete, progressAnnouncement } from '../progress';

import { LessonOutline } from './LessonOutline';
import { LessonShortcuts } from './LessonShortcuts';
import styles from './PlayerFrame.module.css';

export type LessonLink = { href: string; title: string };

export interface PlayerFrameProps {
  courseTitle: string;
  lessonId: string;
  totalLessons: number;
  /** Concluídas segundo o servidor (inclui a aula atual, se concluída). */
  completedCount: number;
  lessonCompleted: boolean;
  outline: OutlineModuleView[];
  showPreviewBadge: boolean;
  /** Só quem tem matrícula grava progresso (prévia não). */
  canComplete: boolean;
  prev: LessonLink | null;
  next: LessonLink | null;
  backHref: string;
  /** Vitrine `/dev`: simula a gravação (sem servidor). `fail` mostra o rollback. */
  demo?: 'ok' | 'fail';
  children: ReactNode;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Casca do player com o progresso otimista: botão "Concluir aula", CubeProgress, ementa e
 * estado "Curso concluído" mudam no mesmo instante do clique (`useOptimistic`); se a gravação
 * falhar, voltam sozinhos ao estado do servidor e um toast avisa. Nunca finge sucesso.
 */
export function PlayerFrame({
  courseTitle,
  lessonId,
  totalLessons,
  completedCount,
  lessonCompleted,
  outline,
  showPreviewBadge,
  canComplete,
  prev,
  next,
  backHref,
  demo,
  children,
}: PlayerFrameProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [optimisticCompleted, setOptimisticCompleted] = useOptimistic(
    lessonCompleted,
    (_current, value: boolean) => value,
  );
  const [announcement, setAnnouncement] = useState('');

  const count = adjustedCompletedCount({
    serverCount: completedCount,
    serverCompleted: lessonCompleted,
    optimisticCompleted,
    total: totalLessons,
  });
  const courseDone = isCourseComplete(count, totalLessons);

  const view = outline.map((mod) => ({
    ...mod,
    lessons: mod.lessons.map((l) =>
      l.id === lessonId ? { ...l, completed: optimisticCompleted } : l,
    ),
  }));

  function toggle() {
    if (!canComplete || pending) return;
    const target = !optimisticCompleted;
    startTransition(async () => {
      setOptimisticCompleted(target);
      setAnnouncement(
        progressAnnouncement({
          completed: target,
          total: totalLessons,
          completedCount: adjustedCompletedCount({
            serverCount: completedCount,
            serverCompleted: lessonCompleted,
            optimisticCompleted: target,
            total: totalLessons,
          }),
        }),
      );

      let error: string | null = null;
      if (demo) {
        await wait(400);
        if (demo === 'fail') error = 'Não foi possível salvar o progresso. Tente de novo.';
      } else {
        try {
          const result = await setLessonCompleted({ lessonId, completed: target });
          if (!result.ok) error = result.error;
        } catch {
          error = 'Sem conexão. Seu progresso não foi salvo. Tente de novo.';
        }
      }

      if (error) {
        // sai da transição sem refresh: o useOptimistic volta ao valor do servidor
        setAnnouncement('Não foi possível salvar o progresso. A aula voltou ao estado anterior.');
        toast({ tone: 'error', title: 'Progresso não salvo', description: error });
        return;
      }
      if (!demo) router.refresh();
    });
  }

  const showNextOffer = optimisticCompleted && next !== null && !courseDone;

  return (
    <PlayerShell
      backHref={backHref}
      courseTitle={courseTitle}
      progress={{ total: totalLessons, completed: count }}
      outline={<LessonOutline modules={view} showPreviewBadge={showPreviewBadge} />}
      prev={
        prev ? (
          <Button
            variant="secondary"
            href={prev.href}
            aria-label={`Anterior: ${prev.title}`}
            aria-keyshortcuts="["
          >
            Anterior
          </Button>
        ) : (
          <Button variant="secondary" disabled>
            Anterior
          </Button>
        )
      }
      complete={
        canComplete ? (
          <Button
            fullWidth
            variant={optimisticCompleted ? 'secondary' : 'primary'}
            aria-pressed={optimisticCompleted}
            onClick={toggle}
            aria-label={
              optimisticCompleted ? 'Aula concluída. Desfazer conclusão' : 'Concluir aula'
            }
          >
            {optimisticCompleted ? 'Concluída ✓ (desfazer)' : 'Concluir aula'}
          </Button>
        ) : (
          <Button fullWidth variant="secondary" disabled>
            Concluir aula
          </Button>
        )
      }
      next={
        next ? (
          <Button
            variant={showNextOffer ? 'primary' : 'secondary'}
            href={next.href}
            prefetch
            aria-label={`Próxima: ${next.title}`}
            aria-keyshortcuts="]"
          >
            Próxima
          </Button>
        ) : (
          <Button variant="secondary" disabled>
            Próxima
          </Button>
        )
      }
    >
      <p className={styles.live} role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      {courseDone && canComplete ? (
        <section className={styles.done} aria-labelledby="course-done-title">
          <div className={styles.celebration} aria-hidden="true">
            <CubeProgress
              total={totalLessons}
              completed={totalLessons}
              maxVisible={12}
              size="lg"
              showLabel={false}
              tone="mint"
              highlightNext={false}
              label="Curso concluído"
            />
          </div>
          <div className={styles.doneBody}>
            <h2 id="course-done-title" className={styles.doneTitle}>
              Curso concluído
            </h2>
            <p className={styles.doneText}>
              Você terminou todas as {totalLessons} aulas de {courseTitle}. Bom trabalho!
            </p>
            <Button href={backHref} variant="secondary">
              Voltar à biblioteca
            </Button>
          </div>
        </section>
      ) : null}

      {children}

      {showNextOffer && next ? (
        <div className={styles.offer}>
          <p>Aula concluída. Pronto para continuar?</p>
          <Button href={next.href} prefetch aria-label={`Ir para a próxima: ${next.title}`}>
            Ir para a próxima
          </Button>
        </div>
      ) : null}

      <LessonShortcuts prevHref={prev?.href ?? null} nextHref={next?.href ?? null} />
    </PlayerShell>
  );
}
