'use client';

import { useEffect, useId, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import { cx } from '@/lib/utils/cx';
import { IconButton } from '../IconButton/IconButton';
import styles from './Dialog.module.css';

export interface DialogProps {
  open: boolean;
  /** Chamado ao fechar (Esc, botão, clique no fundo). O pai deve pôr `open=false`. */
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Rodapé de ações. */
  footer?: ReactNode;
  /** Elemento a focar ao abrir. Padrão: primeiro campo/controle do corpo; senão o botão fechar. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Fecha ao clicar no fundo (padrão true). */
  closeOnBackdrop?: boolean;
  /** Interno: o Drawer reutiliza este componente. */
  variant?: 'center' | 'sheet';
  className?: string;
}

const FOCUSABLE =
  'input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])';

/**
 * <dialog> nativo com showModal(): foco preso, inert no resto da página e Esc
 * vêm do navegador. Aqui: foco inicial, retorno de foco, aria-labelledby,
 * trava de rolagem. Em < 480px ocupa a tela inteira (100dvh).
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  initialFocusRef,
  closeOnBackdrop = true,
  variant = 'center',
  className,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const uid = useId();
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnTo.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
      const target =
        initialFocusRef?.current ??
        bodyRef.current?.querySelector<HTMLElement>(FOCUSABLE) ??
        closeRef.current;
      target?.focus();
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
    if (!open && dialog.open) dialog.close();
  }, [open, initialFocusRef]);

  // Fechamento nativo (Esc, form method=dialog) => avisa o pai e devolve o foco.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handle = () => {
      returnTo.current?.focus();
      returnTo.current = null;
      onCloseRef.current();
    };
    dialog.addEventListener('close', handle);
    return () => dialog.removeEventListener('close', handle);
  }, []);

  // Desmontar com o diálogo aberto: devolve o foco.
  useEffect(() => {
    const dialog = ref.current;
    return () => {
      if (dialog?.open) returnTo.current?.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={cx(styles.dialog, variant === 'sheet' && styles.sheet, className)}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      {open ? (
        <div className={styles.panel}>
          <header className={styles.header}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            <IconButton
              ref={closeRef}
              aria-label="Fechar"
              variant="ghost"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              }
              onClick={() => ref.current?.close()}
            />
          </header>
          {description ? (
            <p id={descId} className={styles.description}>
              {description}
            </p>
          ) : null}
          <div ref={bodyRef} className={styles.body}>
            {children}
          </div>
          {footer ? <footer className={styles.footer}>{footer}</footer> : null}
        </div>
      ) : null}
    </dialog>
  );
}
