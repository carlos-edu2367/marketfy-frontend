import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Financial from '../pages/dashboard/Financial';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api';

vi.mock('../lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('Financial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { plan_name: 'Pro' } });
  });

  it('shows an access-denied message when the Financial API returns 403', async () => {
    api.get.mockRejectedValueOnce({ response: { status: 403 } });

    render(
      <MemoryRouter>
        <Financial />
      </MemoryRouter>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Você não tem acesso ao Financeiro desta loja.'
    );
    expect(screen.queryByText(/consolidando dados financeiros/i)).not.toBeInTheDocument();
  });
});
