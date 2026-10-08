'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './DropdownMenu.module.css';

export interface DropdownMenuItem {
  label: ReactNode;
  /** Ação (botão). */
  onSelect?: () => void;
  /** Navegação (link). */
  href?: string;
  tone?: 'default' | 'danger';
  disabled?: boolean;
}

export interface DropdownMenuProps {
  /** Conteúdo do botão que abre o menu. */
  trigger: ReactNode;
  /** Nome acessível do botão quando `trigger` é só ícone. */
  triggerLabel?: string;
  items: DropdownMenuItem[];
  align?: 'start' | 'end';
  className?: string;
}

/** Botão + role="menu". ↑/↓/Home/End movem o foco, Esc fecha e devolve o foco, Tab/clique fora fecham. */
export function DropdownMenu({
  trigger,
  triggerLabel,
  items,
  align = 'start',
  className,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const menuId = `${uid}-menu`;

  const enabledEls = () =>
    Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([aria-disabled="true"])',
      ) ?? [],
    );

  function openMenu(focus: 'first' | 'last' = 'first') {
    setOpen(true);
    requestAnimationFrame(() => {
      const els = enabledEls();
      (focus === 'first' ? els[0] : els[els.length - 1])?.focus();
    });
  }

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function onTriggerKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      openMenu('first');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      openMenu('last');
    }
  }

  function onMenuKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const els = enabledEls();
    const idx = els.indexOf(document.activeElement as HTMLElement);
    let next: HTMLElement | undefined;
    switch (e.key) {
      case 'ArrowDown':
        next = els[(idx + 1) % els.length];
        break;
      case 'ArrowUp':
        next = els[(idx - 1 + els.length) % els.length];
        break;
      case 'Home':
        next = els[0];
        break;
      case 'End':
        next = els[els.length - 1];
        break;
      case 'Escape':
        e.preventDefault();
        close(true);
        return;
      case 'Tab':
        close(false);
        return;
      default:
        return;
    }
    e.preventDefault();
    next?.focus();
  }

  return (
    <div ref={rootRef} className={cx(styles.root, className)}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={triggerLabel}
        onClick={() => (open ? close(false) : openMenu())}
        onKeyDown={onTriggerKeyDown}
      >
        {trigger}
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={triggerLabel}
          className={cx(styles.menu, align === 'end' && styles.end)}
          onKeyDown={onMenuKeyDown}
        >
          {items.map((item, i) => {
            const common = {
              role: 'menuitem',
              tabIndex: -1,
              'aria-disabled': item.disabled || undefined,
              className: cx(styles.item, item.tone === 'danger' && styles.danger),
            } as const;
            if (item.href && !item.disabled) {
              return (
                <Link key={i} href={item.href} {...common} onClick={() => close(false)}>
                  {item.label}
                </Link>
              );
            }
            return (
              <button
                key={i}
                type="button"
                {...common}
                onClick={() => {
                  if (item.disabled) return;
                  close(true);
                  item.onSelect?.();
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
