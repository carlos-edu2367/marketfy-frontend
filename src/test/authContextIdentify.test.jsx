import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api';
import { identifyUser } from '../lib/analytics';

vi.mock('../lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
  setAccessToken: vi.fn(),
  clearAccessToken: vi.fn(),
  getAccessToken: vi.fn(),
}));
vi.mock('../lib/analytics', () => ({ identifyUser: vi.fn(), track: vi.fn(), initAnalytics: vi.fn() }));
vi.mock('../lib/db', () => ({ db: { sales_queue: { clear: vi.fn() } } }));

function Probe() {
  const { user, loading } = useAuth();
  if (loading) return <span>carregando</span>;
  return <span>{user ? `logado: ${user.name}` : 'sem sessão'}</span>;
}

describe('AuthContext — identify no PostHog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('identifies the user after a successful session refresh on load', async () => {
    api.post.mockResolvedValue({ data: { access_token: 'tok' } });
    api.get.mockResolvedValue({ data: { id: 'u1', name: 'Ana', email: 'ana@t.com', plan_name: 'PRO' } });

    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(screen.getByText(/logado: ana/i)).toBeInTheDocument());
    expect(identifyUser).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'u1', email: 'ana@t.com', plan_name: 'PRO' })
    );
  });

  it('does not identify when there is no valid session', async () => {
    api.post.mockRejectedValue(new Error('no session'));

    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(screen.getByText(/sem sessão/i)).toBeInTheDocument());
    expect(identifyUser).not.toHaveBeenCalled();
  });
});
