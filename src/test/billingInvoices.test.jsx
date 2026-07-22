import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getInvoices, getInvoice, requestInvoiceCheckout, retryInvoice } = vi.hoisted(() => ({
  getInvoices: vi.fn(),
  getInvoice: vi.fn(),
  requestInvoiceCheckout: vi.fn(),
  retryInvoice: vi.fn(),
}));

vi.mock('../lib/api', () => ({ getInvoices, getInvoice, requestInvoiceCheckout, retryInvoice }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

import BillingInvoices from '../pages/dashboard/BillingInvoices';

describe('BillingInvoices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getInvoices.mockResolvedValue({
      data: {
        items: [{
          invoice_id: 'invoice-1', amount: '50.00', status: 'pending',
          due_date: '2026-07-22T00:00:00Z', checkout_url: null,
        }],
      },
    });
  });

  it('creates a checkout only when the user clicks pay', async () => {
    const user = userEvent.setup();
    requestInvoiceCheckout.mockResolvedValue({ data: { checkout_url: 'https://pay.example/checkout' } });

    render(<BillingInvoices />);
    await screen.findByRole('button', { name: /pagar/i });
    expect(requestInvoiceCheckout).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /pagar/i }));

    await waitFor(() => expect(requestInvoiceCheckout).toHaveBeenCalledWith('invoice-1'));
    expect(getInvoice).not.toHaveBeenCalled();
  });

  it('replaces a canceled invoice without creating checkout', async () => {
    const user = userEvent.setup();
    getInvoices.mockResolvedValue({
      data: {
        items: [{
          invoice_id: 'invoice-canceled', amount: '50.00', status: 'canceled',
          due_date: null, checkout_url: null,
        }],
      },
    });
    retryInvoice.mockResolvedValue({ data: { invoice_id: 'invoice-replacement', checkout_url: null } });

    render(<BillingInvoices />);
    await user.click(await screen.findByRole('button', { name: /tentar novamente/i }));

    await waitFor(() => expect(retryInvoice).toHaveBeenCalledWith('invoice-canceled'));
    expect(requestInvoiceCheckout).not.toHaveBeenCalled();
  });
});
