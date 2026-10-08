import { describe, expect, it } from 'vitest';

import { adjustedCompletedCount, isCourseComplete, progressAnnouncement } from './progress';

describe('adjustedCompletedCount', () => {
  const base = { serverCount: 3, total: 8 };
  it('concluir aula pendente soma 1', () => {
    expect(
      adjustedCompletedCount({ ...base, serverCompleted: false, optimisticCompleted: true }),
    ).toBe(4);
  });
  it('desfazer aula concluída subtrai 1', () => {
    expect(
      adjustedCompletedCount({ ...base, serverCompleted: true, optimisticCompleted: false }),
    ).toBe(2);
  });
  it('sem mudança, mantém', () => {
    expect(
      adjustedCompletedCount({ ...base, serverCompleted: true, optimisticCompleted: true }),
    ).toBe(3);
  });
  it('nunca sai de 0..total', () => {
    expect(
      adjustedCompletedCount({
        serverCount: 0,
        total: 8,
        serverCompleted: true,
        optimisticCompleted: false,
      }),
    ).toBe(0);
    expect(
      adjustedCompletedCount({
        serverCount: 8,
        total: 8,
        serverCompleted: false,
        optimisticCompleted: true,
      }),
    ).toBe(8);
  });
});

describe('isCourseComplete', () => {
  it('só com todas concluídas e curso não vazio', () => {
    expect(isCourseComplete(8, 8)).toBe(true);
    expect(isCourseComplete(7, 8)).toBe(false);
    expect(isCourseComplete(0, 0)).toBe(false);
  });
});

describe('progressAnnouncement', () => {
  it('anuncia conclusão com contagem e percentual', () => {
    expect(progressAnnouncement({ completed: true, completedCount: 3, total: 8 })).toBe(
      'Aula concluída. Progresso do curso: 3 de 8 aulas, 38%.',
    );
  });
  it('anuncia desfazer e singular', () => {
    expect(progressAnnouncement({ completed: false, completedCount: 0, total: 1 })).toBe(
      'Conclusão desfeita. Progresso do curso: 0 de 1 aula, 0%.',
    );
  });
});
