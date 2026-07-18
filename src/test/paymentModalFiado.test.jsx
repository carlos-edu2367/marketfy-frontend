import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PaymentModal from '../components/pdv/PaymentModal';
import { db } from '../lib/db';
import toast from 'react-hot-toast';

vi.mock('../lib/db', () => ({
  db: {
    customers: {
      where: vi.fn(),
    },
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
  },
}));

const overLimitCustomer = {
  id: 'customer-over-limit',
  market_id: 'market-1',
  name: 'Bruno Lima',
  cpf: '987.654.321-00',
  credit_limit: 100,
  current_debt: 125,
};

function mockLocalCustomers(records = [overLimitCustomer]) {
  const toArray = vi.fn().mockResolvedValue(records);
  const equals = vi.fn().mockReturnValue({ toArray });
  db.customers.where.mockReturnValue({ equals });
}

function renderPaymentModal() {
  return render(
    <PaymentModal
      total={50}
      marketId="market-1"
      onConfirm={vi.fn()}
      onCancel={vi.fn()}
    />
  );
}

describe('PaymentModal fiado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalCustomers();
  });

  it('opens the customer selector immediately when Fiado is chosen and reopens it after closing', async () => {
    const user = userEvent.setup();
    renderPaymentModal();

    await user.click(screen.getByRole('button', { name: 'Fiado (Crédito)' }));

    expect(await screen.findByRole('dialog', { name: 'Selecionar cliente' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Fechar' }));

    expect(screen.queryByRole('dialog', { name: 'Selecionar cliente' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Selecionar cliente' }));
    expect(await screen.findByRole('dialog', { name: 'Selecionar cliente' })).toBeInTheDocument();
  });

  it('shows zero available credit and blocks fiado payment when debt exceeds the limit', async () => {
    const user = userEvent.setup();
    renderPaymentModal();

    await user.click(screen.getByRole('button', { name: 'Fiado (Crédito)' }));
    await user.click(await screen.findByRole('button', { name: 'Selecionar Bruno Lima' }));

    expect(screen.queryByRole('dialog', { name: 'Selecionar cliente' })).not.toBeInTheDocument();
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument();
    expect(screen.getAllByText((content) => content.includes('R$') && content.includes('0,00'))).not.toHaveLength(0);

    await user.click(screen.getByRole('button', { name: /Adicionar Pagamento/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Limite insuficiente! Disponível: R$ 0,00');
    });
  });
});
