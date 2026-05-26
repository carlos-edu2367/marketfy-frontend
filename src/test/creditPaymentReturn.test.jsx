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

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import toast from 'react-hot-toast';

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
            addon_total: 400,
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

  it('detects activation when addon_limit increases and shows toast', async () => {
    let callCount = 0;
    api.get.mockImplementation((url) => {
      if (url === '/identity/markets') {
        return Promise.resolve({ data: [{ id: 'market-1' }] });
      }
      if (url === '/fiscal/market-1/credits/balance') {
        callCount += 1;
        const addonLimit = callCount === 1 ? 60 : 310;
        return Promise.resolve({
          data: {
            period: '202605',
            included_limit: 200,
            addon_limit: addonLimit,
            addon_total: 400,
            used_count: 100,
            remaining: 260 + addonLimit - 60,
            percentage_used: 20.0,
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

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/250 creditos adicionados/i));
    }, { timeout: 8000 });

    expect(await screen.findByText(/creditos ativados com sucesso/i)).toBeInTheDocument();
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
      '/dashboard/fiscal/credits?marketId=market-1'
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
