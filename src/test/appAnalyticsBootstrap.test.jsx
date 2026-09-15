import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { initAnalytics } from '../lib/analytics';

vi.mock('../lib/api', () => ({
  default: { get: vi.fn(() => Promise.reject({ response: { status: 401 } })), post: vi.fn(() => Promise.reject()) },
  setAccessToken: vi.fn(),
  clearAccessToken: vi.fn(),
  getAccessToken: vi.fn(),
}));
vi.mock('../lib/analytics', () => ({ initAnalytics: vi.fn(), track: vi.fn(), identifyUser: vi.fn() }));

describe('App — bootstrap do consentimento de cookies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('initializes analytics on load when consent was already accepted', () => {
    localStorage.setItem('marketfy_cookie_consent', 'accepted');
    render(<App />);
    expect(initAnalytics).toHaveBeenCalled();
  });

  it('does not initialize analytics when consent was declined', () => {
    localStorage.setItem('marketfy_cookie_consent', 'declined');
    render(<App />);
    expect(initAnalytics).not.toHaveBeenCalled();
  });

  it('does not initialize analytics without any stored choice', () => {
    render(<App />);
    expect(initAnalytics).not.toHaveBeenCalled();
  });
});
