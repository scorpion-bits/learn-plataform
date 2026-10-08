'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { cx } from '@/lib/utils/cx';
import { IconButton } from '../IconButton/IconButton';
import styles from './Toast.module.css';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastOptions {
  tone?: ToastTone;
  title: ReactNode;
  description?: ReactNode;
  /** ms até sumir (padrão 6000; 0 = fica até dispensar). Pausa com hover/foco. */
  duration?: number;
}

interface ToastData extends ToastOptions {
  id: number;
}

interface ToastApi {
  toast: (options: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>.');
  return ctx;
}

const TONE_LABEL: Record<ToastTone, string> = { success: 'Sucesso', error: 'Erro', info: 'Aviso' };

function ToastItem({ data, onDismiss }: { data: ToastData; onDismiss: (id: number) => void }) {
  const { id, tone = 'info', title, description, duration = 6000 } = data;
  const remaining = useRef(duration);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hovering = useRef(false);
  const focusing = useRef(false);

  const start = useCallback(() => {
    if (duration <= 0) return;
    startedAt.current = Date.now();
    timer.current = setTimeout(() => onDismiss(id), remaining.current);
  }, [duration, id, onDismiss]);

  const pause = useCallback(() => {
    if (timer.current === null) return;
    clearTimeout(timer.current);
    timer.current = null;
    remaining.current = Math.max(1000, remaining.current - (Date.now() - startedAt.current));
  }, []);

  useEffect(() => {
    start();
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, [start]);

  const sync = () => {
    if (hovering.current || focusing.current) pause();
    else if (timer.current === null) start();
  };

  return (
    <li
      className={cx(styles.toast, styles[tone])}
      onMouseEnter={() => {
        hovering.current = true;
        sync();
      }}
      onMouseLeave={() => {
        hovering.current = false;
        sync();
      }}
      onFocus={() => {
        focusing.current = true;
        sync();
      }}
      onBlur={() => {
        focusing.current = false;
        sync();
      }}
    >
      <div className={styles.text}>
        <p className={styles.title}>
          <span className="visually-hidden">{TONE_LABEL[tone]}: </span>
          {title}
        </p>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
      <IconButton
        aria-label="Dispensar notificação"
        size="sm"
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
        onClick={() => onDismiss(id)}
      />
    </li>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-4), { ...options, id }]);
    return id;
  }, []);

  const api = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Região sempre montada: leitores de tela só anunciam mudanças em regiões já existentes. */}
      <div className={styles.region} role="region" aria-label="Notificações" aria-live="polite">
        <ul className={styles.list}>
          {toasts.map((t) => (
            <ToastItem key={t.id} data={t} onDismiss={dismiss} />
          ))}
        </ul>
      </div>
    </ToastContext.Provider>
  );
}
