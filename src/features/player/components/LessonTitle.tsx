'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import styles from './PlayerView.module.css';

// Vive enquanto a página não é recarregada: a 1ª montagem (carga direta) não rouba o foco;
// as seguintes (navegação entre aulas) levam o foco ao título.
let hasMounted = false;

/**
 * `<h1>` da aula, focável por programação. Ao navegar para outra aula (a página usa
 * `key={lessonId}`), rola o conteúdo ao topo e move o foco para cá, anunciando a nova aula
 * ao leitor de tela e mantendo o teclado no início do conteúdo.
 */
export function LessonTitle({ id, children }: { id: string; children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  // lido na 1ª renderização (antes do efeito marcar): o StrictMode repete o efeito, não o estado
  const [moveFocus] = useState(() => hasMounted);

  useEffect(() => {
    if (moveFocus && ref.current) {
      ref.current.closest('main')?.scrollTo({ top: 0 });
      ref.current.focus({ preventScroll: true });
    }
    hasMounted = true;
  }, [moveFocus]);

  return (
    <h1 ref={ref} id={id} tabIndex={-1} className={styles.title}>
      {children}
    </h1>
  );
}
