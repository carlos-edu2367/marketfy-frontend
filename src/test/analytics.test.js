import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const posthogMock = { init: vi.fn(), capture: vi.fn(), identify: vi.fn() };
vi.mock('posthog-js', () => ({ default: posthogMock }));

describe('lib/analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test123');
    vi.stubEnv('VITE_POSTHOG_HOST', 'https://us.i.posthog.com');
  });

  afterEach(() => vi.unstubAllEnvs());

  it('does nothing before initAnalytics is called', async () => {
    const { track, identifyUser } = await import('../lib/analytics');
    track('landing_viewed');
    identifyUser({ id: 'u1' });
    expect(posthogMock.capture).not.toHaveBeenCalled();
    expect(posthogMock.identify).not.toHaveBeenCalled();
  });

  it('initializes posthog-js with the configured key and host', async () => {
    const { initAnalytics } = await import('../lib/analytics');
    initAnalytics();
    expect(posthogMock.init).toHaveBeenCalledWith(
      'phc_test123',
      expect.objectContaining({ api_host: 'https://us.i.posthog.com' })
    );
  });

  it('does not initialize when there is no configured key', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', '');
    const { initAnalytics } = await import('../lib/analytics');
    initAnalytics();
    expect(posthogMock.init).not.toHaveBeenCalled();
  });

  it('does not initialize twice', async () => {
    const { initAnalytics } = await import('../lib/analytics');
    initAnalytics();
    initAnalytics();
    expect(posthogMock.init).toHaveBeenCalledTimes(1);
  });

  it('tracks events once initialized', async () => {
    const { initAnalytics, track } = await import('../lib/analytics');
    initAnalytics();
    track('landing_viewed', { foo: 'bar' });
    expect(posthogMock.capture).toHaveBeenCalledWith('landing_viewed', { foo: 'bar' });
  });

  it('identifies the user once initialized', async () => {
    const { initAnalytics, identifyUser } = await import('../lib/analytics');
    initAnalytics();
    identifyUser({ id: 'u1', email: 'ana@t.com', plan_name: 'PRO' });
    expect(posthogMock.identify).toHaveBeenCalledWith('u1', { email: 'ana@t.com', plan_name: 'PRO' });
  });

  it('identifyUser is a no-op without a user', async () => {
    const { initAnalytics, identifyUser } = await import('../lib/analytics');
    initAnalytics();
    identifyUser(null);
    expect(posthogMock.identify).not.toHaveBeenCalled();
  });
});
