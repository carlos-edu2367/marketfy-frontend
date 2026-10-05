import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Register from '../pages/auth/Register';
import { resolveCheckoutFsid } from '../lib/funnels';
import { readPlanIntent, resolvePlanIntent } from '../lib/planIntent';

const registerUser = vi.fn().mockResolvedValue({ id: 'u1' });
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ registerUser, login: vi.fn().mockResolvedValue(undefined), user: null, loading: false }),
}));
vi.mock('../lib/api', () => ({ default: { post: vi.fn().mockResolvedValue({ data: {} }), get: vi.fn() } }));
vi.mock('../lib/analytics', () => ({ track: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

async function fillAndSubmit() {
  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText('Seu nome'), 'Ana Souza');
  await user.type(screen.getByPlaceholderText('seu@email.com'), 'ana@t.com');
  await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'segredo123');
  await user.click(screen.getByRole('checkbox')); // aceite dos Termos (obrigatório no schema)
  await user.click(screen.getByRole('button', { name: /começar meu teste grátis/i }));
}

describe('funnel session through checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('sends funnel_session_id from the url on register', async () => {
    render(<MemoryRouter initialEntries={['/register?plan=p1&fsid=fs-9']}><Register /></MemoryRouter>);
    await fillAndSubmit();
    await waitFor(() => expect(registerUser).toHaveBeenCalledWith(expect.objectContaining({ funnel_session_id: 'fs-9' })));
  });

  it('falls back to the fsid stored in sessionStorage', async () => {
    sessionStorage.setItem('funnel_fsid', 'fs-7');
    render(<MemoryRouter initialEntries={['/register']}><Register /></MemoryRouter>);
    await fillAndSubmit();
    await waitFor(() => expect(registerUser).toHaveBeenCalledWith(expect.objectContaining({ funnel_session_id: 'fs-7' })));
  });

  it('omits funnel_session_id when there is none', async () => {
    render(<MemoryRouter initialEntries={['/register']}><Register /></MemoryRouter>);
    await fillAndSubmit();
    await waitFor(() => expect(registerUser).toHaveBeenCalled());
    expect(registerUser.mock.calls[0][0]).not.toHaveProperty('funnel_session_id');
  });

  it('resolves checkout fsid from url first, then storage', () => {
    sessionStorage.setItem('funnel_fsid', 'stored');
    expect(resolveCheckoutFsid('?fsid=url')).toBe('url');
    expect(resolveCheckoutFsid('')).toBe('stored');
    sessionStorage.clear();
    expect(resolveCheckoutFsid('')).toBeNull();
  });

  it('honours ?plan= from the url for logged users and stores the intent', () => {
    expect(resolvePlanIntent('?plan=p1&fsid=f1')).toEqual({ planId: 'p1', cycle: 'monthly' });
    expect(readPlanIntent()).toEqual({ planId: 'p1', cycle: 'monthly' });
    expect(resolvePlanIntent('?plan=p2&cycle=annual')).toEqual({ planId: 'p2', cycle: 'annual' });
  });

  it('falls back to the stored plan intent when the url has no plan', () => {
    localStorage.setItem('marketfy_plan_intent', JSON.stringify({ planId: 'p9', cycle: 'annual', savedAt: Date.now() }));
    expect(resolvePlanIntent('')).toEqual({ planId: 'p9', cycle: 'annual' });
    localStorage.clear();
    expect(resolvePlanIntent('')).toBeNull();
  });
});
