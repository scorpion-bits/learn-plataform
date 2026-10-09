'use client';

import { useActionState, useRef } from 'react';

import { Button, Field, TextLink } from '@/components/ui';

import { resetPassword } from '../actions';
import { IDLE_STATE, MIN_PASSWORD_LENGTH } from '../form-state';
import styles from './auth-form.module.css';
import { PasswordInput } from './PasswordInput';
import { useFocusOnError } from './useFocusOnError';

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPassword, IDLE_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  useFocusOnError(state, formRef, alertRef);

  const errors = state.status === 'error' ? state.fieldErrors : undefined;

  return (
    <form ref={formRef} action={action} className={styles.form} noValidate>
      {state.status === 'error' ? (
        <div ref={alertRef} className={styles.alert} role="alert" tabIndex={-1}>
          {state.message}{' '}
          {errors ? null : <TextLink href="/recuperar-senha">Pedir novo link</TextLink>}
        </div>
      ) : null}
      <Field
        label="Nova senha"
        required
        hint={`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres.`}
        error={errors?.password?.[0]}
      >
        <PasswordInput name="password" autoComplete="new-password" enterKeyHint="next" autoFocus />
      </Field>
      <Field label="Confirmar nova senha" required error={errors?.confirm_password?.[0]}>
        <PasswordInput name="confirm_password" autoComplete="new-password" enterKeyHint="go" />
      </Field>
      <Button type="submit" fullWidth size="lg" pending={pending}>
        {pending ? 'Salvando…' : 'Salvar nova senha'}
      </Button>
    </form>
  );
}
