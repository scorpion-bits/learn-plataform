import Link from 'next/link';

import { Badge, EmptyState, Pagination, Table } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { formatDate } from '@/features/students/format';
import { PAGE_SIZE } from '@/features/students/schemas';

import type { CourseStudent } from '../model';
import styles from './CourseStudents.module.css';

/** Tabela (cartões no mobile) + paginação + vazio. Puro: serve ao painel e à vitrine. */
export function CourseStudentsList({
  rows,
  total,
  page,
  q,
  basePath,
}: {
  rows: CourseStudent[];
  total: number;
  page: number;
  q: string;
  /** Página do curso; os links mantêm `tab=students`. */
  basePath: string;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title={q ? 'Nenhum aluno encontrado' : 'Nenhum aluno matriculado'}
        description={
          q
            ? `Nada para “${q}”. Confira a grafia do nome ou email.`
            : 'Quem comprar ou receber este curso aparece aqui.'
        }
      />
    );
  }

  const columns: TableColumn<CourseStudent>[] = [
    {
      key: 'name',
      header: 'Aluno',
      render: (s) => (
        <span className={styles.cell}>
          <Link className={styles.link} href={`/admin/alunos/${s.userId}`}>
            {s.fullName || 'Sem nome'}
          </Link>
          <span className={styles.dim}>{s.email}</span>
        </span>
      ),
    },
    {
      key: 'source',
      header: 'Origem',
      render: (s) =>
        s.source === 'purchase' ? (
          <Badge tone="cyan">Compra</Badge>
        ) : (
          <Badge tone="violet">Atribuição</Badge>
        ),
    },
    { key: 'since', header: 'Desde', render: (s) => formatDate(s.grantedAt) },
    {
      key: 'status',
      header: 'Status',
      render: (s) =>
        s.revokedAt ? <Badge tone="neutral">Revogada</Badge> : <Badge tone="mint">Ativa</Badge>,
    },
    {
      key: 'progress',
      header: 'Progresso',
      render: (s) => (
        <span className={styles.progress}>
          <span>
            {s.progressPercent}% · {s.completedCount}/{s.lessonCount} aulas
          </span>
          <span
            className={styles.bar}
            role="progressbar"
            aria-label={`Progresso de ${s.fullName || s.email}`}
            aria-valuenow={s.progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span className={styles.barFill} style={{ width: `${s.progressPercent}%` }} />
          </span>
        </span>
      ),
    },
  ];

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number) => {
    const params = new URLSearchParams({ tab: 'students' });
    if (q) params.set('q', q);
    if (p > 1) params.set('pagina', String(p));
    return `${basePath}?${params.toString()}`;
  };

  return (
    <>
      <p className={styles.dim} aria-live="polite">
        {total} {total === 1 ? 'matrícula' : 'matrículas'}
        {q ? ` para “${q}”` : ''}
      </p>
      <Table
        caption="Alunos do curso"
        columns={columns}
        rows={rows}
        getRowKey={(s) => s.enrollmentId}
      />
      <Pagination
        page={page}
        pageCount={pageCount}
        buildHref={href}
        label="Paginação de alunos do curso"
      />
    </>
  );
}
