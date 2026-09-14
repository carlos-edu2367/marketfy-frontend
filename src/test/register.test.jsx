import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Register from '../pages/auth/Register';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';

vi.mock('../lib/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

const registerUser = vi.fn();
const login = vi.fn();

describe('Register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ registerUser, login });
    registerUser.mockResolvedValue({});
    login.mockResolvedValue({});
    api.post.mockResolvedValue({ data: {} });
  });

  it('masks the CPF while typing and sends only digits', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Register /></MemoryRouter>);

    await user.type(screen.getByPlaceholderText('Seu nome'), 'Ana Souza');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'ana@example.com');
    const cpf = screen.getByPlaceholderText('000.000.000-00');
    await user.type(cpf, '12345678901');
    expect(cpf).toHaveValue('123.456.789-01');
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'segredo123');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /começar meu teste grátis/i }));

    await waitFor(() => expect(registerUser).toHaveBeenCalledWith(expect.objectContaining({ cpf: '12345678901' })));
  });

  it('rejects a CPF with fewer than 11 digits', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Register /></MemoryRouter>);

    await user.type(screen.getByPlaceholderText('000.000.000-00'), '1234');
    await user.click(screen.getByRole('button', { name: /começar meu teste grátis/i }));

    expect(await screen.findByText(/cpf deve ter 11 números/i)).toBeInTheDocument();
    expect(registerUser).not.toHaveBeenCalled();
  });
});
