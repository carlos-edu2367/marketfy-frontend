import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const trackMock = vi.fn();
const createFunnelEventMock = vi.fn().mockResolvedValue({});
const posthogMock = { get_distinct_id: vi.fn() };

vi.mock('posthog-js', () => ({ default: posthogMock }));
vi.mock('../lib/analytics', () => ({ track: trackMock }));
vi.mock('../lib/marketingFunnelApi', () => ({ createFunnelEvent: createFunnelEventMock }));

describe('lib/funnelTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    localStorage.clear();
    posthogMock.get_distinct_id.mockReturnValue(undefined);
  });

  afterEach(() => localStorage.clear());

  it('does nothing without cookie consent', async () => {
    const { trackFunnelEvent } = await import('../lib/funnelTracking');
    trackFunnelEvent('marketfy_funnel_start', { funnelVariant: 'A' });
    expect(trackMock).not.toHaveBeenCalled();
    expect(createFunnelEventMock).not.toHaveBeenCalled();
  });

  it('tracks on posthog and on the backend once consent is accepted', async () => {
    localStorage.setItem('marketfy_cookie_consent', 'accepted');
    const { trackFunnelEvent } = await import('../lib/funnelTracking');

    trackFunnelEvent('marketfy_funnel_step_view', { funnelVariant: 'A', step: 'q1' });

    expect(trackMock).toHaveBeenCalledWith('marketfy_funnel_step_view', {
      funnel_variant: 'A',
      step: 'q1',
    });
    expect(createFunnelEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        funnel_variant: 'A',
        event_name: 'marketfy_funnel_step_view',
        step: 'q1',
      })
    );
  });

  it('reuses the same visitor id across calls', async () => {
    const { getFunnelVisitorId } = await import('../lib/funnelTracking');
    const first = getFunnelVisitorId();
    const second = getFunnelVisitorId();
    expect(first).toBe(second);
    expect(first.length).toBeGreaterThan(8);
  });

  it('prefers the posthog distinct id when available', async () => {
    posthogMock.get_distinct_id.mockReturnValue('ph-distinct-1');
    const { getFunnelVisitorId } = await import('../lib/funnelTracking');
    expect(getFunnelVisitorId()).toBe('ph-distinct-1');
  });
});
