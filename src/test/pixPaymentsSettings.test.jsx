import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PixPaymentsSettings from '../components/settings/PixPaymentsSettings';

vi.mock('../lib/api', () => ({
  pixOauthStatus: vi.fn(() => Promise.resolve({ data: { status: 'not_connected' } })),
  pixOauthAuthorize: vi.fn(() => Promise.resolve({ data: { authorization_url: 'https://auth.mercadopago.com/x' } })),
  pixOauthTest: vi.fn(), pixOauthDisconnect: vi.fn(), pixUpdateSettings: vi.fn(),
}));

describe('PixPaymentsSettings', () => {
  it('shows connect button when not connected', async () => {
    render(<PixPaymentsSettings marketId="m1" />);
    await waitFor(() => expect(screen.getByText(/Conectar Mercado Pago/i)).toBeInTheDocument());
  });

  it('shows the approved fees notice: only Mercado Pago charges, Neectify does not', async () => {
    render(<PixPaymentsSettings marketId="m1" />);
    // Cópia aprovada em 10-frontend-ux-spec.md §2.4. `getAllByText` porque
    // "Mercado Pago" aparece legitimamente em vários pontos da tela — a
    // asserção é sobre o CONTEÚDO do bloco de tarifas, não sobre unicidade.
    const feesNotice = await screen.findByTestId('pix-fees-notice');
    expect(feesNotice).toHaveTextContent(/processados pelo Mercado Pago/i);
    expect(feesNotice).toHaveTextContent(/na conta Mercado Pago da sua loja/i);
    expect(feesNotice).toHaveTextContent(/isento/i);
    expect(feesNotice).toHaveTextContent(/0,49%/);
    expect(feesNotice).toHaveTextContent(/pode variar/i);
    expect(feesNotice).toHaveTextContent(/A Neectify não adiciona tarifa sobre esta transação/i);
  });

  it('links to the official Mercado Pago fees page and shows the reference date', async () => {
    render(<PixPaymentsSettings marketId="m1" />);
    const link = await screen.findByRole('link', { name: /tarifas oficiais/i });
    expect(link).toHaveAttribute('href', expect.stringContaining('mercadopago'));
    expect(await screen.findByTestId('pix-fees-notice')).toHaveTextContent(/atualizada em \d{2}\/\d{2}\/\d{4}/i);
  });
});
