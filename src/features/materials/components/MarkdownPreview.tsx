import { parseMarkdown } from '../markdown';
import styles from './MaterialsEditor.module.css';

/**
 * Prévia simples do markdown. Só elementos React com texto (escapado pelo React):
 * nenhum HTML cru, nenhum `dangerouslySetInnerHTML`, links não são ativados.
 */
export function MarkdownPreview({ source }: { source: string }) {
  const blocks = parseMarkdown(source);
  if (blocks.length === 0) {
    return <p className={styles.hint}>A prévia aparece aqui conforme você escreve.</p>;
  }
  return (
    <div className={styles.preview}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'heading': {
            const Tag = (['h4', 'h5', 'h6'] as const)[block.level - 1]!;
            return <Tag key={i}>{block.text}</Tag>;
          }
          case 'paragraph':
            return <p key={i}>{block.text}</p>;
          case 'list': {
            const List = block.ordered ? 'ol' : 'ul';
            return (
              <List key={i}>
                {block.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </List>
            );
          }
          case 'code':
            return (
              <pre key={i}>
                <code>{block.text}</code>
              </pre>
            );
        }
      })}
    </div>
  );
}
