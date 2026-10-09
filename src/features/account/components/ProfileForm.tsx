'use client';

import { useActionState, useEffect, useRef, useState } from 'react';

import { Button, Field, Input } from '@/components/ui';
import { formatBrPhone, formatCpf } from '@/lib/payments/tax-id';

import { updateProfile } from '../actions';
import { IDLE_STATE } from '../schemas';
import type { AccountFormState } from '../schemas';
import styles from './Account.module.css';

async function submit(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const result = await updateProfile(formData);
  if (result.ok) return { status: 'success', message: result.data.message };
  return { status: 'error', message: result.error, fieldErrors: result.fieldErrors };
}

async function demoSubmit(): Promise<AccountFormState> {
  return { status: 'success', message: 'Dados salvos (demonstração).' };
}

export function ProfileForm({
  email,
  defaultName,
  defaultPhone,
  defaultTaxId,
  demo,
}: {
  email: string;
  defaultName: string;
  defaultPhone: string;
  defaultTaxId: string;
  demo?: boolean;
}) {
  const [state, action, pending] = useActionState(demo ? demoSubmit : submit, IDLE_STATE);
  const [phone, setPhone] = useState(() => formatBrPhone(defaultPhone));
  const [taxId, setTaxId] = useState(() => formatCpf(defaultTaxId));
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

      <Field label="Email" hint="Não é possível alterar o email por aqui.">
        <Input value={email} readOnly type="email" autoComplete="email" />
      </Field>
      <Field label="Nome" required error={errors?.full_name?.[0]}>
        <Input
          name="full_name"
          defaultValue={defaultName}
          autoComplete="name"
          enterKeyHint="next"
          maxLength={100}
        />
      </Field>
      <Field label="Celular" hint="Opcional, com DDD." error={errors?.phone?.[0]}>
        <Input
          name="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(formatBrPhone(e.target.value))}
          inputMode="numeric"
          autoComplete="tel-national"
          enterKeyHint="next"
          placeholder="(11) 90000-0000"
        />
      </Field>
      <Field
        label="CPF"
        hint="Opcional. Usado só para emitir a cobrança PIX."
        error={errors?.tax_id?.[0]}
      >
        <Input
          name="tax_id"
          value={taxId}
          onChange={(e) => setTaxId(formatCpf(e.target.value))}
          inputMode="numeric"
          autoComplete="off"
          enterKeyHint="go"
          placeholder="000.000.000-00"
          spellCheck={false}
        />
      </Field>
      <Button type="submit" pending={pending}>
        {pending ? 'Salvando…' : 'Salvar dados'}
      </Button>
    </form>
  );
}
