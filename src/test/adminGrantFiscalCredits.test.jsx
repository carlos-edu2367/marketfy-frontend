import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import api from '../lib/api';
import GrantFiscalCreditsModal from '../components/admin/GrantFiscalCreditsModal';

vi.mock('../lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
  getApiErrorMessage: vi.fn((err, fallback) => err?.message || fallback),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const balancePayload = {
  owner_id: 'owner-1',
  period: '202608',
  included_limit: 200,
  addon_limit: 60,
  addon_total: 250,
  used_count: 147,
  remaining: 113,
  packages: [],
};

function renderModal(props = {}) {
  return render(
    <GrantFiscalCreditsModal
      userId="owner-1"
      userName="Mercado do Carlos"
      onClose={vi.fn()}
      onGranted={vi.fn()}
      {...props}
    />
  );
}

describe('GrantFiscalCreditsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: balancePayload });
    api.post.mockResolvedValue({
      data: { package_id: 'pkg-1', granted: 500, created: true },
    });
  });

  it('mostra o saldo atual do usuario antes de conceder', async () => {
    renderModal();
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/admin/fiscal/credits/owner-1')
    );
    expect(await screen.findByText(/113 restantes/i)).toBeInTheDocument();
    expect(screen.getByText(/200 inclusos/i)).toBeInTheDocument();
    expect(screen.getByText(/60 extras/i)).toBeInTheDocument();
  });

  it('envia quantidade, categoria, nota e validade', async () => {
    const user = userEvent.setup();
    renderModal();
    await screen.findByText(/113 restantes/i);

    await user.clear(screen.getByLabelText(/quantidade/i));
    await user.type(screen.getByLabelText(/quantidade/i), '500');
    await user.selectOptions(screen.getByLabelText(/categoria/i), 'compensation');
    await user.type(screen.getByLabelText(/nota interna/i), 'incidente 08/08');
    await user.clear(screen.getByLabelText(/validade/i));
    await user.type(screen.getByLabelText(/validade/i), '30');
    await user.click(screen.getByRole('button', { name: /conceder/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    const [url, body] = api.post.mock.calls[0];
    expect(url).toBe('/admin/fiscal/credits/grant');
    expect(body).toMatchObject({
      owner_id: 'owner-1',
      amount: 500,
      reason_code: 'compensation',
      note: 'incidente 08/08',
      valid_days: 30,
    });
    expect(body.idempotency_key.length).toBeGreaterThanOrEqual(8);
  });

  it('usa a validade padrao de 365 dias', async () => {
    const user = userEvent.setup();
    renderModal();
    await screen.findByText(/113 restantes/i);

    await user.clear(screen.getByLabelText(/quantidade/i));
    await user.type(screen.getByLabelText(/quantidade/i), '100');
    await user.click(screen.getByRole('button', { name: /conceder/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(api.post.mock.calls[0][1].valid_days).toBe(365);
  });

  it('reusa a mesma idempotency_key entre tentativas do mesmo ciclo', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValueOnce(new Error('boom'));
    renderModal();
    await screen.findByText(/113 restantes/i);

    await user.clear(screen.getByLabelText(/quantidade/i));
    await user.type(screen.getByLabelText(/quantidade/i), '100');
    await user.click(screen.getByRole('button', { name: /conceder/i }));
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: /conceder/i }));
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(2));

    expect(api.post.mock.calls[0][1].idempotency_key).toBe(
      api.post.mock.calls[1][1].idempotency_key
    );
  });

  it('avisa que a nota interna nao e visivel ao cliente', async () => {
    renderModal();
    await screen.findByText(/113 restantes/i);
    expect(screen.getByText(/não visível ao cliente/i)).toBeInTheDocument();
  });

  it('nao envia quando a quantidade e invalida', async () => {
    const user = userEvent.setup();
    renderModal();
    await screen.findByText(/113 restantes/i);

    await user.clear(screen.getByLabelText(/quantidade/i));
    await user.type(screen.getByLabelText(/quantidade/i), '0');
    await user.click(screen.getByRole('button', { name: /conceder/i }));

    expect(api.post).not.toHaveBeenCalled();
    expect(screen.getByText(/entre 1 e 50.000/i)).toBeInTheDocument();
  });
});
