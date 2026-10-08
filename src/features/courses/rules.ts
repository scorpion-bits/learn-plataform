/** Regras puras (sem server-only) compartilhadas por action e UI. */

export const COVERS_BUCKET_NAME = 'course-covers';

export interface PublishCandidate {
  title: string;
  priceCents: number;
  coverPath: string | null;
  lessonCount: number;
}

/** O que impede a publicação (mensagens em pt-BR, vazio = pode publicar). */
export function publishBlockers(course: PublishCandidate): string[] {
  const missing: string[] = [];
  if (!course.title.trim()) missing.push('título');
  if (course.priceCents <= 0) missing.push('preço maior que zero');
  if (!course.coverPath) missing.push('capa');
  if (course.lessonCount < 1) missing.push('pelo menos uma aula');
  return missing;
}
