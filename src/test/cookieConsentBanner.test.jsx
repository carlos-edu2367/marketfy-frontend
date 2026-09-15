import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CookieConsentBanner from '../components/CookieConsentBanner';
import { initAnalytics } from '../lib/analytics';

vi.mock('../lib/analytics', () => ({ initAnalytics: vi.fn() }));

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('shows the banner when there is no stored choice yet', () => {
    render(<CookieConsentBanner />);
    expect(screen.getByRole('region', { name: /cookies/i })).toBeInTheDocument();
  });

  it('does not render once a choice was already stored', () => {
    localStorage.setItem('marketfy_cookie_consent', 'accepted');
    render(<CookieConsentBanner />);
    expect(screen.queryByRole('region', { name: /cookies/i })).not.toBeInTheDocument();
  });

  it('accepting stores the choice and initializes analytics', async () => {
    const user = userEvent.setup();
    render(<CookieConsentBanner />);
    await user.click(screen.getByRole('button', { name: /aceitar/i }));
    expect(localStorage.getItem('marketfy_cookie_consent')).toBe('accepted');
    expect(initAnalytics).toHaveBeenCalledTimes(1);
  });

  it('declining stores the choice without initializing analytics', async () => {
    const user = userEvent.setup();
    render(<CookieConsentBanner />);
    await user.click(screen.getByRole('button', { name: /recusar/i }));
    expect(localStorage.getItem('marketfy_cookie_consent')).toBe('declined');
    expect(initAnalytics).not.toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: /cookies/i })).not.toBeInTheDocument();
  });
});
