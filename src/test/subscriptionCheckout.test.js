import { beforeEach, describe, expect, it, vi } from 'vitest';

const { ensureSubscriptionCheckout } = vi.hoisted(() => ({ ensureSubscriptionCheckout: vi.fn() }));
vi.mock('../lib/api', () => ({ ensureSubscriptionCheckout }));

import { fetchSubscriptionCheckoutUrl } from '../lib/subscriptionCheckout';

describe('fetchSubscriptionCheckoutUrl', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the url immediately when the first call already has it', async () => {
    ensureSubscriptionCheckout.mockResolvedValue({ data: { checkout_url: 'https://pay/mp/x' } });

    await expect(fetchSubscriptionCheckoutUrl('sub-local-1')).resolves.toBe('https://pay/mp/x');
    expect(ensureSubscriptionCheckout).toHaveBeenCalledTimes(1);
  });

  it('polls until the url shows up', async () => {
    ensureSubscriptionCheckout
      .mockResolvedValueOnce({ data: { checkout_url: null } })
      .mockResolvedValueOnce({ data: { checkout_url: null } })
      .mockResolvedValueOnce({ data: { checkout_url: 'https://pay/mp/y' } });

    await expect(fetchSubscriptionCheckoutUrl('sub-local-1')).resolves.toBe('https://pay/mp/y');
    expect(ensureSubscriptionCheckout).toHaveBeenCalledTimes(3);
  });

  it('returns null when the url never shows up within the attempt budget', async () => {
    ensureSubscriptionCheckout.mockResolvedValue({ data: { checkout_url: null } });

    await expect(fetchSubscriptionCheckoutUrl('sub-local-1')).resolves.toBeNull();
    expect(ensureSubscriptionCheckout).toHaveBeenCalledTimes(10);
  });
});
