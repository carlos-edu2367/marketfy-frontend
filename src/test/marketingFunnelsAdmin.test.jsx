import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MarketingFunnels from '../pages/admin/MarketingFunnels';
import { getMarketingFunnelLeads, getMarketingFunnelSummary } from '../lib/marketingFunnelApi';

vi.mock('../lib/marketingFunnelApi', () => ({
  getMarketingFunnelSummary: vi.fn(),
  getMarketingFunnelLeads: vi.fn(),
}));

const summary = [
  {
    funnel_variant: 'A',
    steps: [
      { label: 'Início', count: 100, conversion_pct: 100, drop_off_pct: 0 },
      { label: 'Lead enviado', count: 20, conversion_pct: 20, drop_off_pct: 80 },
      { label: 'CTA clicado', count: 10, conversion_pct: 10, drop_off_pct: 50 },
    ],
    lead_count: 20,
    cta_click_count: 10,
    lead_to_cta_rate: 50,
  },
  {
    funnel_variant: 'B',
    steps: [
      { label: 'Início', count: 80, conversion_pct: 100, drop_off_pct: 0 },
      { label: 'Lead enviado', count: 30, conversion_pct: 37.5, drop_off_pct: 62.5 },
      { label: 'CTA clicado', count: 12, conversion_pct: 15, drop_off_pct: 60 },
    ],
    lead_count: 30,
    cta_click_count: 12,
    lead_to_cta_rate: 40,
  },
];

const leads = [
  { id: 'l1', funnel_variant: 'A', name: 'Ana', phone: '11999990000', email: null, control_score: 40, created_at: '2026-09-15T10:00:00Z' },
];

describe('MarketingFunnels (/admin/funis)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMarketingFunnelSummary.mockResolvedValue({ data: summary });
    getMarketingFunnelLeads.mockResolvedValue({ data: leads });
  });

  it('shows lead counts and CTA rate for both funnels', async () => {
    render(<MarketingFunnels />);

    expect(await screen.findByRole('heading', { name: /funil a/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /funil b/i })).toBeInTheDocument();
    expect(screen.getByText(/20 leads/i)).toBeInTheDocument();
    expect(screen.getByText(/30 leads/i)).toBeInTheDocument();
    expect(screen.getByText(/50% dos leads clicaram no cta/i)).toBeInTheDocument();
  });

  it('lists captured leads', async () => {
    render(<MarketingFunnels />);

    const row = (await screen.findByText('Ana')).closest('tr');
    expect(within(row).getByText('11999990000')).toBeInTheDocument();
  });

  it('refetches leads filtered by variant when the select changes', async () => {
    const user = userEvent.setup();
    render(<MarketingFunnels />);
    await screen.findByText('Ana');

    await user.selectOptions(screen.getByRole('combobox'), 'B');

    expect(getMarketingFunnelLeads).toHaveBeenCalledWith('B');
  });
});
