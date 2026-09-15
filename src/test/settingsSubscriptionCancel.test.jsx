import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get, cancelSubscription } = vi.hoisted(() => ({ get: vi.fn(), cancelSubscription: vi.fn() }));

vi.mock('../lib/api', () => ({ default: { get }, cancelSubscription }));
vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../components/settings/FiscalSettings', () => ({ default: () => <div /> }));
vi.mock('../pages/dashboard/BillingInvoices', () => ({ default: () => <div /> }));

import { useAuth } from '../hooks/useAuth';
import Settings from '../pages/dashboard/Settings';

const refreshSubscription = vi.fn();
const logout = vi.fn();

function mockAuth(subscription) {
  useAuth.mockReturnValue({
    user: { name: 'Operador', email: 'op@t.com', plan_expiration: '2026-12-01T00:00:00Z' },
    subscription,
    logout,
    refreshSubscription,
  });
}

function renderSettings() {
  return render(<MemoryRouter><Settings /></MemoryRouter>);
}

describe('Settings — cancelar assinatura', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({ data: [] });
    refreshSubscription.mockResolvedValue(undefined);
  });

  it('shows the cancel button for an active subscription and confirms before calling the API', async () => {
    mockAuth({ status: 'active', billing_mode: 'recurring', expires_at: '2026-12-01T00:00:00Z', cancel_at_period_end: false });
    cancelSubscription.mockResolvedValue({ data: { status: 'canceled_at_period_end', expires_at: '2026-12-01T00:00:00Z' } });
    const user = userEvent.setup();
    renderSettings();

    await user.click(await screen.findByRole('button', { name: /cancelar assinatura/i }));
    await user.click(await screen.findByRole('button', { name: /confirmar cancelamento/i }));

    await waitFor(() => expect(cancelSubscription).toHaveBeenCalledTimes(1));
    expect(refreshSubscription).toHaveBeenCalled();
  });

  it('lets the user back out of the confirmation without calling the API', async () => {
    mockAuth({ status: 'active', billing_mode: 'recurring', expires_at: '2026-12-01T00:00:00Z', cancel_at_period_end: false });
    const user = userEvent.setup();
    renderSettings();

    await user.click(await screen.findByRole('button', { name: /cancelar assinatura/i }));
    await user.click(await screen.findByRole('button', { name: /voltar/i }));

    expect(screen.queryByRole('button', { name: /confirmar cancelamento/i })).not.toBeInTheDocument();
    expect(cancelSubscription).not.toHaveBeenCalled();
  });

  it('hides the cancel button and shows the access window once cancel_at_period_end is already true', async () => {
    mockAuth({ status: 'active', billing_mode: 'recurring', expires_at: '2026-12-01T00:00:00Z', cancel_at_period_end: true });
    renderSettings();

    expect(await screen.findByText(/ativa até/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancelar assinatura/i })).not.toBeInTheDocument();
  });

  it('does not show the cancel control for a subscription that is not operational', async () => {
    mockAuth({ status: 'expired', billing_mode: 'invoice', expires_at: '2026-01-01T00:00:00Z', cancel_at_period_end: false });
    renderSettings();

    await screen.findByText(/dados do usuário/i);
    expect(screen.queryByRole('button', { name: /cancelar assinatura/i })).not.toBeInTheDocument();
  });
});
