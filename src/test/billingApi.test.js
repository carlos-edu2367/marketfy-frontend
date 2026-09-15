import { afterEach, describe, it, expect, vi } from 'vitest';
import * as apiModule from '../lib/api';
import { cancelSubscription, ensureSubscriptionCheckout, getSubscriptionLiveStatus } from '../lib/api';

describe('billing api helpers', () => {
  it('exports subscribe and invoice helpers', () => {
    expect(typeof apiModule.subscribePlan).toBe('function');
    expect(typeof apiModule.getInvoices).toBe('function');
    expect(typeof apiModule.getInvoice).toBe('function');
    expect(typeof apiModule.requestInvoiceCheckout).toBe('function');
    expect(typeof apiModule.retryInvoice).toBe('function');
    expect(typeof apiModule.getSubscription).toBe('function');
  });

  it('exports subscription checkout, status and cancel helpers', () => {
    expect(typeof apiModule.ensureSubscriptionCheckout).toBe('function');
    expect(typeof apiModule.getSubscriptionLiveStatus).toBe('function');
    expect(typeof apiModule.cancelSubscription).toBe('function');
  });

  describe('subscription checkout/status/cancel call the right endpoints', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('ensureSubscriptionCheckout posts to the confirmation endpoint', async () => {
      const spy = vi.spyOn(apiModule.default, 'post').mockResolvedValue({ data: {} });
      await ensureSubscriptionCheckout('sub-local-1');
      expect(spy).toHaveBeenCalledWith('/billing/subscriptions/sub-local-1/checkout');
    });

    it('getSubscriptionLiveStatus reads the live status endpoint', async () => {
      const spy = vi.spyOn(apiModule.default, 'get').mockResolvedValue({ data: {} });
      await getSubscriptionLiveStatus('sub-local-1');
      expect(spy).toHaveBeenCalledWith('/billing/subscriptions/sub-local-1/status');
    });

    it('cancelSubscription posts to the cancel endpoint', async () => {
      const spy = vi.spyOn(apiModule.default, 'post').mockResolvedValue({ data: {} });
      await cancelSubscription();
      expect(spy).toHaveBeenCalledWith('/billing/subscription/cancel');
    });
  });
});
