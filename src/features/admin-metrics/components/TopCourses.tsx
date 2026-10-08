import Link from 'next/link';

import { IsoCube } from '@/components/brand';
import { EmptyState, Table } from '@/components/ui';
import type { TableColumn } from '@/components/ui';

import { formatBRL, formatInt } from '../model';
import type { TopCourse } from '../model';
import styles from './TopCourses.module.css';

const COLUMNS: TableColumn<TopCourse>[] = [
  {
    key: 'title',
    header: 'Curso',
    render: (c) => (
      <Link className={styles.link} href={`/admin/cursos/${c.courseId}`}>
        {c.title}
      </Link>
    ),
  },
  { key: 'sales', header: 'Vendas', render: (c) => formatInt(c.sales), align: 'end' },
  {
    key: 'revenue',
    header: 'Receita líquida',
    render: (c) => formatBRL(c.revenueCents),
    align: 'end',
  },
];

export function TopCourses({ courses }: { courses: TopCourse[] }) {
  if (courses.length === 0) {
    return (
      <EmptyState
        headingLevel={3}
        title="Nenhuma venda no período"
        description="Quando houver vendas, os cursos mais vendidos aparecem aqui."
        illustration={<IsoCube size={48} state="empty" />}
      />
    );
  }
  return (
    <Table
      caption="Cursos com maior receita líquida no período"
      columns={COLUMNS}
      rows={courses}
      getRowKey={(c) => c.courseId}
    />
  );
}
