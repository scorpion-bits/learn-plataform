import Link from 'next/link';

import { Badge, EmptyState, Pagination, Table } from '@/components/ui';
import type { TableColumn } from '@/components/ui';

import { formatBRL, formatDate } from '../format';
import type { StudentListItem } from '../model';
import { PAGE_SIZE } from '../schemas';
import styles from './Students.module.css';

/** Tabela (cartões no mobile) + paginação + vazio. Puro: serve à página e à vitrine. */
export function StudentsList({
  rows,
  total,
  page,
  q,
  basePath,
}: {
  rows: StudentListItem[];
  total: number;
  page: number;
  q: string;
  basePath: string;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title={q ? 'Nenhum aluno encontrado' : 'Nenhum aluno ainda'}
        description={
          q
            ? `Nada para “${q}”. Confira a grafia do nome ou email.`
            : 'Os alunos aparecem aqui assim que criarem uma conta.'
        }
      />
    );
  }

  const columns: TableColumn<StudentListItem>[] = [
    {
      key: 'name',
      header: 'Aluno',
      render: (s) => (
        <span className={styles.cell}>
          <Link className={styles.link} href={`${basePath}/${s.id}`}>
            {s.fullName || 'Sem nome'}
          </Link>
          <span className={styles.dim}>{s.email}</span>
        </span>
      ),
    },
    {
      key: 'role',
      header: 'Papel',
      render: (s) => (s.isAdmin ? <Badge tone="violet">Admin</Badge> : <Badge>Aluno</Badge>),
    },
    { key: 'courses', header: 'Cursos', render: (s) => s.activeEnrollments, align: 'end' },
    {
      key: 'spent',
      header: 'Total pago',
      render: (s) => formatBRL(s.totalSpentCents),
      align: 'end',
    },
    { key: 'since', header: 'Cadastro', render: (s) => formatDate(s.createdAt) },
  ];

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (p > 1) params.set('pagina', String(p));
    const s = params.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  return (
    <>
      <p className={styles.dim} aria-live="polite">
        {total} {total === 1 ? 'aluno' : 'alunos'}
        {q ? ` para “${q}”` : ''}
      </p>
      <Table caption="Alunos" columns={columns} rows={rows} getRowKey={(s) => s.id} />
      <Pagination page={page} pageCount={pageCount} buildHref={qs} label="Paginação de alunos" />
    </>
  );
}
