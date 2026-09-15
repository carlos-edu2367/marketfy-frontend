import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from '../pages/dashboard/Dashboard';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useProductSync } from '../hooks/useProductSync';

vi.mock('../lib/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../hooks/useProductSync', () => ({ useProductSync: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

describe('Dashboard — criar loja', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { name: 'Ana' } });
    useProductSync.mockReturnValue({ syncAllProducts: vi.fn(), syncing: false });
    api.get.mockResolvedValue({ data: [] });
    api.post.mockResolvedValue({ data: {} });
  });

  async function openCreateModal(user) {
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/identity/markets'));
    await user.click(screen.getByRole('button', { name: /nova loja/i }));
  }

  it('applies the CPF mask while typing 11 digits', async () => {
    const user = userEvent.setup();
    await openCreateModal(user);

    const documentField = screen.getByPlaceholderText('00.000.000/0001-00');
    await user.type(documentField, '12345678901');
    expect(documentField).toHaveValue('123.456.789-01');
  });

  it('applies the CNPJ mask once typing passes 11 digits', async () => {
    const user = userEvent.setup();
    await openCreateModal(user);

    const documentField = screen.getByPlaceholderText('00.000.000/0001-00');
    await user.type(documentField, '12345678000195');
    expect(documentField).toHaveValue('12.345.678/0001-95');
  });

  it('submits only digits for the typed document', async () => {
    const user = userEvent.setup();
    await openCreateModal(user);

    await user.type(screen.getByPlaceholderText('Ex: Mercadinho Central'), 'Loja Ana');
    await user.type(screen.getByPlaceholderText('00.000.000/0001-00'), '12345678901');
    await user.type(screen.getByPlaceholderText('Rua, Número, Bairro'), 'Rua X, 10');
    await user.click(screen.getByRole('button', { name: /^criar loja$/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/identity/markets', expect.objectContaining({
      document: '12345678901',
    })));
  });

  it('shows a validation error for a document with the wrong length', async () => {
    const user = userEvent.setup();
    await openCreateModal(user);

    await user.type(screen.getByPlaceholderText('00.000.000/0001-00'), '123');
    await user.click(screen.getByRole('button', { name: /^criar loja$/i }));

    expect(await screen.findByText(/cpf ou cnpj inválido/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });
});
