import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FunnelsList from '../pages/admin/funnels/FunnelsList';
import api from '../lib/api';

const navigate = vi.fn();
vi.mock('../lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
  getApiErrorMessage: (e, fallback) => e?.response?.data?.detail?.message || fallback || 'erro',
}));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

const row = { id: 'f1', slug: 'oferta', name: 'Oferta BF', status: 'published', plan_id: 'p1',
  variant_count: 2, sessions_30d: 200, paid_30d: 10, paid_conversion_30d: 0.05 };

describe('FunnelsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: [row] });
  });

  it('lists funnels with 30-day kpis', async () => {
    render(<MemoryRouter><FunnelsList /></MemoryRouter>);
    expect(await screen.findByText('Oferta BF')).toBeInTheDocument();
    expect(screen.getByText('/f/oferta')).toBeInTheDocument();
    expect(screen.getByText('5,0%')).toBeInTheDocument();
    expect(screen.getByText(/publicado/i)).toBeInTheDocument();
  });

  it('creates a funnel and opens the editor', async () => {
    api.post.mockResolvedValue({ data: { funnel: { id: 'new-id' } } });
    const user = userEvent.setup();
    render(<MemoryRouter><FunnelsList /></MemoryRouter>);
    await screen.findByText('Oferta BF');
    await user.click(screen.getByRole('button', { name: /novo funil/i }));
    await user.type(screen.getByLabelText(/nome/i), 'Teste');
    await user.type(screen.getByLabelText(/slug/i), 'teste');
    await user.click(screen.getByRole('button', { name: /criar/i }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/admin/funnels', { name: 'Teste', slug: 'teste' }));
    expect(navigate).toHaveBeenCalledWith('/admin/funnels/new-id');
  });

  it('duplicates a funnel', async () => {
    api.post.mockResolvedValue({ data: { funnel: { id: 'copy' } } });
    const user = userEvent.setup();
    render(<MemoryRouter><FunnelsList /></MemoryRouter>);
    await user.click(await screen.findByRole('button', { name: /duplicar oferta bf/i }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/admin/funnels/f1/duplicate'));
  });
});
