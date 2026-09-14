import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Plans from '../pages/auth/Plans';
import api, { subscribePlan } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

const navigate = vi.fn();
const refreshUser = vi.fn();
const logout = vi.fn();

vi.mock('../lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
  subscribePlan: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

const paidPlan = {
  id: 'plan-essential',
  name: 'Plano Essencial',
  type: 'pago',
  is_active: true,
  description: 'Para negócios em crescimento.',
  max_markets: 3,
  max_terminals: 6,
  fiscal_monthly_limit: 200,
  price_monthly: 79.9,
  price_180days: 429.9,
  price_annual: 799.9,
};

const trialPlan = {
  id: 'plan-trial',
  name: 'Trial',
  type: 'trial',
  is_active: true,
  fiscal_monthly_limit: 50,
};

function renderPlans({ user, subscription = null }) {
  useAuth.mockReturnValue({ user, subscription, refreshUser, logout });
  api.get.mockResolvedValue({ data: [paidPlan, trialPlan] });
  return render(<Plans />);
}

describe('Plans', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscribePlan.mockResolvedValue({ data: { invoice_id: 'invoice-1', checkout_url: null } });
  });

  it('hides the free trial banner for a user who already has a plan', async () => {
    renderPlans({ user: { name: 'Ana', plan_id: 'plan-existing' } });

    expect(await screen.findByText('Plano Essencial')).toBeInTheDocument();
    expect(screen.queryByText(/14 dias grátis, sem cartão/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ativar teste/i })).not.toBeInTheDocument();
  });

  it('shows the trial banner and the plan limits when the user has no plan', async () => {
    renderPlans({ user: { name: 'Ana', plan_id: null } });

    expect(await screen.findByText('Comece grátis por 14 dias')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ativar teste grátis/i })).toBeInTheDocument();
    expect(screen.getByText(/200 emissões fiscais por mês/i)).toBeInTheDocument();
    expect(screen.getAllByText(/até 3 lojas/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/até 6 caixas/i).length).toBeGreaterThan(0);
  });

  it('generates an invoice and sends the user to the invoices tab instead of pretending to open checkout', async () => {
    const user = userEvent.setup();
    renderPlans({ user: { name: 'Ana', plan_id: null } });

    await screen.findByText('Plano Essencial');
    await user.click(screen.getByRole('button', { name: /assinar plano/i }));
    // Modo padrao (fatura) roda o CTA "Gerar fatura e continuar", nunca "Ir para o pagamento",
    // para nao prometer um pagamento que so acontece depois em Configuracoes > Faturas.
    await user.click(screen.getByRole('button', { name: /gerar fatura e continuar/i }));

    expect(subscribePlan).toHaveBeenCalledWith(expect.objectContaining({ billing_mode: 'invoice', subscription_type: 'monthly' }));
    expect(navigate).toHaveBeenCalledWith('/dashboard/settings?tab=invoices');
  });

  it('lets the user log out from the plans page', async () => {
    const user = userEvent.setup();
    renderPlans({ user: { name: 'Ana', plan_id: 'plan-existing' } });

    await screen.findByText('Plano Essencial');
    await user.click(screen.getByRole('button', { name: /sair/i }));

    expect(logout).toHaveBeenCalled();
  });
});
