import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requestInvoiceCheckout } = vi.hoisted(() => ({ requestInvoiceCheckout: vi.fn() }));
vi.mock('../lib/api', () => ({ requestInvoiceCheckout }));

import { fetchInvoiceCheckoutUrl } from '../lib/invoiceCheckout';

describe('fetchInvoiceCheckoutUrl', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the link immediately when it is ready', async () => {
    requestInvoiceCheckout.mockResolvedValue({ data: { checkout_url: 'https://pay.example/1' } });

    await expect(fetchInvoiceCheckoutUrl('inv-1')).resolves.toBe('https://pay.example/1');
    expect(requestInvoiceCheckout).toHaveBeenCalledTimes(1);
  });

  it('polls the same invoice until the link appears', async () => {
    requestInvoiceCheckout
      .mockResolvedValueOnce({ data: { checkout_url: null } })
      .mockResolvedValueOnce({ data: { checkout_url: 'https://pay.example/2' } });

    await expect(fetchInvoiceCheckoutUrl('inv-2')).resolves.toBe('https://pay.example/2');
    expect(requestInvoiceCheckout).toHaveBeenNthCalledWith(2, 'inv-2');
  });

  it('gives up with null after the attempts run out', async () => {
    requestInvoiceCheckout.mockResolvedValue({ data: { checkout_url: null } });

    await expect(fetchInvoiceCheckoutUrl('inv-3')).resolves.toBeNull();
    expect(requestInvoiceCheckout).toHaveBeenCalledTimes(11);
  });
});
