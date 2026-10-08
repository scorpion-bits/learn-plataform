import { ChamferCard, CubeProgress, IsoCover } from '@/components/brand';
import { Badge, Button } from '@/components/ui';
import { pluralLessons } from '@/features/catalog/model';

import { ORIGIN_LABEL, continueHref } from '../model';
import type { LibraryCourse } from '../model';

import styles from './ContinueCard.module.css';

/** Card grande de "Continuar de onde parou": capa, aula de retomada e progresso. */
export function ContinueCard({
  course,
  lessonTitle,
}: {
  course: LibraryCourse & { coverUrl: string | null };
  lessonTitle: string | null;
}) {
  const label = course.isCompleted ? 'Revisar curso' : 'Continuar';
  return (
    <ChamferCard as="article" aria-labelledby="continue-title">
      <div className={styles.card}>
        <div className={styles.cover}>
          <IsoCover
            src={course.coverUrl}
            alt=""
            title={course.title}
            priority
            sizes="(max-width: 720px) 100vw, 520px"
          />
        </div>
        <div className={styles.info}>
          <div className={styles.badges}>
            <Badge tone={course.isCompleted ? 'mint' : 'cyan'}>
              {course.isCompleted ? 'Concluído' : 'Em andamento'}
            </Badge>
            <Badge tone="neutral">{ORIGIN_LABEL[course.origin]}</Badge>
          </div>
          <h2 id="continue-title" className={styles.title}>
            {course.title}
          </h2>
          {lessonTitle && !course.isCompleted ? (
            <p className={styles.lesson}>
              <span className={styles.lessonLabel}>Retomar em</span> {lessonTitle}
            </p>
          ) : null}
          <CubeProgress
            size="md"
            total={course.lessonCount}
            completed={course.completedCount}
            label={`Progresso em ${course.title}`}
            tone={course.isCompleted ? 'mint' : 'cyan'}
          />
          <p className={styles.count}>
            {course.completedCount} de {pluralLessons(course.lessonCount)} concluídas
          </p>
          <Button href={continueHref(course)} size="lg">
            {label}
          </Button>
        </div>
      </div>
    </ChamferCard>
  );
}
