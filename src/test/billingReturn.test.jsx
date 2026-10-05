import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import api from '../lib/api';
import BillingReturn from '../pages/BillingReturn';

vi.mock('../lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/billing/retorno" element={<BillingReturn />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('BillingReturn', () => {
  beforeEach(() => vi.clearAllMocks());

  it('polls subscription live status and shows confirmed access', async () => {
    api.get.mockResolvedValue({ data: { status: 'active', provisional: true } });

    renderAt('/billing/retorno?tipo=subscription&ref=sub-local-1');

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/billing/subscriptions/sub-local-1/status'));
    expect(await screen.findByText(/acesso liberado/i)).toBeInTheDocument();
  });

  it('shows a waiting state while the subscription is still pending', async () => {
    api.get.mockResolvedValue({ data: { status: 'pending', provisional: false } });

    renderAt('/billing/retorno?tipo=subscription&ref=sub-local-1');

    expect(await screen.findByText(/aguardando confirma/i)).toBeInTheDocument();
  });

  it('shows generic processing state for invoice/credits without ref', async () => {
    renderAt('/billing/retorno?tipo=invoice');

    expect(await screen.findByText(/seu pagamento est.* sendo processado/i)).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });
});
