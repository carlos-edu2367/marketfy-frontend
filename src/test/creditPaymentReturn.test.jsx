import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import api from '../lib/api';
import CreditPaymentReturn from '../pages/CreditPaymentReturn';

vi.mock('../lib/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('CreditPaymentReturn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('success page shows optimistic message and polls balance', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/identity/markets') {
        return Promise.resolve({ data: [{ id: 'market-1', name: 'Loja Centro' }] });
      }
      if (url === '/fiscal/market-1/credits/balance') {
        return Promise.resolve({
          data: {
            period: '202605',
            included_limit: 200,
            addon_limit: 310,
            used_count: 147,
            remaining: 363,
            percentage_used: 73.5,
          },
        });
      }
      return Promise.reject(new Error(`unexpected GET ${url}`));
    });

    render(
      <MemoryRouter initialEntries={['/fiscal/credits/return?status=success&marketId=market-1']}>
        <CreditPaymentReturn />
      </MemoryRouter>
    );

    expect(await screen.findByText('Pagamento realizado com sucesso')).toBeInTheDocument();
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/fiscal/market-1/credits/balance');
    });
    expect(await screen.findByText(/363 creditos disponiveis/i)).toBeInTheDocument();
  });

  it('failure page shows retry button', () => {
    render(
      <MemoryRouter initialEntries={['/fiscal/credits/return?status=failure&marketId=market-1']}>
        <CreditPaymentReturn />
      </MemoryRouter>
    );

    expect(screen.getByText('Pagamento nao aprovado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /tentar novamente/i })).toHaveAttribute(
      'href',
      '/fiscal/credits?marketId=market-1'
    );
  });

  it('pending page shows waiting message', () => {
    render(
      <MemoryRouter initialEntries={['/fiscal/credits/return?status=pending&marketId=market-1']}>
        <CreditPaymentReturn />
      </MemoryRouter>
    );

    expect(screen.getByText('Pagamento em processamento')).toBeInTheDocument();
  });
});

