import { describe, expect, it } from 'vitest';

import { buildSyncSalePayload, isFiscalRuleFailure } from '../hooks/useSync';

describe('fiscal sync failure classification', () => {
  it('moves fiscal rule errors to human review without blind retries', () => {
    expect(isFiscalRuleFailure({ response: { data: { detail: { code: 'sale.fiscal_rule_missing' } } } })).toBe(true);
  });

  it('keeps network failures eligible for bounded retries', () => {
    expect(isFiscalRuleFailure(new Error('network unavailable'))).toBe(false);
  });
});

describe('authoritative sale sync payload', () => {
  it('can omit offline_id for a block-mode single checkout', () => {
    const payload = buildSyncSalePayload({
      id: 'sale-1', market_id: 'market-1', box_id: 'box-1', terminal_id: 'terminal-1',
      created_at: '2026-07-20T12:00:00Z', total_amount: 12, discount: 0, surcharge: 0,
      customer_cpf: '123.456.789-00', items: [{ product_id: 'product-1', name: 'Cerveja', quantity: 1, unit_price: 12, total: 12 }],
      payments: [{ method: 'pix', amount: 12 }],
    }, 'operator-1', { offline: false });

    expect(payload).not.toHaveProperty('offline_id');
    expect(payload.customer_cpf).toBe('12345678900');
    expect(payload.items[0].product_name).toBe('Cerveja');
  });
});
