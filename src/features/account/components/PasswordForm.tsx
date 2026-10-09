'use client';

import { useActionState, useEffect, useRef } from 'react';

import { Button, Field } from '@/components/ui';
import { PasswordInput } from '@/features/auth/components/PasswordInput';

import { changePassword } from '../actions';
import { IDLE_STATE, MIN_PASSWORD_LENGTH } from '../form-state';
import type { AccountFormState } from '../form-state';
import styles from './Account.module.css';

async function submit(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const result = await changePassword(formData);
  if (result.ok) return { status: 'success', message: result.data.message };
  return { status: 'error', message: result.error, fieldErrors: result.fieldErrors };
}

async function demoSubmit(): Promise<AccountFormState> {
  return { status: 'success', message: 'Senha alterada (demonstração).' };
}

export function PasswordForm({ demo }: { demo?: boolean }) {
  const [state, action, pending] = useActionState(demo ? demoSubmit : submit, IDLE_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === 'success') formRef.current?.reset(); // não deixa senha no DOM
    if (state.status !== 'error') return;
    const firstInvalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    (firstInvalid ?? alertRef.current)?.focus();
  }, [state]);

  const errors = state.status === 'error' ? state.fieldErrors : undefined;

  return (
    <form ref={formRef} action={action} className={styles.form} noValidate>
      {state.status === 'error' ? (
        <div ref={alertRef} className={styles.alert} role="alert" tabIndex={-1}>
          {state.message}
        </div>
      ) : null}
      {state.status === 'success' ? (
        <div className={styles.notice} role="status">
          {state.message}
        </div>
      ) : null}
      <Field
        label="Nova senha"
        required
        hint={`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres.`}
        error={errors?.password?.[0]}
      >
        <PasswordInput name="password" autoComplete="new-password" enterKeyHint="next" />
      </Field>
      <Field label="Confirmar nova senha" required error={errors?.confirm_password?.[0]}>
        <PasswordInput name="confirm_password" autoComplete="new-password" enterKeyHint="go" />
      </Field>
      <Button type="submit" variant="secondary" pending={pending}>
        {pending ? 'Salvando…' : 'Alterar senha'}
      </Button>
    </form>
  );
}
