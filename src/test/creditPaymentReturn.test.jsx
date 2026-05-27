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

  it('renders processing state and polls balance in background', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/identity/markets') {
        return Promise.resolve({ data: [{ id: 'market-1', name: 'Loja Centro' }] });
      }
      if (url === '/fiscal/market-1/credits/balance') {
        return Promise.resolve({
          data: {
            period: '202605',
            included_limit: 200,
            addon_limit: 60,
            addon_total: 400,
            used_count: 147,
            remaining: 113,
            percentage_used: 73.5,
          },
        });
      }
      return Promise.reject(new Error(`unexpected GET ${url}`));
    });

    render(
      <MemoryRouter initialEntries={['/fiscal/credits/return?marketId=market-1']}>
        <CreditPaymentReturn />
      </MemoryRouter>
    );

    expect(await screen.findByText('Processamento de pagamento')).toBeInTheDocument();
    expect(screen.getByText(/Seu pagamento está sendo processado/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/fiscal/market-1/credits/balance');
    });
  });

  it('detects activation when addon_limit increases and shows success state', async () => {
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
      <MemoryRouter initialEntries={['/fiscal/credits/return?marketId=market-1']}>
        <CreditPaymentReturn />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/250 créditos adicionados/i));
    }, { timeout: 8000 });

    expect(await screen.findByText(/Créditos ativados com sucesso!/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /voltar para créditos/i })).toHaveAttribute(
      'href',
      '/dashboard/fiscal/credits?marketId=market-1'
    );
  });
});
