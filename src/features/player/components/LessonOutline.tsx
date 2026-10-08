import Link from 'next/link';

import { Badge } from '@/components/ui';

import type { LessonState, OutlineLessonView, OutlineModuleView } from '../model';

import { CheckIcon, LockIcon } from './icons';
import styles from './LessonOutline.module.css';

const STATE_TEXT: Record<LessonState, string | null> = {
  current: 'aula atual',
  completed: 'concluída',
  locked: 'bloqueada, disponível após a compra do curso',
  available: null,
};

function Marker({ lesson, index }: { lesson: OutlineLessonView; index: number }) {
  return (
    <span className={`${styles.marker} ${styles[lesson.state]}`} aria-hidden="true">
      {lesson.completed ? <CheckIcon /> : lesson.state === 'locked' ? <LockIcon /> : index}
    </span>
  );
}

/**
 * Ementa do player (módulos e aulas) com estado por aula. Aula atual leva `aria-current`;
 * bloqueada não é link. Renderizada no painel lateral (desktop) e no Drawer (mobile).
 */
export function LessonOutline({
  modules,
  showPreviewBadge,
}: {
  modules: OutlineModuleView[];
  /** Selo "Prévia" nas aulas abertas sem compra. */
  showPreviewBadge: boolean;
}) {
  return (
    <nav aria-label="Módulos e aulas">
      <ol className={styles.modules}>
        {modules.map((mod, moduleIndex) => (
          <li key={mod.id}>
            <h3 className={styles.moduleTitle}>
              {moduleIndex + 1}. {mod.title}
            </h3>
            <ol className={styles.lessons}>
              {mod.lessons.map((lesson, lessonIndex) => {
                const baseText = STATE_TEXT[lesson.state];
                const stateText =
                  lesson.state === 'current' && lesson.completed
                    ? 'aula atual, concluída'
                    : baseText;
                const body = (
                  <>
                    <Marker lesson={lesson} index={lessonIndex + 1} />
                    <span className={styles.text}>
                      <span className={styles.name}>{lesson.title}</span>
                      {stateText ? <span className={styles.srOnly}>, {stateText}</span> : null}
                      {lesson.durationLabel ? (
                        <span className={styles.duration}>{lesson.durationLabel}</span>
                      ) : null}
                    </span>
                    {showPreviewBadge && lesson.isPreview ? (
                      <Badge tone="mint">Prévia</Badge>
                    ) : null}
                  </>
                );
                return (
                  <li key={lesson.id}>
                    {lesson.href ? (
                      <Link
                        href={lesson.href}
                        className={styles.lesson}
                        aria-current={lesson.state === 'current' ? 'page' : undefined}
                      >
                        {body}
                      </Link>
                    ) : (
                      <span className={`${styles.lesson} ${styles.disabled}`}>{body}</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>
    </nav>
  );
}
