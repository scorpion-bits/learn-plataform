'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';

import { Button, Dialog, Field, Input, useToast } from '@/components/ui';

import { deleteMyAccount } from '../actions';
import { sameEmail } from '../form-state';
import styles from './Account.module.css';

/** Zona de perigo de /conta: exclusão da própria conta (LGPD, DB-008). */
export function DeleteAccountSection({
  email,
  isAdmin,
  demo,
}: {
  email: string;
  isAdmin: boolean;
  demo?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string>();
  const [fieldError, setFieldError] = useState<string>();
  const [pending, start] = useTransition();
  const formId = useId();
  const matches = sameEmail(typed, email);

  function close() {
    if (pending) return;
    setOpen(false);
    setTyped('');
    setError(undefined);
    setFieldError(undefined);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setFieldError(undefined);
    if (!matches) {
      setFieldError('Digite exatamente o e-mail desta conta.');
      return;
    }
    start(async () => {
      if (demo) {
        setOpen(false);
        toast({ tone: 'success', title: 'Conta excluída (demonstração)' });
        return;
      }
      const res = await deleteMyAccount({ email: typed });
      if (res.ok) {
        toast({
          tone: 'success',
          title: res.data.message,
          description: 'Seus dados pessoais foram apagados. Obrigado por ter estudado com a gente.',
        });
        router.replace('/');
        router.refresh();
        return;
      }
      setError(res.error);
      setFieldError(res.fieldErrors?.email?.[0]);
    });
  }

  return (
    <section className={`${styles.section} ${styles.danger}`} aria-labelledby="conta-excluir">
      <h2 id="conta-excluir" className={styles.sectionTitle}>
        Excluir conta
      </h2>
      <div className={styles.dangerText}>
        <p>
          Apagamos seu nome, CPF, telefone e progresso nas aulas, e o acesso a todos os cursos é
          encerrado. Você não conseguirá mais entrar com este e-mail e senha.
        </p>
        <p>
          Os registros de pedidos e pagamentos são mantidos, ligados só a um identificador interno,
          pelo prazo exigido pela legislação fiscal.{' '}
          <strong>Esta ação não pode ser desfeita.</strong>
        </p>
      </div>
      {isAdmin ? (
        <p className={styles.muted}>
          Contas de administrador não podem ser excluídas por aqui. Fale com o responsável pela
          plataforma.
        </p>
      ) : (
        <div>
          <Button type="button" variant="danger" onClick={() => setOpen(true)}>
            Excluir minha conta
          </Button>
        </div>
      )}

      <Dialog
        open={open}
        onClose={close}
        closeOnBackdrop={!pending}
        title="Excluir sua conta?"
        description="Seus dados pessoais e seu progresso serão apagados e o acesso aos cursos será encerrado. Não é possível desfazer."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={close} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" form={formId} variant="danger" pending={pending}>
              Excluir definitivamente
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={submit} className={styles.form} noValidate>
          <div aria-live="polite">
            {error ? (
              <p role="alert" className={styles.alert}>
                {error}
              </p>
            ) : null}
          </div>
          <Field
            label={
              <>
                Para confirmar, digite <span className={styles.readonly}>{email}</span>
              </>
            }
            required
            error={fieldError}
          >
            <Input
              name="email"
              type="email"
              inputMode="email"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="done"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
            />
          </Field>
        </form>
      </Dialog>
    </section>
  );
}
