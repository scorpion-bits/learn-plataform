import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Field } from './Field';
import { Input } from '../Input/Input';

describe('Field', () => {
  it('liga label, dica e erro ao controle', () => {
    render(
      <Field label="E-mail" hint="Usaremos para login" error="E-mail inválido" required>
        <Input type="email" autoComplete="email" inputMode="email" />
      </Field>,
    );
    const input = screen.getByLabelText(/E-mail/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toBeRequired();
    expect(input).toHaveAccessibleDescription('Usaremos para login E-mail inválido');
  });

  it('sem erro não marca aria-invalid', () => {
    render(
      <Field label="Nome">
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText('Nome')).not.toHaveAttribute('aria-invalid');
  });
});
