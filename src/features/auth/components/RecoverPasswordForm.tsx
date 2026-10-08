'use client';

import { useActionState, useRef } from 'react';

import { Button, Field, Input, TextLink } from '@/components/ui';

import { requestPasswordReset } from '../actions';
import { IDLE_STATE } from '../schemas';
import styles from './auth-form.module.css';
import { useFocusOnError } from './useFocusOnError';

export function RecoverPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, IDLE_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  useFocusOnError(state, formRef, alertRef);

  const errors = state.status === 'error' ? state.fieldErrors : undefined;
  const values = state.status === 'error' ? state.values : undefined;

  return (
    <form ref={formRef} action={action} className={styles.form} noValidate>
      {state.status === 'success' ? (
        <p className={styles.notice} role="status">
          {state.message}
        </p>
      ) : null}
      {state.status === 'error' ? (
        <div ref={alertRef} className={styles.alert} role="alert" tabIndex={-1}>
          {state.message}
        </div>
      ) : null}
      <Field label="Email" required error={errors?.email?.[0]}>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          enterKeyHint="send"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          defaultValue={values?.email}
          autoFocus
        />
      </Field>
      <Button type="submit" fullWidth size="lg" pending={pending}>
        {pending ? 'Enviando…' : 'Enviar link'}
      </Button>
      <p className={styles.footer}>
        Lembrou? <TextLink href="/entrar">Voltar para entrar</TextLink>
      </p>
    </form>
  );
}
