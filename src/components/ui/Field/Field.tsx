import { cloneElement, isValidElement, useId } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './Field.module.css';

export interface FieldProps {
  label: ReactNode;
  /** Um único controle (Input, Textarea, Select...). Recebe id, aria-describedby, aria-invalid e required. */
  children: ReactElement<Record<string, unknown>>;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
}

/**
 * label + controle + dica + erro. Liga tudo por id (useId):
 * `aria-describedby` aponta para dica e erro; `aria-invalid` quando há erro.
 * O erro usa role="alert" para ser anunciado ao aparecer.
 * Dica de celular: passe `inputMode`, `autoComplete`, `enterKeyHint` no controle.
 */
export function Field({ label, children, hint, error, required, className }: FieldProps) {
  const uid = useId();
  const id = `${uid}-control`;
  const hintId = hint ? `${uid}-hint` : undefined;
  const errorId = error ? `${uid}-error` : undefined;
  const describedBy =
    [children.props['aria-describedby'], hintId, errorId].filter(Boolean).join(' ') || undefined;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id: (children.props.id as string | undefined) ?? id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        required: required ?? children.props.required,
      })
    : children;
  const controlId = (children.props.id as string | undefined) ?? id;

  return (
    <div className={cx(styles.field, className)}>
      <label htmlFor={controlId} className={styles.label}>
        {label}
        {required ? (
          <span className={styles.required} aria-hidden="true">
            {' '}
            *
          </span>
        ) : null}
      </label>
      {control}
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
