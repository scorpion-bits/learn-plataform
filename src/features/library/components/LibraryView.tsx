import Link from 'next/link';

import { EmptyState, Button } from '@/components/ui';

import { LIBRARY_TABS, TAB_LABEL, countByTab, filterByTab } from '../model';
import type { LibraryTab } from '../model';

import { LibraryCard } from './LibraryCard';
import type { LibraryCardCourse } from './LibraryCard';
import styles from './LibraryView.module.css';

export interface LibraryViewProps {
  courses: LibraryCardCourse[];
  tab: LibraryTab;
  /** Href de cada aba (a página real usa `?aba=`; a vitrine, o próprio caminho). */
  tabHref: (tab: LibraryTab) => string;
  catalogHref?: string;
}

const EMPTY: Record<LibraryTab, { title: string; description: string }> = {
  'em-andamento': {
    title: 'Nada em andamento',
    description: 'Você concluiu todos os seus cursos. Que tal conhecer outros?',
  },
  concluidos: {
    title: 'Nenhum curso concluído ainda',
    description: 'Conclua todas as aulas de um curso e ele aparece aqui.',
  },
  todos: {
    title: 'Sua biblioteca está vazia',
    description: 'Os cursos que você comprar ou receber aparecem aqui.',
  },
};

/** Biblioteca do aluno: abas (links, sem JS) + grade de cursos. Server Component. */
export function LibraryView({ courses, tab, tabHref, catalogHref = '/cursos' }: LibraryViewProps) {
  const counts = countByTab(courses);
  const visible = filterByTab(courses, tab);
  const libraryEmpty = courses.length === 0;
  const empty = EMPTY[libraryEmpty ? 'todos' : tab];

  return (
    <div className={styles.page}>
      <header>
        <p className={styles.eyebrow}>Área do aluno</p>
        <h1 className={styles.title}>Minha biblioteca</h1>
      </header>

      {libraryEmpty ? null : (
        <nav aria-label="Filtrar cursos" className={styles.tabs}>
          {LIBRARY_TABS.map((t) => (
            <Link
              key={t}
              href={tabHref(t)}
              className={styles.tab}
              aria-current={t === tab ? 'page' : undefined}
              replace
              scroll={false}
            >
              {TAB_LABEL[t]}
              <span className={styles.badge} aria-hidden="true">
                {counts[t]}
              </span>
              <span className={styles.sr}>, {counts[t]}</span>
            </Link>
          ))}
        </nav>
      )}

      {visible.length > 0 ? (
        <ul className={styles.grid} aria-label={TAB_LABEL[tab]}>
          {visible.map((course, i) => (
            <LibraryCard key={course.courseId} course={course} priority={i < 2} />
          ))}
        </ul>
      ) : (
        <EmptyState
          title={empty.title}
          description={empty.description}
          action={
            libraryEmpty || tab === 'em-andamento' ? (
              <Button href={catalogHref}>Ver cursos</Button>
            ) : (
              <Button href={tabHref('todos')} variant="secondary">
                Ver todos os cursos
              </Button>
            )
          }
        />
      )}
    </div>
  );
}
