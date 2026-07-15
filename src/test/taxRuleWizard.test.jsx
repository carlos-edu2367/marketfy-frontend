import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TaxRuleWizard from '../components/fiscal/TaxRuleWizard';

describe('TaxRuleWizard', () => {
  it('requires evidence and checksum before submitting an immutable publication', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<TaxRuleWizard onSubmit={onSubmit} />);

    expect(screen.getByText('Identificação')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /próximo/i }));
    expect(screen.getByText('Contexto')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /próximo/i }));
    expect(screen.getByText('ICMS')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /próximo/i }));
    expect(screen.getByText('Contribuições')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /próximo/i }));
    expect(screen.getByText('Revisão/Publicação')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /publicar regra/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/referência oficial/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
