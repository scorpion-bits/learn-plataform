'use client';

import { useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './Tabs.module.css';

export interface TabItem {
  value: string;
  label: ReactNode;
  panel: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  /** Controlado. */
  value?: string;
  /** Não controlado. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  label?: string;
  className?: string;
}

/** WAI-ARIA Tabs (ativação automática): ←/→ (↑/↓ não), Home/End, tabindex "roving". */
export function Tabs({ items, value, defaultValue, onValueChange, label, className }: TabsProps) {
  const uid = useId();
  const firstEnabled = items.find((i) => !i.disabled)?.value;
  const [inner, setInner] = useState(defaultValue ?? firstEnabled);
  const current = value ?? inner;
  const refs = useRef(new Map<string, HTMLButtonElement>());

  function select(v: string) {
    if (value === undefined) setInner(v);
    onValueChange?.(v);
    refs.current.get(v)?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const enabled = items.filter((i) => !i.disabled);
    const idx = enabled.findIndex((i) => i.value === current);
    let target: TabItem | undefined;
    if (e.key === 'ArrowRight') target = enabled[(idx + 1) % enabled.length];
    else if (e.key === 'ArrowLeft') target = enabled[(idx - 1 + enabled.length) % enabled.length];
    else if (e.key === 'Home') target = enabled[0];
    else if (e.key === 'End') target = enabled[enabled.length - 1];
    if (!target) return;
    e.preventDefault();
    select(target.value);
  }

  return (
    <div className={cx(styles.tabs, className)}>
      <div role="tablist" aria-label={label} className={styles.list} onKeyDown={onKeyDown}>
        {items.map((item) => {
          const selected = item.value === current;
          return (
            <button
              key={item.value}
              ref={(el) => {
                if (el) refs.current.set(item.value, el);
                else refs.current.delete(item.value);
              }}
              type="button"
              role="tab"
              id={`${uid}-tab-${item.value}`}
              aria-selected={selected}
              aria-controls={`${uid}-panel-${item.value}`}
              tabIndex={selected ? 0 : -1}
              disabled={item.disabled}
              className={cx(styles.tab, selected && styles.selected)}
              onClick={() => select(item.value)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => (
        <div
          key={item.value}
          role="tabpanel"
          id={`${uid}-panel-${item.value}`}
          aria-labelledby={`${uid}-tab-${item.value}`}
          hidden={item.value !== current}
          tabIndex={0}
          className={styles.panel}
        >
          {item.value === current ? item.panel : null}
        </div>
      ))}
    </div>
  );
}
