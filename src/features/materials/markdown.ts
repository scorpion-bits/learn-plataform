/**
 * Parser mínimo de markdown para a PRÉVIA do editor (sem lib, sem HTML).
 * Devolve blocos de dados; quem renderiza usa elementos React (texto sempre escapado).
 * Suporta: títulos (#..###, o resto vira texto), parágrafos, listas (- * + / 1.) e blocos
 * de código com cercas ```. Qualquer outra marcação aparece como texto literal.
 */

export type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'code'; text: string };

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const BULLET = /^\s*[-*+]\s+(.*)$/;
const ORDERED = /^\s*\d{1,9}[.)]\s+(.*)$/;
const FENCE = /^\s*```/;

export function parseMarkdown(source: string): MarkdownBlock[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) blocks.push({ type: 'paragraph', text: paragraph.join('\n') });
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';

    if (FENCE.test(line)) {
      flushParagraph();
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !FENCE.test(lines[i] ?? '')) {
        code.push(lines[i] ?? '');
        i += 1;
      }
      blocks.push({ type: 'code', text: code.join('\n') });
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flushParagraph();
      const level = Math.min(heading[1]!.length, 3) as 1 | 2 | 3;
      blocks.push({ type: 'heading', level, text: heading[2] ?? '' });
      continue;
    }

    const bullet = BULLET.exec(line);
    const ordered = bullet ? null : ORDERED.exec(line);
    const item = bullet ?? ordered;
    if (item) {
      flushParagraph();
      const isOrdered = Boolean(ordered);
      const previous = blocks[blocks.length - 1];
      if (previous?.type === 'list' && previous.ordered === isOrdered) {
        previous.items.push(item[1] ?? '');
      } else {
        blocks.push({ type: 'list', ordered: isOrdered, items: [item[1] ?? ''] });
      }
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  return blocks;
}
