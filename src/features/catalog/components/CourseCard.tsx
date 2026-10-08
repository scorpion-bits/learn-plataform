import Link from 'next/link';

import { ChamferCard, IsoCover } from '@/components/brand';
import { Badge } from '@/components/ui';

import { formatDuration, formatPrice, pluralLessons } from '../model';
import { LevelCubes } from './LevelCubes';
import styles from './CourseCard.module.css';
import type { CourseView } from './types';

export interface CourseCardProps {
  course: CourseView;
  owned?: boolean;
  /** Primeiro item do catálogo: largura dupla no desktop. */
  featured?: boolean;
  /** Primeira(s) capa(s) visíveis: carrega com prioridade. */
  priority?: boolean;
}

/**
 * Card do catálogo. Link único: o título (h3) é o <a>, esticado por ::after sobre
 * o card; o resto é texto. Leitor de tela lê "título" como nome do link.
 */
export function CourseCard({ course, owned, featured, priority }: CourseCardProps) {
  const duration = formatDuration(course.durationSeconds);
  return (
    <li className={styles.item} data-featured={featured ? 'true' : undefined}>
      <ChamferCard as="article" interactive padding="none" className={styles.card}>
        <div className={styles.layout}>
          <div className={styles.cover}>
            <IsoCover
              src={course.coverUrl}
              alt=""
              title={course.title}
              priority={priority}
              sizes={
                featured ? '(max-width: 720px) 100vw, 640px' : '(max-width: 720px) 100vw, 360px'
              }
            />
          </div>
          <div className={styles.body}>
            <div className={styles.meta}>
              {course.categoryName && (
                <span className={styles.category}>{course.categoryName}</span>
              )}
              {owned && <Badge tone="mint">Na sua biblioteca</Badge>}
            </div>
            <h3 className={styles.title}>
              <Link href={`/cursos/${course.slug}`} className={styles.link}>
                {course.title}
              </Link>
            </h3>
            {course.subtitle && <p className={styles.subtitle}>{course.subtitle}</p>}
            <p className={styles.level}>
              <LevelCubes level={course.level} />
            </p>
            <dl className={styles.facts}>
              <div>
                <dt className={styles.dt}>Aulas</dt>
                <dd>{pluralLessons(course.lessonCount)}</dd>
              </div>
              {duration && (
                <div>
                  <dt className={styles.dt}>Duração</dt>
                  <dd>{duration}</dd>
                </div>
              )}
              <div className={styles.price}>
                <dt className={styles.dt}>Preço</dt>
                <dd>{formatPrice(course.priceCents)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </ChamferCard>
    </li>
  );
}
