import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CubeProgress } from './CubeProgress';

describe('CubeProgress', () => {
  it('expõe progressbar com valuenow/max e valuetext', () => {
    render(<CubeProgress total={12} completed={7} />);
    const bar = screen.getByRole('progressbar', { name: 'Progresso' });
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '12');
    expect(bar).toHaveAttribute('aria-valuenow', '7');
    expect(bar).toHaveAttribute('aria-valuetext', '7 de 12 aulas, 58%');
  });

  it('agrupa cubos acima de maxVisible e limita completed a total', () => {
    const { container } = render(<CubeProgress total={40} completed={99} maxVisible={10} />);
    expect(container.querySelectorAll('svg')).toHaveLength(10);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
  });
});
