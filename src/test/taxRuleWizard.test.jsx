import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TaxRuleWizard from '../components/fiscal/TaxRuleWizard';

describe('TaxRuleWizard', () => {
  const continueToReview = async (user) => {
    for (let index = 0; index < 4; index += 1) {
      await user.click(screen.getByRole('button', { name: /próximo/i }));
    }
  };

  const fillPublicationEvidence = () => {
    fireEvent.change(screen.getByLabelText('Referência oficial/revisão'), { target: { value: 'https://fonte.oficial/regra' } });
    fireEvent.change(screen.getByLabelText('Checksum SHA-256'), { target: { value: 'a'.repeat(64) } });
    fireEvent.change(screen.getByLabelText('Chave do XML de homologação'), { target: { value: 'fiscal/homologacao/regra.xml' } });
  };

  const fillPublishableContextToContributions = async (user) => {
    fireEvent.change(screen.getByLabelText('Nome da regra'), { target: { value: 'Regra revisada' } });
    fireEvent.change(screen.getByLabelText('Início de vigência'), { target: { value: '2026-07-15' } });
    await user.click(screen.getByRole('button', { name: /próximo/i }));
    fireEvent.change(screen.getByLabelText('Regime do emitente'), { target: { value: 'simples_nacional' } });
    fireEvent.change(screen.getByLabelText('UF de destino'), { target: { value: 'GO' } });
    fireEvent.change(screen.getByLabelText('Modelo do documento'), { target: { value: '65' } });
    fireEvent.change(screen.getByLabelText('NCM'), { target: { value: '22030000' } });
    fireEvent.change(screen.getByLabelText('Origem'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('CFOP'), { target: { value: '5102' } });
    await user.click(screen.getByRole('button', { name: /próximo/i }));
    fireEvent.change(screen.getByLabelText('Grupo ICMS'), { target: { value: 'ICMSSN102' } });
    fireEvent.change(screen.getByLabelText('CSOSN'), { target: { value: '102' } });
    fireEvent.change(screen.getByLabelText('Modo ICMS'), { target: { value: 'non_taxed' } });
    await user.click(screen.getByRole('button', { name: /próximo/i }));
  };

  const fillContributions = () => {
    fireEvent.change(screen.getByLabelText('CST PIS'), { target: { value: '01' } });
    fireEvent.change(screen.getByLabelText('Base PIS'), { target: { value: '10.00' } });
    fireEvent.change(screen.getByLabelText('Alíquota PIS'), { target: { value: '1.65' } });
    fireEvent.change(screen.getByLabelText('Valor PIS'), { target: { value: '0.17' } });
    fireEvent.change(screen.getByLabelText('CST COFINS'), { target: { value: '49' } });
    fireEvent.change(screen.getByLabelText('Base COFINS'), { target: { value: '10.00' } });
    fireEvent.change(screen.getByLabelText('Alíquota COFINS'), { target: { value: '7.60' } });
    fireEvent.change(screen.getByLabelText('Valor COFINS'), { target: { value: '0.76' } });
  };

  it('requires evidence and checksum before submitting an immutable publication', async () => {
    const user = userEvent.setup({ delay: null });
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

  it('derives PIS and COFINS groups from each selected CST in the exact API payload', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TaxRuleWizard onSubmit={onSubmit} />);

    await fillPublishableContextToContributions(user);
    fillContributions();
    await user.click(screen.getByRole('button', { name: /próximo/i }));
    fillPublicationEvidence();

    await user.click(screen.getByRole('button', { name: /publicar regra/i }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      pis: expect.objectContaining({ cst: '01', group: 'PIS01' }),
      cofins: expect.objectContaining({ cst: '49', group: 'COFINS49' }),
    }));
  });

  it('shows the backend publication error instead of treating it as a success', async () => {
    const user = userEvent.setup({ delay: null });
    const onSubmit = vi.fn().mockRejectedValue(new Error('Parâmetros de PIS/COFINS divergentes.'));
    render(<TaxRuleWizard onSubmit={onSubmit} />);

    await fillPublishableContextToContributions(user);
    fillContributions();
    await user.click(screen.getByRole('button', { name: /próximo/i }));
    fillPublicationEvidence();
    await user.click(screen.getByRole('button', { name: /publicar regra/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/parâmetros de PIS\/COFINS divergentes/i);
  });

  it('blocks publication before the POST when mandatory fiscal context is incomplete', async () => {
    const user = userEvent.setup({ delay: null });
    const onSubmit = vi.fn();
    render(<TaxRuleWizard onSubmit={onSubmit} />);

    await continueToReview(user);
    fillPublicationEvidence();
    await user.click(screen.getByRole('button', { name: /publicar regra/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/campos obrigatórios/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
