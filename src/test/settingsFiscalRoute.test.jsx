import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('../lib/api', () => ({ default: { get } }));
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { name: 'Operador' }, logout: vi.fn(), refreshSubscription: vi.fn() }),
}));
vi.mock('../components/settings/FiscalSettings', () => ({
  default: ({ marketId }) => <div data-testid="fiscal-market">Fiscal: {marketId}</div>,
}));

import Settings from '../pages/dashboard/Settings';

function renderSettings(entry) {
  return render(<MemoryRouter initialEntries={[entry]}><Settings /><RouteChange /></MemoryRouter>);
}

function RouteChange() {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/dashboard/settings?tab=unsafe&marketId=not-a-market')}>Navegar inválido</button>;
}

describe('Settings fiscal route state', () => {
  beforeEach(() => {
    get.mockResolvedValue({ data: [{ id: 'market-a', name: 'Mercado A' }, { id: 'market-b', name: 'Mercado B' }] });
  });

  it('opens the fiscal tab for the requested market only after authorized markets load', async () => {
    renderSettings('/dashboard/settings?tab=fiscal&marketId=market-b');

    await waitFor(() => expect(screen.getByTestId('fiscal-market')).toHaveTextContent('market-b'));
    expect(screen.getByRole('button', { name: /fiscal \(nfc-e\)/i })).toHaveClass('bg-white');
  });

  it('falls back safely when the route requests an unavailable market or tab', async () => {
    renderSettings('/dashboard/settings?tab=unsafe&marketId=not-a-market');

    await waitFor(() => expect(get).toHaveBeenCalledWith('/identity/markets'));
    expect(screen.queryByTestId('fiscal-market')).not.toBeInTheDocument();
    expect(screen.getByText(/dados do usuário/i)).toBeInTheDocument();
  });

  it('keeps the fiscal destination scoped to an accessible market when its id is invalid', async () => {
    renderSettings('/dashboard/settings?tab=fiscal&marketId=not-a-market');

    await waitFor(() => expect(screen.getByTestId('fiscal-market')).toHaveTextContent('market-a'));
  });

  it('returns to the profile when a mounted fiscal screen navigates to an invalid tab', async () => {
    const user = userEvent.setup();
    renderSettings('/dashboard/settings?tab=fiscal&marketId=market-b');

    await waitFor(() => expect(screen.getByTestId('fiscal-market')).toHaveTextContent('market-b'));
    await user.click(screen.getByRole('button', { name: 'Navegar inválido' }));

    await waitFor(() => expect(screen.queryByTestId('fiscal-market')).not.toBeInTheDocument());
    expect(screen.getByText(/dados do usuário/i)).toBeInTheDocument();
  });

  it('ignores a stale market response after navigation changes the requested tab', async () => {
    const user = userEvent.setup();
    let resolveFirstRequest;
    get.mockReset();
    get
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirstRequest = resolve; }))
      .mockResolvedValueOnce({ data: [{ id: 'market-a', name: 'Mercado A' }] });

    renderSettings('/dashboard/settings?tab=fiscal&marketId=market-a');
    await user.click(screen.getByRole('button', { name: 'Navegar inválido' }));
    await waitFor(() => expect(screen.getByText(/dados do usuário/i)).toBeInTheDocument());

    await act(async () => {
      resolveFirstRequest({ data: [{ id: 'market-a', name: 'Mercado A' }] });
      await Promise.resolve();
    });
    expect(screen.queryByTestId('fiscal-market')).not.toBeInTheDocument();
    expect(screen.getByText(/dados do usuário/i)).toBeInTheDocument();
  });
});
