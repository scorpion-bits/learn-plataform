import Link from 'next/link';

import { Badge, EmptyState, Table } from '@/components/ui';
import type { BadgeTone, TableColumn } from '@/components/ui';

import { formatBRL, formatDate, formatRevokeReason } from '../format';
import type { StudentEnrollment, StudentOrder, StudentProfile } from '../model';
import { ORDER_STATUS_LABELS, SOURCE_LABELS } from '../schemas';
import { GrantCourseForm, RevokeEnrollmentButton } from './EnrollmentActions';
import styles from './Students.module.css';

const ORDER_TONES: Record<StudentOrder['status'], BadgeTone> = {
  pending: 'amber',
  paid: 'mint',
  failed: 'coral',
  expired: 'neutral',
  refunded: 'violet',
  canceled: 'neutral',
};

/** Perfil do aluno. `demo` liga as ações em modo simulado (vitrine). */
export function StudentProfileView({
  profile,
  grantable,
  listPath,
  demo,
}: {
  profile: StudentProfile;
  grantable: { id: string; title: string }[];
  listPath: string;
  demo?: boolean;
}) {
  const enrollmentCols: TableColumn<StudentEnrollment>[] = [
    {
      key: 'course',
      header: 'Curso',
      render: (e) => (
        <span className={styles.cell}>
          <span className={e.revokedAt ? styles.revokedTitle : styles.link}>{e.courseTitle}</span>
          {e.revokedAt ? (
            <span className={styles.dim}>
              Revogada em {formatDate(e.revokedAt)}: {formatRevokeReason(e.revokeReason)}
            </span>
          ) : (
            <span className={styles.dim}>Desde {formatDate(e.grantedAt)}</span>
          )}
        </span>
      ),
    },
    {
      key: 'source',
      header: 'Origem',
      render: (e) => (
        <Badge tone={e.source === 'purchase' ? 'cyan' : 'violet'}>{SOURCE_LABELS[e.source]}</Badge>
      ),
    },
    {
      key: 'state',
      header: 'Estado',
      render: (e) =>
        e.revokedAt ? <Badge tone="neutral">Revogada</Badge> : <Badge tone="mint">Ativa</Badge>,
    },
    {
      key: 'progress',
      header: 'Progresso',
      render: (e) => (
        <span className={styles.progress}>
          <span>
            {e.progressPercent}% · {e.completedCount}/{e.lessonCount} aulas
          </span>
          <span
            className={styles.bar}
            role="progressbar"
            aria-label={`Progresso em ${e.courseTitle}`}
            aria-valuenow={e.progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span className={styles.barFill} style={{ width: `${e.progressPercent}%` }} />
          </span>
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (e) =>
        e.revokedAt ? null : (
          <RevokeEnrollmentButton
            kind={e.source === 'purchase' ? 'purchase' : 'assignment'}
            enrollmentId={e.id}
            userId={profile.id}
            courseTitle={e.courseTitle}
            demo={demo}
          />
        ),
    },
  ];

  const orderCols: TableColumn<StudentOrder>[] = [
    { key: 'course', header: 'Curso', render: (o) => o.courseTitle },
    {
      key: 'status',
      header: 'Status',
      render: (o) => (
        <span className={styles.cell}>
          <Badge tone={ORDER_TONES[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Badge>
          {o.source === 'manual' ? <span className={styles.dim}>Venda manual</span> : null}
        </span>
      ),
    },
    { key: 'amount', header: 'Valor', render: (o) => formatBRL(o.amountCents), align: 'end' },
    { key: 'date', header: 'Data', render: (o) => formatDate(o.createdAt) },
    {
      key: 'refund',
      header: 'Reembolso',
      render: (o) =>
        o.refundRequestedAt ? (
          <span className={styles.cell}>
            <span>Solicitado em {formatDate(o.refundRequestedAt)}</span>
            {o.refundRequestedProgress !== null ? (
              <span className={styles.dim}>{o.refundRequestedProgress}% consumido</span>
            ) : null}
          </span>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <div className={styles.section}>
      <div className={styles.profileHead}>
        <Link className={styles.back} href={listPath}>
          ← Alunos
        </Link>
        <h1>{profile.fullName || 'Sem nome'}</h1>
        <p className={styles.dim}>
          {profile.email ?? 'Email indisponível'} · cadastrado em {formatDate(profile.createdAt)}
        </p>
      </div>

      <section className={styles.section} aria-labelledby="sec-enroll">
        <h2 id="sec-enroll" className={styles.sectionTitle}>
          Matrículas
        </h2>
        {profile.enrollments.length === 0 ? (
          <EmptyState title="Sem matrículas" description="Este aluno ainda não tem cursos." />
        ) : (
          <Table
            caption="Matrículas do aluno"
            columns={enrollmentCols}
            rows={profile.enrollments}
            getRowKey={(e) => e.id}
          />
        )}
        <GrantCourseForm userId={profile.id} courses={grantable} demo={demo} />
      </section>

      <section className={styles.section} aria-labelledby="sec-orders">
        <h2 id="sec-orders" className={styles.sectionTitle}>
          Pedidos
        </h2>
        {profile.orders.length === 0 ? (
          <EmptyState title="Sem pedidos" description="Nenhum pedido registrado para este aluno." />
        ) : (
          <Table
            caption="Pedidos do aluno"
            columns={orderCols}
            rows={profile.orders}
            getRowKey={(o) => o.id}
          />
        )}
      </section>
    </div>
  );
}
