import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import api, { getFiscalCreditsBalance } from '../lib/api';
import { db } from '../lib/db';
import PDV from '../pages/pdv/Pdv';

vi.mock('../lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
  getFiscalCreditsBalance: vi.fn(),
}));

vi.mock('../lib/db', () => ({
  db: {
    fiscal_state: { get: vi.fn(), put: vi.fn() },
    products: { where: vi.fn() },
    sales_queue: { where: vi.fn(), add: vi.fn() },
  },
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'operator-1', name: 'Operador' } }),
}));

vi.mock('../hooks/useSync', () => ({
  useSync: () => ({ isOnline: true, pendingSalesCount: 0, syncSales: vi.fn() }),
  buildSyncSalePayload: vi.fn((sale) => sale),
  isFiscalRuleFailure: vi.fn(() => false),
}));

vi.mock('../hooks/useFiscalStatus', () => ({
  useFiscalStatus: () => ({
    status: null,
    isPolling: false,
    hasTimedOut: false,
    isAuthorized: false,
    stopPolling: vi.fn(),
  }),
}));

vi.mock('../components/pdv/PaymentModal', () => ({
  default: ({ onConfirm }) => (
    <button type="button" onClick={() => onConfirm([{ method: 'pix', amount: '12.00' }])}>
      Confirmar pagamento
    </button>
  ),
}));

vi.mock('../components/pdv/Receipt', () => ({ generateReceipt: vi.fn() }));
vi.mock('../lib/fiscalPrint', () => ({ isAuthorizedNfceInvoice: vi.fn(() => false), printAuthorizedNfce: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

const terminalId = '11111111-1111-1111-1111-111111111111';
const product = { id: 'product-1', name: 'Arroz', code: 'ARZ-1', barcode: '7890000000000', price: 12 };

function renderPdv() {
  return render(
    <MemoryRouter initialEntries={['/pdv/market-1']}>
      <Routes>
        <Route path="/pdv/:marketId" element={<PDV />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PDV fiscal block', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('terminal_market-1', terminalId);
    db.fiscal_state.get.mockResolvedValue(null);
    db.fiscal_state.put.mockResolvedValue(undefined);
    db.sales_queue.where.mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) });
    db.products.where.mockReturnValue({
      equals: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([product]),
        filter: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(product) }),
      }),
    });
    getFiscalCreditsBalance.mockResolvedValue({ data: null });
    api.get.mockImplementation((url) => {
      if (url === '/identity/markets') return Promise.resolve({ data: [{ id: 'market-1', name: 'Mercado' }] });
      if (url.includes('/box')) return Promise.resolve({ data: { id: 'box-1' } });
      return Promise.resolve({ data: [] });
    });
    api.post.mockResolvedValue({
      data: {
        enforcement: 'block',
        allowed: false,
        errors: [{ code: 'sale.fiscal_rule_missing', product_name: 'Arroz' }],
      },
    });
  });

  it('keeps the cart item when an online fiscal preflight blocks checkout', async () => {
    const user = userEvent.setup();
    renderPdv();

    const search = await screen.findByPlaceholderText(/buscar produto/i);
    await user.type(search, 'arroz');
    await user.click(await screen.findByRole('button', { name: /arroz/i }));
    await user.click(screen.getByRole('button', { name: /pagar \(f2\)/i }));
    await user.click(screen.getByRole('button', { name: /confirmar pagamento/i }));

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Remover' })).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/fiscal/market-1/sales/preflight', expect.any(Object));
  });
});
