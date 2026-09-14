import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PlansManagement from '../pages/admin/PlansManagement';
import api from '../lib/api';

vi.mock('../lib/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

const plan = {
  id: 'plan-pro', name: 'Pro', type: 'pago', is_active: true,
  max_markets: 2, max_terminals: 4, price_monthly: '99.90', price_180days: '539.90', price_annual: '999.90',
  fiscal_monthly_limit: 200, description: 'Para 2 lojas', display_order: 1, is_recommended: false,
  includes_finance: true,
};

describe('PlansManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: [plan] });
    api.put.mockResolvedValue({ data: plan });
  });

  it('shows the fiscal limit on the plan card', async () => {
    render(<PlansManagement />);
    expect(await screen.findByText(/200/)).toBeInTheDocument();
    expect(screen.getByText(/NFC-e por mês/i)).toBeInTheDocument();
  });

  it('edits fiscal limit, description, order and recommendation', async () => {
    const user = userEvent.setup();
    render(<PlansManagement />);

    await user.click(await screen.findByRole('button', { name: /editar pro/i }));
    const limit = screen.getByLabelText(/emissões nfc-e por mês/i);
    await user.clear(limit);
    await user.type(limit, '500');
    const description = screen.getByLabelText(/descrição curta/i);
    await user.clear(description);
    await user.click(screen.getByLabelText(/plano recomendado/i));
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/admin/plans/plan-pro', expect.objectContaining({
      fiscal_monthly_limit: 500,
      description: null,
      display_order: 1,
      is_recommended: true,
    })));
  });

  it('shows whether the plan includes the Financeiro module', async () => {
    api.get.mockResolvedValue({ data: [plan, { ...plan, id: 'plan-basico', name: 'Básico', includes_finance: false }] });
    render(<PlansManagement />);

    await screen.findByText('Pro');
    const basicoCard = screen.getByText('Básico').closest('div.relative');
    expect(basicoCard).toHaveTextContent(/sem financeiro/i);
    const proCard = screen.getByText('Pro').closest('div.relative');
    expect(proCard).not.toHaveTextContent(/sem financeiro/i);
  });

  it('excludes Financeiro from a plan by unchecking it', async () => {
    const user = userEvent.setup();
    render(<PlansManagement />);

    await user.click(await screen.findByRole('button', { name: /editar pro/i }));
    expect(screen.getByLabelText(/inclui financeiro/i)).toBeChecked();
    await user.click(screen.getByLabelText(/inclui financeiro/i));
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/admin/plans/plan-pro', expect.objectContaining({
      includes_finance: false,
    })));
  });
});
