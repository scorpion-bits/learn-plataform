'use client';

import { useEffect } from 'react';
import type { RefObject } from 'react';

import type { AuthFormState } from '../form-state';

/**
 * Depois de um envio com erro, move o foco para o primeiro campo inválido
 * (ou para o aviso geral, se não houver erro por campo) e deixa o leitor de tela anunciar.
 */
export function useFocusOnError(
  state: AuthFormState,
  formRef: RefObject<HTMLFormElement | null>,
  alertRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (state.status !== 'error') return;
    const firstInvalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    (firstInvalid ?? alertRef.current)?.focus();
  }, [state, formRef, alertRef]);
}
