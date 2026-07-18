import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import api from '../lib/api';
import { db } from '../lib/db';
import Customers from '../pages/dashboard/Customers';
import toast from 'react-hot-toast';

vi.mock('../lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('../lib/db', () => ({
  db: {
    customers: {
      update: vi.fn(),
    },
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const customer = {
  id: 'customer-1',
  name: 'Ana Souza',
  cpf: '123.456.789-00',
  phone: '11999999999',
  credit_limit: 100,
  current_debt: 50,
};

function renderCustomers() {
  return render(
    <MemoryRouter>
      <Customers />
    </MemoryRouter>
  );
}

describe('Customers credit limit editing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/identity/markets') {
        return Promise.resolve({ data: [{ id: 'market-1', name: 'Loja Centro' }] });
      }
      if (url === '/finance/market-1/customers') {
        return Promise.resolve({ data: [customer] });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
  });

  it('patches the credit limit, refreshes customers, and updates the local cache', async () => {
    const user = userEvent.setup();
    api.patch.mockResolvedValue({
      data: { id: customer.id, credit_limit: 80 },
    });

    renderCustomers();

    await user.click(await screen.findByRole(
      'button',
      { name: 'Editar limite de Ana Souza' },
      { timeout: 3000 }
    ));
    const creditLimit = screen.getByRole('spinbutton');
    await user.clear(creditLimit);
    await user.type(creditLimit, '80');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/finance/market-1/customers/customer-1',
        { credit_limit: 80 }
      );
    });
    expect(db.customers.update).toHaveBeenCalledWith('customer-1', { credit_limit: 80 });
    expect(toast.success).toHaveBeenCalledWith('Limite de crédito atualizado com sucesso!');
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(3);
    });
    expect(screen.queryByRole('dialog', { name: 'Editar limite de crédito' })).not.toBeInTheDocument();
  });

  it('warns when the limit is below the debt and caps available credit at zero', async () => {
    const user = userEvent.setup();
    const overLimitCustomer = { ...customer, current_debt: 125 };
    api.get.mockImplementation((url) => {
      if (url === '/identity/markets') {
        return Promise.resolve({ data: [{ id: 'market-1', name: 'Loja Centro' }] });
      }
      if (url === '/finance/market-1/customers') {
        return Promise.resolve({ data: [overLimitCustomer] });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    renderCustomers();

    await user.click(await screen.findByRole(
      'button',
      { name: 'Editar limite de Ana Souza' },
      { timeout: 3000 }
    ));

    expect(screen.getByText(/Novas vendas fiadas ficarão bloqueadas até a dívida ficar abaixo do limite\./i)).toBeInTheDocument();
    expect(screen.getByText(/Disp:/)).toHaveTextContent(/Disp:\s*R\$\s*0,00/);
  });

  it('gives the credit-limit field a programmatic name', async () => {
    const user = userEvent.setup();
    renderCustomers();

    await user.click(await screen.findByRole(
      'button',
      { name: 'Editar limite de Ana Souza' },
      { timeout: 3000 }
    ));

    expect(screen.getByRole('spinbutton', { name: 'Limite de crédito (R$)' })).toBeInTheDocument();
  });

  it('focuses the limit field and keeps Tab navigation inside the edit modal', async () => {
    const user = userEvent.setup();
    renderCustomers();

    await user.click(await screen.findByRole(
      'button',
      { name: 'Editar limite de Ana Souza' },
      { timeout: 3000 }
    ));
    const creditLimit = screen.getByRole('spinbutton');
    const close = screen.getByRole('button', { name: 'Fechar edição de limite' });

    expect(creditLimit).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveFocus();
  });

  it('closes with Escape and restores focus to the triggering action', async () => {
    const user = userEvent.setup();
    renderCustomers();

    const trigger = await screen.findByRole(
      'button',
      { name: 'Editar limite de Ana Souza' },
      { timeout: 3000 }
    );
    await user.click(trigger);
    await screen.findByRole('dialog', { name: 'Editar limite de crédito' });
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'Editar limite de crédito' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
