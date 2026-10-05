import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FunnelOfferPanel from '../components/marketing/FunnelOfferPanel';
import api from '../lib/api';
import { trackFunnelEvent } from '../lib/funnelTracking';

vi.mock('../lib/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../lib/funnelTracking', () => ({ trackFunnelEvent: vi.fn() }));

const plans = [
  {
    id: 'plan-basic', name: 'Básico', type: 'pago', is_active: true,
    max_markets: 1, max_terminals: 1, fiscal_monthly_limit: 0,
    price_monthly: '129.90', price_180days: '699.90', price_annual: '1299.90',
  },
  {
    id: 'plan-pro', name: 'Pro', type: 'pago', is_active: true, is_recommended: true,
    max_markets: 3, max_terminals: 6, fiscal_monthly_limit: 300,
    price_monthly: '259.90', price_180days: '1399.90', price_annual: '2599.90',
  },
];

const renderPanel = () =>
  render(
    <MemoryRouter>
      <FunnelOfferPanel funnelVariant="A" />
    </MemoryRouter>
  );

describe('FunnelOfferPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: plans });
  });

  it('shows the recommended plan with the real price and a CTA to register', async () => {
    renderPanel();

    expect(await screen.findByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('259,90')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /quero o pro/i })).toHaveAttribute(
      'href',
      '/register?plan=plan-pro&cycle=monthly'
    );
  });

  it('tracks offer_view on mount and offer_cta_click on the main CTA', async () => {
    renderPanel();
    await screen.findByText('Pro');

    expect(trackFunnelEvent).toHaveBeenCalledWith('marketfy_offer_view', { funnelVariant: 'A' });

    await userEvent.click(screen.getByRole('link', { name: /quero o pro/i }));
    expect(trackFunnelEvent).toHaveBeenCalledWith('marketfy_offer_cta_click', {
      funnelVariant: 'A',
      plan_id: 'plan-pro',
    });
  });

  it('reveals the downsell plan when declining the main offer', async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText('Pro');

    await user.click(screen.getByRole('button', { name: /algo mais enxuto/i }));

    expect(screen.getByText('Básico')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /escolher básico/i })).toHaveAttribute(
      'href',
      '/register?plan=plan-basic&cycle=monthly'
    );
  });
});
