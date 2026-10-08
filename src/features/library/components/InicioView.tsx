import { EmptyState, Button } from '@/components/ui';

import type { LibraryCourse } from '../model';

import { ContinueCard } from './ContinueCard';
import styles from './InicioView.module.css';

export interface InicioViewProps {
  name: string | null;
  /** Curso de "continuar" (`pickContinueCourse`), ou `null` sem cursos. */
  course: (LibraryCourse & { coverUrl: string | null }) | null;
  lessonTitle: string | null;
  libraryHref?: string;
  catalogHref?: string;
}

/** Início do aluno: continuar de onde parou + atalhos. Server Component. */
export function InicioView({
  name,
  course,
  lessonTitle,
  libraryHref = '/minha-biblioteca',
  catalogHref = '/cursos',
}: InicioViewProps) {
  return (
    <div className={styles.page}>
      <header>
        <p className={styles.eyebrow}>Área do aluno</p>
        <h1 className={styles.title}>{name ? `Olá, ${name}` : 'Olá'}</h1>
        <p className={styles.lead}>
          {course ? 'Continue de onde parou.' : 'Vamos começar a sua jornada.'}
        </p>
      </header>

      {course ? (
        <section aria-labelledby="continue-heading" className={styles.section}>
          <h2 id="continue-heading" className={styles.heading}>
            Continuar de onde parou
          </h2>
          <ContinueCard course={course} lessonTitle={lessonTitle} />
        </section>
      ) : (
        <EmptyState
          title="Você ainda não tem cursos"
          description="Escolha seu primeiro curso no catálogo e comece a criar jogos."
          action={<Button href={catalogHref}>Explorar cursos</Button>}
        />
      )}

      <section aria-labelledby="shortcuts-heading" className={styles.section}>
        <h2 id="shortcuts-heading" className={styles.heading}>
          Atalhos
        </h2>
        <div className={styles.shortcuts}>
          {course ? (
            <Button href={libraryHref} variant="secondary">
              Minha biblioteca
            </Button>
          ) : null}
          <Button href={catalogHref} variant="secondary">
            Ver catálogo de cursos
          </Button>
        </div>
      </section>
    </div>
  );
}
