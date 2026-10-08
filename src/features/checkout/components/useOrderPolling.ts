'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { isFinalStatus, nextPollDelay, POLL_MAX_DURATION_MS } from '../model';
import type { OrderStatusSnapshot } from '../model';

export type FetchOrderStatus = () => Promise<OrderStatusSnapshot | null>;

export interface UseOrderPollingOptions {
  initial: OrderStatusSnapshot;
  fetchStatus: FetchOrderStatus;
  /** Desliga o polling (vitrine/testes). */
  enabled?: boolean;
  /** Chamado uma vez quando o status final é detectado depois de `pending`. */
  onFinal?: (snapshot: OrderStatusSnapshot) => void;
}

/**
 * Consulta o status do pedido a cada 3 s (sobe até 5 s), pausa com a aba oculta,
 * para em estado final e desiste após ~10 min (`timedOut`). Só reflete o status:
 * nunca concede acesso.
 */
export function useOrderPolling({
  initial,
  fetchStatus,
  enabled = true,
  onFinal,
}: UseOrderPollingOptions) {
  const [snapshot, setSnapshot] = useState(initial);
  const [checking, setChecking] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  const fetchRef = useRef(fetchStatus);
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    fetchRef.current = fetchStatus;
    onFinalRef.current = onFinal;
  });

  const finalRef = useRef(isFinalStatus(initial.status));
  const attemptRef = useRef(0);
  const startRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const scheduleRef = useRef<() => void>(() => undefined);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const check = useCallback(async () => {
    if (inFlightRef.current || finalRef.current) return;
    inFlightRef.current = true;
    setChecking(true);
    try {
      const next = await fetchRef.current();
      if (next) {
        setSnapshot((prev) =>
          prev.status === next.status && prev.expiresAt === next.expiresAt ? prev : next,
        );
        if (isFinalStatus(next.status)) {
          finalRef.current = true;
          onFinalRef.current?.(next);
        }
      }
    } catch {
      // Falha de rede/servidor: mantém o status e tenta de novo no próximo ciclo.
    } finally {
      inFlightRef.current = false;
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    scheduleRef.current = () => {
      clearTimer();
      if (!enabled || finalRef.current) return;
      if (typeof document !== 'undefined' && document.hidden) return; // retoma no visibilitychange
      const start = (startRef.current ??= Date.now());
      if (Date.now() - start >= POLL_MAX_DURATION_MS) {
        setTimedOut(true);
        return;
      }
      timerRef.current = setTimeout(async () => {
        timerRef.current = null;
        attemptRef.current += 1;
        await check();
        scheduleRef.current();
      }, nextPollDelay(attemptRef.current));
    };
  }, [enabled, check]);

  useEffect(() => {
    if (!enabled || finalRef.current) return;
    startRef.current = Date.now();
    attemptRef.current = 0;
    scheduleRef.current();

    const onVisibility = () => {
      if (document.hidden) {
        clearTimer();
        return;
      }
      void check().then(() => scheduleRef.current());
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearTimer();
    };
  }, [enabled, check]);

  /** "Verificar agora": consulta já e, se o limite de 10 min passou, recomeça o ciclo. */
  const checkNow = useCallback(async () => {
    clearTimer();
    await check();
    if (!finalRef.current) {
      startRef.current = Date.now();
      attemptRef.current = 0;
      setTimedOut(false);
      scheduleRef.current();
    }
  }, [check]);

  return { snapshot, checking, timedOut, checkNow };
}

/** Milissegundos restantes até `expiresAt`, atualizado a cada segundo. */
export function useRemainingMs(expiresAt: string | null, enabled = true): number | null {
  const target = expiresAt ? Date.parse(expiresAt) : NaN;
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled || Number.isNaN(target)) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target, enabled]);

  if (Number.isNaN(target) || now === null) return null;
  return Math.max(0, target - now);
}
