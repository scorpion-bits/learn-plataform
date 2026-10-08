import { describe, expect, it } from 'vitest';

import { parseMarkdown } from './markdown';

describe('parseMarkdown', () => {
  it('texto vazio => sem blocos', () => {
    expect(parseMarkdown('')).toEqual([]);
    expect(parseMarkdown('  \n\n ')).toEqual([]);
  });

  it('títulos, parágrafos e listas', () => {
    expect(
      parseMarkdown('# Título\n\nUma linha\nsegunda linha\n\n- a\n- b\n\n1. um\n2. dois'),
    ).toEqual([
      { type: 'heading', level: 1, text: 'Título' },
      { type: 'paragraph', text: 'Uma linha\nsegunda linha' },
      { type: 'list', ordered: false, items: ['a', 'b'] },
      { type: 'list', ordered: true, items: ['um', 'dois'] },
    ]);
  });

  it('níveis além de 3 viram nível 3', () => {
    expect(parseMarkdown('###### x')).toEqual([{ type: 'heading', level: 3, text: 'x' }]);
  });

  it('blocos de código mantêm o conteúdo literal (inclusive HTML) e fecham no fim do texto', () => {
    expect(parseMarkdown('```\n<script>alert(1)</script>\n# não é título\n```')).toEqual([
      { type: 'code', text: '<script>alert(1)</script>\n# não é título' },
    ]);
    expect(parseMarkdown('```\nsem fecho')).toEqual([{ type: 'code', text: 'sem fecho' }]);
  });

  it('HTML cru fica como texto (quem renderiza escapa)', () => {
    expect(parseMarkdown('<img src=x onerror=alert(1)>')).toEqual([
      { type: 'paragraph', text: '<img src=x onerror=alert(1)>' },
    ]);
  });
});
