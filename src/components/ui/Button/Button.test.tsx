import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('chama onClick e usa type="button" por padrão', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Salvar</Button>);
    const btn = screen.getByRole('button', { name: 'Salvar' });
    expect(btn).toHaveAttribute('type', 'button');
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('pending: aria-busy, desabilitado, label mantido e sem clique duplo', async () => {
    const onClick = vi.fn();
    render(
      <Button pending onClick={onClick}>
        Salvar
      </Button>,
    );
    const btn = screen.getByRole('button', { name: /Salvar/ });
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('com href renderiza um link', () => {
    render(<Button href="/cursos">Ver cursos</Button>);
    expect(screen.getByRole('link', { name: 'Ver cursos' })).toHaveAttribute('href', '/cursos');
  });
});
