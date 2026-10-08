import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrderStatusSnapshot } from '../model';
import { useOrderPolling, useRemainingMs } from './useOrderPolling';

const PENDING: OrderStatusSnapshot = { status: 'pending', expiresAt: null };

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  vi.useFakeTimers();
  setHidden(false);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('useOrderPolling', () => {
  it('consulta a cada 3 s, depois 3,5 s, e para ao ficar paid chamando onFinal', async () => {
    const fetchStatus = vi
      .fn<() => Promise<OrderStatusSnapshot>>()
      .mockResolvedValueOnce(PENDING)
      .mockResolvedValueOnce(PENDING)
      .mockResolvedValue({ status: 'paid', expiresAt: null });
    const onFinal = vi.fn();
    const { result } = renderHook(() =>
      useOrderPolling({ initial: PENDING, fetchStatus, onFinal }),
    );

    await act(() => vi.advanceTimersByTimeAsync(2999));
    expect(fetchStatus).toHaveBeenCalledTimes(0);
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(fetchStatus).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(3499));
    expect(fetchStatus).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(fetchStatus).toHaveBeenCalledTimes(2);
    await act(() => vi.advanceTimersByTimeAsync(4000));
    expect(fetchStatus).toHaveBeenCalledTimes(3);
    expect(result.current.snapshot.status).toBe('paid');
    expect(onFinal).toHaveBeenCalledTimes(1);

    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(fetchStatus).toHaveBeenCalledTimes(3);
  });

  it('não consulta quando já nasce em estado final', async () => {
    const fetchStatus = vi.fn();
    renderHook(() =>
      useOrderPolling({ initial: { status: 'paid', expiresAt: null }, fetchStatus }),
    );
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(fetchStatus).not.toHaveBeenCalled();
  });

  it('pausa com a aba oculta e consulta ao voltar', async () => {
    const fetchStatus = vi.fn().mockResolvedValue(PENDING);
    renderHook(() => useOrderPolling({ initial: PENDING, fetchStatus }));
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(fetchStatus).toHaveBeenCalledTimes(1);

    act(() => setHidden(true));
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(fetchStatus).toHaveBeenCalledTimes(1);

    await act(async () => setHidden(false));
    expect(fetchStatus).toHaveBeenCalledTimes(2);
  });

  it('desiste após ~10 min e "Verificar agora" recomeça', async () => {
    const fetchStatus = vi.fn().mockResolvedValue(PENDING);
    const { result } = renderHook(() => useOrderPolling({ initial: PENDING, fetchStatus }));
    await act(() => vi.advanceTimersByTimeAsync(10 * 60_000 + 6000));
    expect(result.current.timedOut).toBe(true);
    const calls = fetchStatus.mock.calls.length;
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(fetchStatus).toHaveBeenCalledTimes(calls);

    await act(() => result.current.checkNow());
    expect(fetchStatus).toHaveBeenCalledTimes(calls + 1);
    expect(result.current.timedOut).toBe(false);
  });

  it('erro de rede mantém o status e continua tentando', async () => {
    const fetchStatus = vi
      .fn<() => Promise<OrderStatusSnapshot>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ status: 'expired', expiresAt: null });
    const { result } = renderHook(() => useOrderPolling({ initial: PENDING, fetchStatus }));
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(result.current.snapshot.status).toBe('pending');
    await act(() => vi.advanceTimersByTimeAsync(3500));
    expect(result.current.snapshot.status).toBe('expired');
  });
});

describe('useRemainingMs', () => {
  it('conta regressivamente e trava em 0', async () => {
    vi.setSystemTime(new Date('2026-10-08T20:00:00Z'));
    const { result } = renderHook(() => useRemainingMs('2026-10-08T20:00:03Z'));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(result.current).toBe(3000);
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(result.current).toBe(1000);
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(result.current).toBe(0);
  });
});
