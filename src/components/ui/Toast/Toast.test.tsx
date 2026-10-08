import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from './Toast';

function Trigger() {
  const { toast } = useToast();
  return (
    <button onClick={() => toast({ tone: 'success', title: 'Salvo!', duration: 3000 })}>
      Disparar
    </button>
  );
}

describe('Toast', () => {
  afterEach(() => vi.useRealTimers());

  it('mostra o toast dentro da região aria-live="polite" e permite dispensar', async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    const region = screen.getByRole('region', { name: 'Notificações' });
    expect(region).toHaveAttribute('aria-live', 'polite');
    await userEvent.click(screen.getByRole('button', { name: 'Disparar' }));
    expect(region).toHaveTextContent('Salvo!');
    await userEvent.click(screen.getByRole('button', { name: 'Dispensar notificação' }));
    expect(region).not.toHaveTextContent('Salvo!');
  });

  it('some sozinho após a duração, e pausa com hover', () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    act(() => screen.getByRole('button', { name: 'Disparar' }).click());
    const region = screen.getByRole('region', { name: 'Notificações' });
    expect(region).toHaveTextContent('Salvo!');
    const item = screen.getByText('Salvo!').closest('li')!;
    act(() => {
      item.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(region).toHaveTextContent('Salvo!');
    act(() => {
      item.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
      vi.advanceTimersByTime(3500);
    });
    expect(region).not.toHaveTextContent('Salvo!');
  });
});
