import { ChamferCard, CubeProgress, IsoCover } from '@/components/brand';
import { Badge, Button } from '@/components/ui';
import { pluralLessons } from '@/features/catalog/model';

import { ORIGIN_LABEL, continueHref } from '../model';
import type { LibraryCourse } from '../model';

import styles from './LibraryCard.module.css';

export type LibraryCardCourse = LibraryCourse & { coverUrl: string | null };

/** Card de curso da biblioteca: capa, selo de origem, progresso e "Continuar". */
export function LibraryCard({
  course,
  priority,
}: {
  course: LibraryCardCourse;
  priority?: boolean;
}) {
  const label = course.isCompleted
    ? 'Revisar'
    : course.completedCount > 0 || course.lastLessonId
      ? 'Continuar'
      : 'Começar';
  return (
    <li className={styles.item}>
      <ChamferCard as="article" padding="none" className={styles.card}>
        <div className={styles.cover}>
          <IsoCover
            src={course.coverUrl}
            alt=""
            title={course.title}
            priority={priority}
            sizes="(max-width: 720px) 100vw, 360px"
          />
        </div>
        <div className={styles.body}>
          <div className={styles.badges}>
            <Badge tone={course.origin === 'purchase' ? 'cyan' : 'violet'}>
              {ORIGIN_LABEL[course.origin]}
            </Badge>
            {course.isCompleted ? <Badge tone="mint">Concluído</Badge> : null}
          </div>
          <h2 className={styles.title}>{course.title}</h2>
          <p className={styles.count}>
            {course.completedCount} de {pluralLessons(course.lessonCount)} concluídas
          </p>
          <CubeProgress
            size="sm"
            maxVisible={10}
            total={course.lessonCount}
            completed={course.completedCount}
            label={`Progresso em ${course.title}`}
            tone={course.isCompleted ? 'mint' : 'cyan'}
          />
          <Button
            href={continueHref(course)}
            variant={course.isCompleted ? 'secondary' : 'primary'}
            fullWidth
            aria-label={`${label}: ${course.title}`}
          >
            {label}
          </Button>
        </div>
      </ChamferCard>
    </li>
  );
}
