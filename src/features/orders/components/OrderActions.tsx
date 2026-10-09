'use client';

import { useId, useState, useTransition } from 'react';

import { Button, Dialog, Field, Input, Select, useToast } from '@/components/ui';
import { formatBRL } from '@/features/students/format';

import { executeRefund, recheckPayment, recordManualSale } from '../actions';
import styles from './Orders.module.css';

/** `demo`: vitrine — não chama a action, só simula o sucesso. */
interface DemoProp {
  demo?: boolean;
}

export function RecheckButton({ orderId, demo }: DemoProp & { orderId: string }) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string }>();

  function run() {
    setResult(undefined);
    start(async () => {
      if (demo) {
        setResult({
          ok: true,
          message: 'Pagamento confirmado: acesso liberado ao aluno. (simulação)',
        });
        return;
      }
      const res = await recheckPayment({ orderId });
      if (res.ok) {
        setResult({ ok: res.data.granted, message: res.data.message });
        if (res.data.granted) toast({ tone: 'success', title: 'Pagamento confirmado' });
      } else setResult({ ok: false, message: res.error });
    });
  }

  return (
    <div className={styles.section}>
      <div className={styles.actions}>
        <Button type="button" variant="secondary" pending={pending} onClick={run}>
          Reconsultar pagamento
        </Button>
      </div>
      <div aria-live="polite">
        {result ? (
          <p className={`${styles.result} ${result.ok ? styles.resultOk : ''}`}>{result.message}</p>
        ) : null}
      </div>
    </div>
  );
}

export function RefundButton({
  orderId,
  courseTitle,
  amountCents,
  progressPercent,
  requested,
  demo,
}: DemoProp & {
  orderId: string;
  courseTitle: string;
  amountCents: number;
  progressPercent: number;
  /** O aluno já pediu o reembolso. */
  requested: boolean;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<string>();
  const formId = useId();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    start(async () => {
      if (demo) {
        setOpen(false);
        setDone(
          'Reembolso enviado — o acesso será removido quando a AbacatePay confirmar. (simulação)',
        );
        return;
      }
      const res = await executeRefund({ orderId });
      if (res.ok) {
        setOpen(false);
        setDone(res.data.message);
        toast({ tone: 'success', title: 'Reembolso enviado' });
      } else setError(res.error);
    });
  }

  return (
    <div className={styles.section}>
      <div className={styles.actions}>
        <Button type="button" variant="danger" onClick={() => setOpen(true)} disabled={!!done}>
          {requested ? 'Executar reembolso' : 'Reembolsar'}
        </Button>
      </div>
      <div aria-live="polite">
        {done ? <p className={`${styles.result} ${styles.resultOk}`}>{done}</p> : null}
      </div>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Reembolsar: ${courseTitle}`}
        description="O reembolso é total e não pode ser desfeito."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form={formId} variant="danger" pending={pending}>
              Reembolsar {formatBRL(amountCents)}
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={submit} className={styles.section}>
          <p>
            O aluno consumiu <strong>{progressPercent}%</strong> do curso.
          </p>
          <p className={`${styles.notice} ${styles.warn}`}>
            O valor de {formatBRL(amountCents)} sai do <strong>saldo disponível</strong> da conta
            AbacatePay. Se o saldo for insuficiente, o reembolso falha. O acesso do aluno só é
            removido quando a AbacatePay confirmar.
          </p>
          <div aria-live="polite">
            {error ? (
              <p role="alert" className={styles.result}>
                {error}
              </p>
            ) : null}
          </div>
        </form>
      </Dialog>
    </div>
  );
}

export function ManualSaleForm({
  courses,
  demo,
}: DemoProp & { courses: { id: string; title: string; priceCents: number }[] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [formError, setFormError] = useState<string>();
  const [courseId, setCourseId] = useState('');
  const formId = useId();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setFormError(undefined);
    const form = new FormData(e.currentTarget);
    start(async () => {
      if (demo) {
        setOpen(false);
        toast({ tone: 'success', title: 'Venda registrada (simulação)' });
        return;
      }
      const res = await recordManualSale({
        email: String(form.get('email') ?? ''),
        courseId,
        amount: String(form.get('amount') ?? ''),
      });
      if (res.ok) {
        setOpen(false);
        setCourseId('');
        toast({
          tone: 'success',
          title: 'Venda registrada',
          description: 'Acesso liberado ao aluno.',
        });
      } else {
        setErrors(res.fieldErrors ?? {});
        setFormError(
          res.fieldErrors && Object.keys(res.fieldErrors).length ? undefined : res.error,
        );
      }
    });
  }

  const selected = courses.find((c) => c.id === courseId);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Registrar venda manual
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Registrar venda manual"
        description="Cria um pedido pago e libera o curso. Use para vendas fora do checkout."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form={formId} pending={pending}>
              Registrar venda
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={submit} className={styles.form}>
          <Field
            label="Email do aluno"
            error={errors.email?.[0]}
            required
            hint="A conta precisa existir."
          >
            <Input name="email" type="email" inputMode="email" autoComplete="off" maxLength={254} />
          </Field>
          <Field label="Curso" error={errors.courseId?.[0]} required>
            <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">Selecione um curso…</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Valor (R$)"
            error={errors.amount?.[0]}
            hint={
              selected
                ? `Em branco = preço do curso (${formatBRL(selected.priceCents)}).`
                : 'Em branco = preço do curso.'
            }
          >
            <Input
              name="amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="197,00"
              maxLength={20}
            />
          </Field>
          {formError ? (
            <p role="alert" className={styles.result}>
              {formError}
            </p>
          ) : null}
        </form>
      </Dialog>
    </>
  );
}
