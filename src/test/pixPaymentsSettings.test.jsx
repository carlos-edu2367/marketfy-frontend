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

  it('shows fees notice mentioning Mercado Pago and Neectify', async () => {
    render(<PixPaymentsSettings marketId="m1" />);
    await waitFor(() => expect(screen.getByText(/Neectify não adiciona tarifa/i)).toBeInTheDocument());
    expect(screen.getByText(/Mercado Pago/i)).toBeInTheDocument();
  });
});
