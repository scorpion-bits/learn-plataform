import { Fragment } from 'react';
import type { ReactNode } from 'react';

import { parseMarkdown } from '@/features/materials/markdown';

import { tokenizeInline } from '../../model';

import styles from './Materials.module.css';

/** Marcação inline -> elementos React (texto sempre escapado; links só http(s)). */
function Inline({ text }: { text: string }) {
  return (
    <>
      {tokenizeInline(text).map((token, i) => {
        switch (token.type) {
          case 'code':
            return <code key={i}>{token.text}</code>;
          case 'strong':
            return <strong key={i}>{token.text}</strong>;
          case 'em':
            return <em key={i}>{token.text}</em>;
          case 'link':
            return (
              <a key={i} href={token.href} target="_blank" rel="noopener noreferrer">
                {token.text}
              </a>
            );
          default:
            return <Fragment key={i}>{token.text}</Fragment>;
        }
      })}
    </>
  );
}

/**
 * Texto da aula: markdown mínimo (títulos, parágrafos, listas, código) renderizado como
 * elementos React, nunca como HTML cru. Títulos começam em h3 (h1 = aula, h2 = material).
 */
export function TextMaterial({ body }: { body: string }) {
  const blocks = parseMarkdown(body);

  return (
    <div className={styles.prose}>
      {blocks.map((block, i): ReactNode => {
        switch (block.type) {
          case 'heading': {
            const Tag = `h${block.level + 2}` as 'h3' | 'h4' | 'h5';
            return (
              <Tag key={i}>
                <Inline text={block.text} />
              </Tag>
            );
          }
          case 'list': {
            const Tag = block.ordered ? 'ol' : 'ul';
            return (
              <Tag key={i}>
                {block.items.map((item, j) => (
                  <li key={j}>
                    <Inline text={item} />
                  </li>
                ))}
              </Tag>
            );
          }
          case 'code':
            return (
              <pre key={i} tabIndex={0}>
                <code>{block.text}</code>
              </pre>
            );
          default:
            return (
              <p key={i}>
                <Inline text={block.text} />
              </p>
            );
        }
      })}
    </div>
  );
}
