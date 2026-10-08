import type { ReactNode } from 'react';

import { PlayerShell } from '@/components/layout';
import { Badge, Button, EmptyState } from '@/components/ui';
import { formatDuration } from '@/features/catalog/model';

import type { FlatLesson, OutlineModuleView, PlayerMaterial } from '../model';

import { LessonOutline } from './LessonOutline';
import { LessonShortcuts } from './LessonShortcuts';
import { LessonTitle } from './LessonTitle';
import { LockIcon } from './icons';
import { Materials } from './materials/Materials';
import styles from './PlayerView.module.css';

export type LessonLink = { href: string; title: string };

export interface PlayerViewProps {
  course: { slug: string; title: string };
  lesson: FlatLesson;
  totalLessons: number;
  completedCount: number;
  outline: OutlineModuleView[];
  materials: PlayerMaterial[];
  /** A aula abre (acesso ao curso ou prévia)? Senão mostra o convite para o curso. */
  canOpen: boolean;
  hasAccess: boolean;
  prev: LessonLink | null;
  next: LessonLink | null;
  backHref?: string;
  /** Destino do CTA quando a aula está bloqueada. */
  courseHref: string;
  /** Efeitos sem UI (ex.: registro de retomada). */
  children?: ReactNode;
}

/**
 * Tela da aula dentro do `PlayerShell`. Server Component: recebe dados prontos e não faz I/O,
 * por isso a mesma tela serve a página real e a vitrine `/dev/player`.
 */
export function PlayerView({
  course,
  lesson,
  totalLessons,
  completedCount,
  outline,
  materials,
  canOpen,
  hasAccess,
  prev,
  next,
  backHref = '/minha-biblioteca',
  courseHref,
  children,
}: PlayerViewProps) {
  const duration = formatDuration(lesson.durationSeconds);

  return (
    <PlayerShell
      backHref={backHref}
      courseTitle={course.title}
      progress={{ total: totalLessons, completed: completedCount }}
      outline={<LessonOutline modules={outline} showPreviewBadge={!hasAccess} />}
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
      // Concluir aula é STUDENT-007: aqui só reserva o espaço do slot.
      complete={
        <Button disabled fullWidth aria-label="Concluir aula (em breve)">
          Em breve
        </Button>
      }
      next={
        next ? (
          <Button
            href={next.href}
            prefetch
            aria-label={`Próxima: ${next.title}`}
            aria-keyshortcuts="]"
          >
            Próxima
          </Button>
        ) : (
          <Button disabled>Próxima</Button>
        )
      }
    >
      <article key={lesson.id} aria-labelledby={`${lesson.id}-title`} className={styles.lesson}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>
            Módulo {lesson.moduleNumber} · Aula {lesson.number} de {totalLessons}
          </p>
          <LessonTitle id={`${lesson.id}-title`}>{lesson.title}</LessonTitle>
          <p className={styles.meta}>
            <span>{lesson.moduleTitle}</span>
            {duration ? <span>{duration}</span> : null}
            {lesson.isPreview && !hasAccess ? <Badge tone="mint">Prévia gratuita</Badge> : null}
          </p>
          {lesson.summary ? <p className={styles.summary}>{lesson.summary}</p> : null}
        </header>

        {canOpen ? (
          <Materials materials={materials} />
        ) : (
          <EmptyState
            illustration={<LockIcon />}
            title="Esta aula faz parte do curso completo"
            description="Garanta o acesso para assistir a esta aula e a todas as outras. As aulas de prévia continuam abertas."
            action={<Button href={courseHref}>Ver o curso</Button>}
          />
        )}

        <p className={styles.hint}>
          Atalhos: <kbd>[</kbd> aula anterior · <kbd>]</kbd> próxima aula · <kbd>Alt</kbd>+
          <kbd>Shift</kbd>+<kbd>←</kbd>/<kbd>→</kbd>
        </p>
      </article>
      <LessonShortcuts prevHref={prev?.href ?? null} nextHref={next?.href ?? null} />
      {children}
    </PlayerShell>
  );
}
