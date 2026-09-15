import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Pricing from '../pages/Pricing';
import api from '../lib/api';

vi.mock('../lib/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../lib/analytics', () => ({ track: vi.fn() }));

const plans = [
  { id: 'p1', name: 'Básico', type: 'pago', is_active: true, max_markets: 1, max_terminals: 1, fiscal_monthly_limit: 0, price_monthly: '49.90', price_180days: '269.90', price_annual: '499.90' },
  { id: 'p2', name: 'Pro', type: 'pago', is_active: true, is_recommended: true, max_markets: 3, max_terminals: 6, fiscal_monthly_limit: 300, price_monthly: '99.90', price_180days: '539.90', price_annual: '999.90' },
];

const renderPage = () => render(<MemoryRouter><Pricing /></MemoryRouter>);

describe('Pricing (/precos)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: plans });
  });

  it('sends each plan CTA to signup with the plan and cycle', async () => {
    const user = userEvent.setup();
    renderPage();

    const proCard = (await screen.findByRole('heading', { name: 'Pro', level: 3 })).closest('article');
    expect(within(proCard).getByRole('link', { name: /testar grátis/i })).toHaveAttribute('href', '/register?plan=p2&cycle=monthly');

    await user.click(screen.getByRole('button', { name: 'Anual' }));
    expect(within(proCard).getByRole('link', { name: /testar grátis/i })).toHaveAttribute('href', '/register?plan=p2&cycle=annual');
  });

  it('compares real limits side by side', async () => {
    renderPage();
    const table = await screen.findByRole('table', { name: /comparar planos/i });

    expect(within(table).getByRole('columnheader', { name: 'Pro' })).toBeInTheDocument();
    expect(within(table).getByText('Até 3 lojas')).toBeInTheDocument();
    expect(within(table).getByText('Emissões fiscais não incluídas')).toBeInTheDocument();
  });

  it('answers billing questions with facts from the product', async () => {
    renderPage();
    await screen.findByRole('table', { name: /comparar planos/i });

    expect(screen.getByText(/quais formas de pagamento/i)).toBeInTheDocument();
    expect(screen.getByText(/3 dias de tolerância/i)).toBeInTheDocument();
  });

  it('tracks plan_cta_clicked when a plan CTA is clicked', async () => {
    const { track } = await import('../lib/analytics');
    const user = userEvent.setup();
    renderPage();

    const proCard = (await screen.findByRole('heading', { name: 'Pro', level: 3 })).closest('article');
    await user.click(within(proCard).getByRole('link', { name: /testar grátis/i }));

    expect(track).toHaveBeenCalledWith('plan_cta_clicked', expect.objectContaining({ plan_id: 'p2' }));
  });
});
