'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

import styles from './Dock.module.css';

/** deve coincidir com o @media do Dock.module.css */
const MOBILE_QUERY = '(max-width: 860px)';

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export interface DockShellProps {
  brand: ReactNode;
  nav?: ReactNode;
  actions?: ReactNode;
  trailing?: ReactNode;
  navLabel: string;
  hideMenuOnMobile?: boolean;
  className?: string;
}

/**
 * Parte client do Dock: estado "grudado" (IntersectionObserver de uma sentinela
 * de 1px logo acima) e o menu mobile (aria-expanded, Esc, clique fora, foco
 * preso, trava de rolagem). Os slots chegam prontos do servidor.
 */
export function DockShell({
  brand,
  nav,
  actions,
  trailing,
  navLabel,
  hideMenuOnMobile,
  className,
}: DockShellProps) {
  const [open, setOpen] = useState(false);
  const [stuck, setStuck] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // grudado: a sentinela saiu da tela
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setStuck(!entry?.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // ao abrir: trava a rolagem do fundo, foca o 1º link, Esc/clique fora fecham
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const mql = window.matchMedia(MOBILE_QUERY);
    const onMedia = () => {
      if (!mql.matches) setOpen(false);
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    mql.addEventListener('change', onMedia);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
      mql.removeEventListener('change', onMedia);
    };
  }, [open]);

  // foco preso no cabeçalho enquanto a folha está aberta
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!open || event.key !== 'Tab') return;
    const items = Array.from(
      headerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
    ).filter((el) => el.offsetParent !== null);
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  // clicar num link do menu fecha a folha
  const onPanelClick = (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest('a[href]')) setOpen(false);
  };

  return (
    <>
      <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />
      <header
        ref={headerRef}
        className={[styles.dock, className].filter(Boolean).join(' ')}
        data-stuck={stuck ? 'true' : undefined}
        data-open={open ? 'true' : undefined}
        data-compact={hideMenuOnMobile ? 'true' : undefined}
        onKeyDown={onKeyDown}
      >
        <div className={styles.inner}>
          <div className={styles.brand}>{brand}</div>

          <button
            ref={toggleRef}
            type="button"
            className={styles.toggle}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setOpen((value) => !value)}
          >
            <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
              {open ? <path d="M5 5l10 10M15 5L5 15" /> : <path d="M3 6h14M3 10h14M3 14h14" />}
            </svg>
          </button>

          <div id={panelId} ref={panelRef} className={styles.panel} onClick={onPanelClick}>
            {nav && (
              <nav className={styles.nav} aria-label={navLabel}>
                {nav}
              </nav>
            )}
            {actions && <div className={styles.actions}>{actions}</div>}
          </div>

          {trailing && <div className={styles.trailing}>{trailing}</div>}
        </div>
      </header>
    </>
  );
}
