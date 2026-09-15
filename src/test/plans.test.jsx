import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Plans from '../pages/auth/Plans';
import api, { subscribePlan } from '../lib/api';
import { fetchInvoiceCheckoutUrl } from '../lib/invoiceCheckout';
import { useAuth } from '../hooks/useAuth';

const navigate = vi.fn();
const refreshUser = vi.fn();
const logout = vi.fn();
const originalLocation = window.location;

vi.mock('../lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
  subscribePlan: vi.fn(),
}));

vi.mock('../lib/invoiceCheckout', () => ({ fetchInvoiceCheckoutUrl: vi.fn() }));

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

vi.mock('../lib/analytics', () => ({ track: vi.fn() }));

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
    fetchInvoiceCheckoutUrl.mockResolvedValue(null);
    delete window.location;
    window.location = { href: '' };
    localStorage.clear();
  });

  afterEach(() => {
    window.location = originalLocation;
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

  it('sends the user straight to payment after generating the invoice', async () => {
    const user = userEvent.setup();
    fetchInvoiceCheckoutUrl.mockResolvedValue('https://pay.example/checkout');
    renderPlans({ user: { name: 'Ana', plan_id: null } });

    await screen.findByText('Plano Essencial');
    await user.click(screen.getByRole('button', { name: /assinar plano/i }));
    await user.click(screen.getByRole('button', { name: /ir para o pagamento/i }));

    expect(subscribePlan).toHaveBeenCalledWith(expect.objectContaining({ billing_mode: 'invoice', subscription_type: 'monthly' }));
    await waitFor(() => expect(fetchInvoiceCheckoutUrl).toHaveBeenCalledWith('invoice-1'));
    expect(window.location.href).toBe('https://pay.example/checkout');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('falls back to the invoices tab when the payment link is not ready', async () => {
    const user = userEvent.setup();
    renderPlans({ user: { name: 'Ana', plan_id: null } });

    await screen.findByText('Plano Essencial');
    await user.click(screen.getByRole('button', { name: /assinar plano/i }));
    await user.click(screen.getByRole('button', { name: /ir para o pagamento/i }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard/settings?tab=invoices'));
  });

  it('resumes the plan chosen on the landing with its billing cycle', async () => {
    const user = userEvent.setup();
    localStorage.setItem('marketfy_plan_intent', JSON.stringify({ planId: 'plan-essential', cycle: 'annual', savedAt: Date.now() }));
    renderPlans({ user: { name: 'Ana', plan_id: 'plan-trial' }, subscription: { status: 'trialing' } });

    expect(await screen.findByText(/você escolheu o/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /assinar plano essencial/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Anual')).toBeInTheDocument();
  });

  it('forgets the landing choice when the user wants to see every plan', async () => {
    const user = userEvent.setup();
    localStorage.setItem('marketfy_plan_intent', JSON.stringify({ planId: 'plan-essential', cycle: 'monthly', savedAt: Date.now() }));
    renderPlans({ user: { name: 'Ana', plan_id: 'plan-trial' }, subscription: { status: 'trialing' } });

    await user.click(await screen.findByRole('button', { name: /ver todos os planos/i }));

    expect(screen.queryByText(/você escolheu o/i)).not.toBeInTheDocument();
    expect(localStorage.getItem('marketfy_plan_intent')).toBeNull();
  });

  it('highlights only the plan the business marked as recommended', async () => {
    useAuth.mockReturnValue({ user: { name: 'Ana', plan_id: 'x' }, subscription: null, refreshUser, logout });
    api.get.mockResolvedValue({
      data: [
        { ...paidPlan, id: 'p1', name: 'Básico', price_monthly: 49.9 },
        { ...paidPlan, id: 'p2', name: 'Pro', price_monthly: 99.9, is_recommended: true },
        { ...paidPlan, id: 'p3', name: 'Rede', price_monthly: 199.9 },
      ],
    });
    render(<Plans />);

    expect(await screen.findAllByText('Recomendado')).toHaveLength(1);
    expect(screen.getByText('Recomendado').closest('article')).toHaveTextContent('Pro');
    expect(screen.getAllByText(/sem fidelidade/i)).toHaveLength(2); // faixa unica + nota do toggle, nunca 1 por card
  });

  it('reuses the registered CPF for card billing without asking again', async () => {
    const user = userEvent.setup();
    renderPlans({ user: { name: 'Ana', plan_id: null, document_masked: '***.456.789-**' } });

    await screen.findByText('Plano Essencial');
    await user.click(screen.getByRole('button', { name: /assinar plano/i }));
    await user.click(screen.getByRole('button', { name: /cartão de crédito/i }));

    expect(screen.getByLabelText(/usar o cpf do cadastro/i)).toBeChecked();
    expect(screen.queryByPlaceholderText(/somente números/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /ir para o pagamento/i }));

    expect(subscribePlan).toHaveBeenCalledWith(expect.objectContaining({ billing_mode: 'recurring', document: undefined }));
  });

  it('asks for another document when the user unchecks the registered one', async () => {
    const user = userEvent.setup();
    renderPlans({ user: { name: 'Ana', plan_id: null, document_masked: '***.456.789-**' } });

    await screen.findByText('Plano Essencial');
    await user.click(screen.getByRole('button', { name: /assinar plano/i }));
    await user.click(screen.getByRole('button', { name: /cartão de crédito/i }));
    await user.click(screen.getByLabelText(/usar o cpf do cadastro/i));
    await user.type(screen.getByPlaceholderText(/somente números/i), '98765432000110');
    await user.click(screen.getByRole('button', { name: /ir para o pagamento/i }));

    expect(subscribePlan).toHaveBeenCalledWith(expect.objectContaining({ document: '98765432000110' }));
  });

  it('lets the user log out from the plans page', async () => {
    const user = userEvent.setup();
    renderPlans({ user: { name: 'Ana', plan_id: 'plan-existing' } });

    await screen.findByText('Plano Essencial');
    await user.click(screen.getByRole('button', { name: /sair/i }));

    expect(logout).toHaveBeenCalled();
  });

  it('tracks checkout_modal_opened when a plan is selected', async () => {
    const { track } = await import('../lib/analytics');
    const user = userEvent.setup();
    renderPlans({ user: { name: 'Ana', plan_id: null } });

    await screen.findByText('Plano Essencial');
    await user.click(screen.getByRole('button', { name: /assinar plano/i }));

    expect(track).toHaveBeenCalledWith('checkout_modal_opened', { plan_id: 'plan-essential' });
  });

  it('tracks checkout_started and checkout_completed for an invoice checkout redirect', async () => {
    const { track } = await import('../lib/analytics');
    const user = userEvent.setup();
    fetchInvoiceCheckoutUrl.mockResolvedValue('https://pay.example/checkout');
    renderPlans({ user: { name: 'Ana', plan_id: null } });

    await screen.findByText('Plano Essencial');
    await user.click(screen.getByRole('button', { name: /assinar plano/i }));
    await user.click(screen.getByRole('button', { name: /ir para o pagamento/i }));

    expect(track).toHaveBeenCalledWith('checkout_started', {
      plan_id: 'plan-essential', billing_mode: 'invoice', subscription_type: 'monthly',
    });
    await waitFor(() => expect(track).toHaveBeenCalledWith('checkout_completed', {
      plan_id: 'plan-essential', billing_mode: 'invoice', outcome: 'redirected_to_payment',
    }));
  });

  it('tracks checkout_completed as invoice_pending when the payment link is not ready', async () => {
    const { track } = await import('../lib/analytics');
    const user = userEvent.setup();
    renderPlans({ user: { name: 'Ana', plan_id: null } });

    await screen.findByText('Plano Essencial');
    await user.click(screen.getByRole('button', { name: /assinar plano/i }));
    await user.click(screen.getByRole('button', { name: /ir para o pagamento/i }));

    await waitFor(() => expect(track).toHaveBeenCalledWith('checkout_completed', {
      plan_id: 'plan-essential', billing_mode: 'invoice', outcome: 'invoice_pending',
    }));
  });

  it('tracks trial_activated when the free trial is activated from this page', async () => {
    const { track } = await import('../lib/analytics');
    const user = userEvent.setup();
    renderPlans({ user: { name: 'Ana', plan_id: null } });

    await screen.findByText('Comece grátis por 14 dias');
    await user.click(screen.getByRole('button', { name: /ativar teste grátis/i }));

    await waitFor(() => expect(track).toHaveBeenCalledWith('trial_activated'));
  });
});
