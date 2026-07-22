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
  pixOauthStatus: vi.fn(),
}));

vi.mock('../lib/db', () => ({
  db: {
    fiscal_state: { get: vi.fn(), put: vi.fn() },
    products: { where: vi.fn() },
    sales_queue: { where: vi.fn(), add: vi.fn() },
  },
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'operator-1', name: 'Operador', role: 'owner' } }),
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
  default: ({ onGeneratePixQr }) => (
    <button type="button" onClick={onGeneratePixQr}>Gerar Pix QR</button>
  ),
}));

vi.mock('../components/pdv/PixQrModal', () => ({
  default: ({ onApproved }) => (
    <button
      type="button"
      onClick={() => onApproved({
        attempt_id: 'attempt-1',
        sale_id: 'qr-sale-1',
        amount: '12.00',
        status: 'approved',
      })}
    >
      Simular Pix aprovado
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

describe('PDV Pix QR completion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('terminal_market-1', terminalId);
    db.fiscal_state.get.mockResolvedValue(null);
    db.sales_queue.where.mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) });
    db.products.where.mockReturnValue({
      equals: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([product]) }),
    });
    getFiscalCreditsBalance.mockResolvedValue({ data: null });
    api.get.mockImplementation((url) => {
      if (url === '/identity/markets') return Promise.resolve({ data: [{ id: 'market-1', name: 'Mercado' }] });
      if (url.includes('/box')) return Promise.resolve({ data: { id: 'box-1' } });
      if (url === '/sales/market-1/qr-sale-1') {
        return Promise.resolve({
          data: {
            id: 'qr-sale-1', market_id: 'market-1', box_id: 'box-1', total_amount: '12.00',
            items: [{ product_id: 'product-1', product_name: 'Arroz', quantity: '1', unit_price: '12.00', total: '12.00' }],
            payments: [{ method: 'pix', amount: '12.00', modality: 'qr_dynamic' }],
          },
        });
      }
      return Promise.resolve({ data: [] });
    });
    api.post.mockResolvedValue({ data: {} });
  });

  it('uses the sale confirmed by the backend instead of creating a manual local Pix sale', async () => {
    const user = userEvent.setup();
    renderPdv();

    const search = await screen.findByPlaceholderText(/buscar produto/i);
    await user.type(search, 'arroz');
    await user.click(await screen.findByRole('button', { name: /arroz/i }));
    await user.click(screen.getByRole('button', { name: /pagar \(f2\)/i }));
    await user.click(screen.getByRole('button', { name: /gerar pix qr/i }));
    await user.click(screen.getByRole('button', { name: /simular pix aprovado/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith(
      '/fiscal/market-1/sales/qr-sale-1/emit',
    ));
    expect(api.get).toHaveBeenCalledWith('/sales/market-1/qr-sale-1');
    expect(db.sales_queue.add).not.toHaveBeenCalled();
    expect(await screen.findByText(/venda realizada/i)).toBeInTheDocument();
  });
});
