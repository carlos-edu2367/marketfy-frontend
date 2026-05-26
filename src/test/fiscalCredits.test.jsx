import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import api from '../lib/api';
import CreditUsageBar from '../components/fiscal/CreditUsageBar';
import CreditPackageCard from '../components/fiscal/CreditPackageCard';
import CustomQuantityInput from '../components/fiscal/CustomQuantityInput';
import FiscalCredits from '../pages/FiscalCredits';

vi.mock('../lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'owner-1', name: 'Carlos' } }),
}));

const packagesPayload = {
  items: [
    { slug: 'pack_100', emission_count: 100, price_gross: '41.99', price_net_target: '39.90' },
    { slug: 'pack_250', emission_count: 250, price_gross: '73.57', price_net_target: '69.90' },
    { slug: 'pack_500', emission_count: 500, price_gross: '126.20', price_net_target: '119.90' },
  ],
};

const balancePayload = {
  period: '202605',
  included_limit: 200,
  addon_limit: 60,
  addon_total: 250,
  used_count: 147,
  remaining: 113,
  percentage_used: 73.5,
};

const historyPayload = {
  page: 1,
  per_page: 10,
  items: [
    {
      package_id: 'pkg-1',
      package_slug: 'pack_100',
      quantity: 100,
      remaining: 60,
      payment_status: 'paid',
      price_gross: '41.99',
      created_at: '2026-05-15T10:00:00Z',
    },
  ],
};

const configPayload = { min_qty: 10, max_qty: 10_000, unit_price: '0.72' };

function mockFiscalResponses() {
  api.get.mockImplementation((url) => {
    if (url === '/identity/markets') {
      return Promise.resolve({ data: [{ id: 'market-1', name: 'Loja Centro' }] });
    }
    if (url === '/fiscal/credits/packages') {
      return Promise.resolve({ data: packagesPayload });
    }
    if (url === '/fiscal/market-1/credits/balance') {
      return Promise.resolve({ data: balancePayload });
    }
    if (url === '/fiscal/market-1/credits/history') {
      return Promise.resolve({ data: historyPayload });
    }
    if (url === '/fiscal/credits/config') {
      return Promise.resolve({ data: configPayload });
    }
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  delete window.location;
  window.location = { href: 'http://localhost/fiscal/credits' };
});

// ---------------------------------------------------------------------------
// CreditUsageBar — PR7
// ---------------------------------------------------------------------------

describe('CreditUsageBar', () => {
  it('shows included usage percentage', () => {
    render(<CreditUsageBar used={147} includedLimit={200} addonLimit={60} addonTotal={250} period="202605" />);
    expect(screen.getByText('147/200')).toBeInTheDocument();
    expect(screen.getByText('73,5%')).toBeInTheDocument();
  });

  it('renders addon bar when addon_total > 0', () => {
    render(<CreditUsageBar used={100} includedLimit={200} addonLimit={60} addonTotal={250} period="202605" />);
    expect(screen.getByText(/60 restantes/i)).toBeInTheDocument();
    expect(screen.getByText(/250 comprados/i)).toBeInTheDocument();
    // Barra verde deve existir (h-3 bg-green-500)
    const bar = document.querySelector('.bg-green-500');
    expect(bar).toBeInTheDocument();
  });

  it('shows empty state when addon_total is 0', () => {
    render(<CreditUsageBar used={50} includedLimit={200} addonLimit={0} addonTotal={0} period="202605" />);
    expect(screen.getByText(/nenhum pacote ativo/i)).toBeInTheDocument();
    expect(document.querySelector('.bg-green-500')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// CreditPackageCard
// ---------------------------------------------------------------------------

describe('CreditPackageCard', () => {
  it('renders package price and popular marker', () => {
    render(
      <CreditPackageCard
        packageItem={packagesPayload.items[1]}
        loading={false}
        onPurchase={vi.fn()}
      />
    );

    expect(screen.getByRole('article', { name: /250 emissoes extras/i })).toBeInTheDocument();
    expect(screen.getByText('R$ 73,57')).toBeInTheDocument();
    expect(screen.getByText('Mais popular')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// CustomQuantityInput — PR8
// ---------------------------------------------------------------------------

describe('CustomQuantityInput', () => {
  it('shows price after debounce', async () => {
    const user = userEvent.setup({ delay: null });
    api.get.mockResolvedValue({
      data: { quantity: 250, price_gross: '180.00', unit_price: '0.72' },
    });

    render(<CustomQuantityInput onPurchase={vi.fn()} />);
    const input = screen.getByLabelText(/quantidade de creditos/i);
    await user.type(input, '250');

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/fiscal/credits/price', { params: { qty: 250 } });
    }, { timeout: 1000 });

    expect(await screen.findByText(/R\$ 180,00/i)).toBeInTheDocument();
  });

  it('shows error when quantity is below minimum', async () => {
    const user = userEvent.setup({ delay: null });
    render(<CustomQuantityInput onPurchase={vi.fn()} minQty={10} />);
    const input = screen.getByLabelText(/quantidade de creditos/i);
    await user.type(input, '5');
    const alert = await screen.findByRole('alert');
    expect(alert).toBeInTheDocument();
    // Usa within para distinguir o texto do alerta do texto de ajuda do rodapé
    expect(within(alert).getByText(/minimo 10 creditos/i)).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalledWith('/fiscal/credits/price', expect.anything());
  });
});

// ---------------------------------------------------------------------------
// FiscalCredits — PR7 + PR8
// ---------------------------------------------------------------------------

describe('FiscalCredits', () => {
  it('renders three package cards and purchase history with remaining column', async () => {
    mockFiscalResponses();

    render(
      <MemoryRouter initialEntries={['/fiscal/credits?marketId=market-1']}>
        <FiscalCredits />
      </MemoryRouter>
    );

    expect(await screen.findByText('Creditos fiscais')).toBeInTheDocument();
    const cards = await screen.findAllByRole('article');
    expect(cards).toHaveLength(3);
    expect(within(cards[0]).getByText('100 emissoes extras')).toBeInTheDocument();
    expect(within(cards[1]).getByText('250 emissoes extras')).toBeInTheDocument();
    expect(within(cards[2]).getByText('500 emissoes extras')).toBeInTheDocument();

    // Coluna Restante (PR8)
    expect(screen.getByText('Restante')).toBeInTheDocument();
    expect(screen.getByText('15/05/2026')).toBeInTheDocument();
    expect(screen.getByText('Pago')).toBeInTheDocument();
  });

  it('passes addon_total to CreditUsageBar', async () => {
    mockFiscalResponses();

    render(
      <MemoryRouter initialEntries={['/fiscal/credits?marketId=market-1']}>
        <FiscalCredits />
      </MemoryRouter>
    );

    // Aguarda renderização com dados
    await screen.findByText('Creditos fiscais');
    await waitFor(() => {
      expect(screen.queryByText(/250 comprados/i)).toBeInTheDocument();
    });
  });

  it('clicking buy opens confirmation modal and redirects to init_point', async () => {
    const user = userEvent.setup();
    mockFiscalResponses();
    api.post.mockResolvedValue({
      data: {
        package_id: 'pkg-250',
        init_point: 'https://sandbox.mercadopago.com/checkout',
        package: packagesPayload.items[1],
      },
    });

    render(
      <MemoryRouter initialEntries={['/fiscal/credits?marketId=market-1']}>
        <FiscalCredits />
      </MemoryRouter>
    );

    const pack250 = await screen.findByRole('article', { name: /250 emissoes extras/i });
    await user.click(within(pack250).getByRole('button', { name: /comprar/i }));
    expect(screen.getByRole('dialog', { name: /confirmar compra/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /continuar no mercado pago/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/fiscal/market-1/credits/checkout',
        expect.objectContaining({
          package_slug: 'pack_250',
          idempotency_key: expect.stringMatching(/^mktf:owner-1:pack_250:\d+$/),
        })
      );
      expect(window.location.href).toBe('https://sandbox.mercadopago.com/checkout');
    });
  });

  it('custom quantity section is rendered', async () => {
    mockFiscalResponses();

    render(
      <MemoryRouter initialEntries={['/fiscal/credits?marketId=market-1']}>
        <FiscalCredits />
      </MemoryRouter>
    );

    expect(await screen.findByText(/quantidade personalizada/i)).toBeInTheDocument();
  });
});
