'use client';

import { useId, useRef, useState, useTransition } from 'react';
import type { KeyboardEvent } from 'react';

import { Button, Input } from '@/components/ui';

import { TITLE_MAX } from '../constants';
import styles from './CurriculumEditor.module.css';

interface Props {
  /** Nome acessível do campo (sem label visível). */
  label: string;
  submitLabel: string;
  placeholder?: string;
  initialValue?: string;
  /** Devolve a mensagem de erro, ou `null` em caso de sucesso. */
  onSubmit: (title: string) => Promise<string | null>;
  /** Presente = formulário inline (Esc cancela, há botão Cancelar). */
  onCancel?: () => void;
  /** Chamado após sucesso. */
  onDone?: () => void;
  /** Limpa e devolve o foco ao campo após sucesso (formulários de "adicionar"). */
  resetOnSuccess?: boolean;
  autoFocus?: boolean;
}

/** Campo de título + botão, usado para adicionar e para renomear inline. */
export function TitleForm({
  label,
  submitLabel,
  placeholder,
  initialValue = '',
  onSubmit,
  onCancel,
  onDone,
  resetOnSuccess,
  autoFocus,
}: Props) {
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const title = value.trim();
    if (!title) {
      setError('Informe o título.');
      inputRef.current?.focus();
      return;
    }
    if (onCancel && title === initialValue) {
      onCancel();
      return;
    }
    setError(null);
    startTransition(async () => {
      const message = await onSubmit(title);
      if (message) {
        setError(message);
        inputRef.current?.focus();
        return;
      }
      if (resetOnSuccess) {
        setValue('');
        inputRef.current?.focus();
      }
      onDone?.();
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape' && onCancel) {
      e.preventDefault();
      onCancel();
    }
  }

  return (
    <form
      className={styles.titleForm}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className={styles.titleFormRow}>
        <Input
          ref={inputRef}
          className={styles.titleInput}
          aria-label={label}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          placeholder={placeholder}
          maxLength={TITLE_MAX}
          autoComplete="off"
          enterKeyHint="done"
          autoFocus={autoFocus}
          value={value}
          disabled={pending}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={onKeyDown}
        />
        <Button type="submit" size="sm" pending={pending}>
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className={styles.fieldError} role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
