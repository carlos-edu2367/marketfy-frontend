import { describe, it, expect } from 'vitest';
import * as apiModule from '../lib/api';

describe('billing api helpers', () => {
  it('exports subscribe and invoice helpers', () => {
    expect(typeof apiModule.subscribePlan).toBe('function');
    expect(typeof apiModule.getInvoices).toBe('function');
    expect(typeof apiModule.getInvoice).toBe('function');
    expect(typeof apiModule.requestInvoiceCheckout).toBe('function');
    expect(typeof apiModule.getSubscription).toBe('function');
  });
});
