import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import api from '../lib/api';
import FiscalCenter from '../components/fiscal/FiscalCenter';

vi.mock('../lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

describe('FiscalCenter', () => {
  beforeEach(() => vi.clearAllMocks());

  it('never reports all configured after an API failure', async () => {
    api.get.mockRejectedValueOnce({ response: { status: 500 } });

    render(<FiscalCenter marketId="market-1" />);

    expect(await screen.findByText(/não foi possível carregar/i)).toBeInTheDocument();
    expect(screen.queryByText(/todos os produtos ativos estão configurados/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
  });

  it('shows the configured empty state only after a successful response', async () => {
    api.get.mockResolvedValueOnce({
      data: { items: [], summary: { total_active_products: 0 } },
    });

    render(<FiscalCenter marketId="market-1" />);

    expect(await screen.findByText(/todos os produtos ativos estão configurados/i)).toBeInTheDocument();
  });
});
