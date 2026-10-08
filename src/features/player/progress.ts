/** Regras puras de progresso do player (sem I/O). */

/** Texto lido por leitores de tela após concluir/desfazer. */
export function progressAnnouncement(input: {
  completed: boolean;
  completedCount: number;
  total: number;
}): string {
  const { completed, completedCount, total } = input;
  const done = Math.min(total, Math.max(0, completedCount));
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const lead = completed ? 'Aula concluída.' : 'Conclusão desfeita.';
  const unit = total === 1 ? 'aula' : 'aulas';
  return `${lead} Progresso do curso: ${done} de ${total} ${unit}, ${percent}%.`;
}

/**
 * Contagem exibida durante a atualização otimista: base do servidor, ajustada pela diferença
 * entre o estado da aula agora (`optimistic`) e o que o servidor sabe (`server`).
 */
export function adjustedCompletedCount(input: {
  serverCount: number;
  serverCompleted: boolean;
  optimisticCompleted: boolean;
  total: number;
}): number {
  const { serverCount, serverCompleted, optimisticCompleted, total } = input;
  const delta = Number(optimisticCompleted) - Number(serverCompleted);
  return Math.min(total, Math.max(0, serverCount + delta));
}

export function isCourseComplete(completedCount: number, total: number): boolean {
  return total > 0 && completedCount >= total;
}
