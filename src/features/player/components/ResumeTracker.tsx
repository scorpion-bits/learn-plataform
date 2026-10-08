'use client';

import { useEffect } from 'react';

import { registerLessonVisit } from '../actions';

/**
 * Registra "o aluno abriu esta aula" (retomada) depois que a página já está na tela:
 * é um efeito do cliente, então não atrasa a renderização nem dispara no prefetch da
 * próxima aula. Falha silenciosa: retomar é conforto, não pode atrapalhar o estudo.
 */
export function ResumeTracker({ lessonId }: { lessonId: string }) {
  useEffect(() => {
    registerLessonVisit({ lessonId }).catch(() => {});
  }, [lessonId]);

  return null;
}
