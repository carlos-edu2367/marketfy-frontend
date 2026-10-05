import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FunnelMetricsTab from '../components/admin/funnels/FunnelMetricsTab';
import api from '../lib/api';

vi.mock('../lib/api', () => ({ default: { get: vi.fn() }, getApiErrorMessage: () => 'erro' }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }));
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return { ...actual, ResponsiveContainer: ({ children }) => <div style={{ width: 600, height: 240 }}>{children}</div> };
});

const detail = { funnel: { id: 'f1' }, variants: [{ id: 'v1', name: 'A' }, { id: 'v2', name: 'B' }] };
const metrics = {
  period: { from: '2026-09-05', to: '2026-10-04' }, maturing: true,
  summary: { sessions: 400, completed: 120, registered: 60, trials: 55, subscribed: 20, paid: 12, paid_conversion: 0.03, revenue: '1198.80' },
  steps: [
    { key: 'step:0', label: 'Intro', count: 400, pct_of_total: 1, drop_from_previous: null },
    { key: 'step:1', label: 'Oferta', count: 200, pct_of_total: 0.5, drop_from_previous: 0.5 },
    { key: 'paid', label: 'Pagamento', count: 12, pct_of_total: 0.03, drop_from_previous: 0.4 },
  ],
  variants: [
    { variant_id: 'v1', name: 'A', weight: 50, sessions: 200, registered: 30, paid: 4, conversion: 0.02, revenue_per_session: '2.00', confidence: null, low_sample: false, is_control: true },
    { variant_id: 'v2', name: 'B', weight: 50, sessions: 200, registered: 30, paid: 8, conversion: 0.04, revenue_per_session: '4.00', confidence: null, low_sample: true, is_control: false },
  ],
  sources: [{ utm_source: null, utm_campaign: null, sessions: 400, registered: 60, paid: 12, conversion: 0.03 }],
  timeseries: [{ date: '2026-10-01', sessions: 10, paid: 1 }],
};

describe('FunnelMetricsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: metrics });
  });

  it('renders summary, steps, variants and sources', async () => {
    render(<FunnelMetricsTab detail={detail} />);
    expect(await screen.findByText('400', { selector: 'div' })).toBeInTheDocument();
    expect(screen.getByText('3,0%', { selector: 'div' })).toBeInTheDocument();
    expect(screen.getByText(/1\.198,80/)).toBeInTheDocument();
    expect(screen.getByText('Oferta')).toBeInTheDocument();
    expect(screen.getByText('-50,0%')).toBeInTheDocument();
    expect(screen.getByText(/amostra pequena/i)).toBeInTheDocument();
    expect(screen.getByText(/controle/i)).toBeInTheDocument();
    expect(screen.getByText(/direto \/ sem origem/i)).toBeInTheDocument();
    expect(screen.getByText(/amadurecendo/i)).toBeInTheDocument();
  });

  it('refetches with filters', async () => {
    const user = userEvent.setup();
    render(<FunnelMetricsTab detail={detail} />);
    await screen.findByText('400', { selector: 'div' });
    await user.selectOptions(screen.getByLabelText(/variante/i), 'v2');
    await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/admin/funnels/f1/metrics', {
      params: expect.objectContaining({ variant_id: 'v2' }),
    }));
  });
});
