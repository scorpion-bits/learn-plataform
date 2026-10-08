import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs } from './Tabs';

const items = [
  { value: 'a', label: 'Em andamento', panel: <p>Painel A</p> },
  { value: 'b', label: 'Concluídos', panel: <p>Painel B</p> },
  { value: 'c', label: 'Todos', panel: <p>Painel C</p> },
];

describe('Tabs', () => {
  it('seleciona a primeira aba e mostra o painel ligado', () => {
    render(<Tabs items={items} label="Biblioteca" />);
    const tab = screen.getByRole('tab', { name: 'Em andamento' });
    expect(tab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Em andamento');
    expect(screen.getByText('Painel A')).toBeVisible();
  });

  it('setas, Home e End movem seleção e foco (com wrap)', async () => {
    render(<Tabs items={items} />);
    await userEvent.tab();
    expect(screen.getByRole('tab', { name: 'Em andamento' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Concluídos' })).toHaveFocus();
    expect(screen.getByText('Painel B')).toBeVisible();
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Todos' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Em andamento' })).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Todos' })).toHaveFocus();
  });
});
