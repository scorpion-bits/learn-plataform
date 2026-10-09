'use client';

import { useId, useState, useTransition } from 'react';

import { Button, Dialog, useToast } from '@/components/ui';

import { requestRefund } from '../actions';
import styles from './Orders.module.css';

export function RequestRefundButton({
  orderId,
  courseTitle,
  remaining,
  demo,
}: {
  orderId: string;
  courseTitle: string;
  remaining: string;
  demo?: boolean;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);
  const formId = useId();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    start(async () => {
      if (demo) {
        setOpen(false);
        setDone(true);
        toast({ tone: 'success', title: 'Pedido de reembolso enviado (simulação)' });
        return;
      }
      const res = await requestRefund({ orderId });
      if (res.ok) {
        setOpen(false);
        setDone(true);
        toast({
          tone: 'success',
          title: 'Pedido de reembolso enviado',
          description: res.data.message,
        });
      } else setError(res.error);
    });
  }

  if (done) {
    return (
      <p className={styles.muted} role="status">
        Pedido de reembolso enviado. A equipe vai analisar.
      </p>
    );
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Solicitar reembolso
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Solicitar reembolso: ${courseTitle}`}
        description={`Você ainda tem ${remaining} para pedir. O reembolso é total e o acesso ao curso é removido quando o estorno for confirmado.`}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form={formId} pending={pending}>
              Solicitar reembolso
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={submit}>
          <div aria-live="polite">
            {error ? (
              <p role="alert" className={styles.result}>
                {error}
              </p>
            ) : null}
          </div>
        </form>
      </Dialog>
    </>
  );
}
