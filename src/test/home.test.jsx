import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Home from '../pages/Home';
import api from '../lib/api';

vi.mock('../lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const paidPlan = {
  id: 'plan-essential',
  name: 'Plano Essencial',
  type: 'pago',
  is_active: true,
  description: 'Para negócios em crescimento.',
  max_markets: 3,
  max_terminals: 6,
  fiscal_monthly_limit: 200,
  price_monthly: 79.9,
  price_180days: 429.9,
  price_annual: 799.9,
};

describe('Home (landing)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: [paidPlan] });
  });

  afterEach(() => vi.unstubAllEnvs());

  it('uses a single, consistent primary CTA label site-wide', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    // A landing nao deve mais espalhar rotulos diferentes ("Criar Conta
    // Gratis", "Comecar Teste Gratis", "Criar Minha Conta Agora") para a
    // mesma acao — todo CTA primario fala a mesma coisa.
    const ctas = await screen.findAllByRole('link', { name: /testar grátis por 14 dias/i });
    expect(ctas.length).toBeGreaterThanOrEqual(2);
    ctas.forEach((cta) => expect(cta).toHaveAttribute('href', '/register'));
  });

  it('shows real plan data from the API instead of hardcoded prices', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(await screen.findByText('Plano Essencial')).toBeInTheDocument();
    // R$ 79,90 e o price_monthly retornado pela API — nao um valor fixo no componente.
    expect(screen.getByText('79,90')).toBeInTheDocument();

    const planCta = screen
      .getAllByRole('link', { name: /testar grátis/i })
      .find((link) => link.getAttribute('href')?.includes('plan-essential'));
    expect(planCta).toBeTruthy();
  });

  it('does not claim features the product does not have', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    await screen.findByText('Plano Essencial');

    expect(screen.queryByText(/curva abc/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ticket médio/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/importa[cç][aã]o de produtos/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/aplicativo instalado/i)).not.toBeInTheDocument();
  });

  it('hides the tailored-plan contact when no sales channel is configured', async () => {
    render(<MemoryRouter><Home /></MemoryRouter>);
    await screen.findByText('Plano Essencial');

    expect(screen.queryByText(/rede com várias lojas/i)).not.toBeInTheDocument();
    expect(document.querySelector('a[href*="intent=business"]')).toBeNull();
  });

  it('links the tailored-plan contact to the configured sales channel', async () => {
    vi.stubEnv('VITE_SALES_CONTACT_URL', 'https://wa.me/5500000000000');
    render(<MemoryRouter><Home /></MemoryRouter>);

    const link = await screen.findByRole('link', { name: /fale com a gente/i });
    expect(link).toHaveAttribute('href', 'https://wa.me/5500000000000');
  });

  it('shows legal name and CNPJ in the footer only when configured', async () => {
    vi.stubEnv('VITE_COMPANY_LEGAL_NAME', 'Marketfy Tecnologia LTDA');
    vi.stubEnv('VITE_COMPANY_CNPJ', '00.000.000/0001-00');
    render(<MemoryRouter><Home /></MemoryRouter>);

    expect(await screen.findByText(/Marketfy Tecnologia LTDA · CNPJ 00\.000\.000\/0001-00/)).toBeInTheDocument();
  });
});
