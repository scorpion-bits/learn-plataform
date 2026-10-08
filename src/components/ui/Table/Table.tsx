import type { Key, ReactNode } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './Table.module.css';

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  /** Texto usado como rótulo na lista empilhada (< 720px). Padrão: header, se for string. */
  label?: string;
  render: (row: T) => ReactNode;
  align?: 'start' | 'end';
}

export interface TableProps<T> {
  caption: string;
  columns: TableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => Key;
  className?: string;
}

/** Tabela semântica; abaixo de 720px cada linha vira um cartão com "rótulo: valor" (data-label). */
export function Table<T>({ caption, columns, rows, getRowKey, className }: TableProps<T>) {
  return (
    <div className={cx(styles.wrap, className)}>
      <table className={styles.table}>
        <caption className="visually-hidden">{caption}</caption>
        <thead className={styles.head}>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cx(c.align === 'end' && styles.end)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)} className={styles.row}>
              {columns.map((c) => (
                <td
                  key={c.key}
                  data-label={c.label ?? (typeof c.header === 'string' ? c.header : undefined)}
                  className={cx(c.align === 'end' && styles.end)}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
