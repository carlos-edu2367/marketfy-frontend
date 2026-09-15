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
vi.mock('../lib/analytics', () => ({ track: vi.fn() }));

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

  it('does not render a CPF field', () => {
    render(<MemoryRouter><Register /></MemoryRouter>);
    expect(screen.queryByPlaceholderText('000.000.000-00')).not.toBeInTheDocument();
    expect(screen.queryByText(/cpf/i)).not.toBeInTheDocument();
  });

  it('submits name, email and password without cpf', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Register /></MemoryRouter>);

    await user.type(screen.getByPlaceholderText('Seu nome'), 'Ana Souza');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'ana@example.com');
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'segredo123');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /começar meu teste grátis/i }));

    await waitFor(() => expect(registerUser).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Ana Souza', email: 'ana@example.com' })
    ));
    const [payload] = registerUser.mock.calls[0];
    expect(payload).not.toHaveProperty('cpf');
  });

  it('rejects a name shorter than 3 characters', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Register /></MemoryRouter>);

    await user.type(screen.getByPlaceholderText('Seu nome'), 'An');
    await user.click(screen.getByRole('button', { name: /começar meu teste grátis/i }));

    expect(await screen.findByText(/nome muito curto/i)).toBeInTheDocument();
    expect(registerUser).not.toHaveBeenCalled();
  });

  it('tracks register_submitted with the plan intent flag after a successful signup', async () => {
    const { track } = await import('../lib/analytics');
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/register?plan=plan-1']}>
        <Register />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText('Seu nome'), 'Ana Souza');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'ana@example.com');
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'segredo123');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /começar meu teste grátis/i }));

    await waitFor(() => expect(track).toHaveBeenCalledWith('register_submitted', { has_plan_intent: true }));
  });

  it('tracks trial_activated after the trial endpoint succeeds', async () => {
    const { track } = await import('../lib/analytics');
    const user = userEvent.setup();
    render(<MemoryRouter><Register /></MemoryRouter>);

    await user.type(screen.getByPlaceholderText('Seu nome'), 'Ana Souza');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'ana@example.com');
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'segredo123');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /começar meu teste grátis/i }));

    await waitFor(() => expect(track).toHaveBeenCalledWith('trial_activated'));
  });
});
