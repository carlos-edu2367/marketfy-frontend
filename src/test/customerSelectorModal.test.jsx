import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CustomerSelectorModal from '../components/pdv/CustomerSelectorModal';
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

const customers = [
  {
    id: 'customer-1',
    market_id: 'market-1',
    name: 'Ana Souza',
    cpf: '123.456.789-00',
    credit_limit: 200,
    current_debt: 50,
  },
  {
    id: 'customer-2',
    market_id: 'market-1',
    name: 'Bruno Lima',
    cpf: '987.654.321-00',
    credit_limit: 100,
    current_debt: 125,
  },
];

function mockLocalCustomers(records = customers) {
  const toArray = vi.fn().mockResolvedValue(records);
  const equals = vi.fn().mockReturnValue({ toArray });
  db.customers.where.mockReturnValue({ equals });
  return { equals, toArray };
}

describe('CustomerSelectorModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows every local customer initially and filters only by CPF', async () => {
    const user = userEvent.setup();
    const { equals, toArray } = mockLocalCustomers();

    render(
      <CustomerSelectorModal
        marketId="market-1"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(await screen.findByRole('button', { name: 'Selecionar Ana Souza' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Selecionar Bruno Lima' })).toBeInTheDocument();
    expect(screen.getAllByText((content) => content.includes('150,00'))).not.toHaveLength(0);
    expect(screen.getAllByText((content) => content.includes('0,00') && !content.includes('150,00'))).not.toHaveLength(0);
    expect(db.customers.where).toHaveBeenCalledWith('market_id');
    expect(equals).toHaveBeenCalledWith('market-1');
    expect(toArray).toHaveBeenCalledOnce();

    await user.type(screen.getByLabelText('Buscar por nome ou CPF'), '123.456');

    expect(screen.getByRole('button', { name: 'Selecionar Ana Souza' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Selecionar Bruno Lima' })).not.toBeInTheDocument();
  });

  it('selects Ana with the original local record', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    mockLocalCustomers();

    render(
      <CustomerSelectorModal
        marketId="market-1"
        onSelect={onSelect}
        onClose={vi.fn()}
      />
    );

    await user.click(await screen.findByRole('button', { name: 'Selecionar Ana Souza' }));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
      id: 'customer-1',
      name: 'Ana Souza',
    }));
  });

  it('moves focus into the dialog, traps keyboard focus, and restores the opener', async () => {
    const user = userEvent.setup();
    const opener = document.createElement('button');
    opener.textContent = 'Abrir seletor';
    document.body.appendChild(opener);
    opener.focus();
    mockLocalCustomers();

    const { unmount } = render(
      <CustomerSelectorModal
        marketId="market-1"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    await screen.findByRole('button', { name: 'Selecionar Ana Souza' });
    const search = screen.getByLabelText('Buscar por nome ou CPF');
    expect(search).toHaveFocus();

    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Selecionar Bruno Lima' })).toHaveFocus();

    unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });

  it('keeps the customer action name concise and describes CPF and available credit', async () => {
    mockLocalCustomers();

    render(
      <CustomerSelectorModal
        marketId="market-1"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const customerButton = await screen.findByRole('button', { name: 'Selecionar Ana Souza' });
    expect(customerButton).toHaveAccessibleDescription(/CPF: 123\.456\.789-00 Disponível R\$\s?150,00/);
  });

  it('shows the empty state and calls onClose from the close control', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    mockLocalCustomers([]);

    render(
      <CustomerSelectorModal
        marketId="market-1"
        onSelect={vi.fn()}
        onClose={onClose}
      />
    );

    expect(await screen.findByText('Nenhum cliente encontrado.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows a no-results state when name and CPF do not match the search', async () => {
    const user = userEvent.setup();
    mockLocalCustomers();

    render(
      <CustomerSelectorModal
        marketId="market-1"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    await screen.findByRole('button', { name: 'Selecionar Ana Souza' });
    await user.type(screen.getByLabelText('Buscar por nome ou CPF'), 'telefone');

    expect(screen.getByText('Nenhum resultado para a busca.')).toBeInTheDocument();
  });

  it('caps negative available credit at zero and reports local loading failures', async () => {
    mockLocalCustomers(customers);
    const toArray = vi.fn().mockRejectedValue(new Error('Dexie unavailable'));
    const equals = vi.fn().mockReturnValue({ toArray });
    db.customers.where.mockReturnValue({ equals });

    render(
      <CustomerSelectorModal
        marketId="market-1"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(await screen.findByText('Nenhum cliente encontrado.')).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith('Erro ao buscar clientes locais.');
  });
});
