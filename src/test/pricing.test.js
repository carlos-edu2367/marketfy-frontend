import { describe, expect, it } from 'vitest';
import { getRecommendedPlanId, selectPublicPlans } from '../lib/pricing';

const plan = (id, extra = {}) => ({ id, type: 'pago', is_active: true, price_monthly: 50, ...extra });

describe('getRecommendedPlanId', () => {
  it('uses the plan flagged by the business', () => {
    expect(getRecommendedPlanId([plan('a'), plan('b', { is_recommended: true }), plan('c')])).toBe('b');
  });

  it('never guesses by position when nothing is flagged', () => {
    expect(getRecommendedPlanId([plan('a'), plan('b'), plan('c')])).toBeNull();
    expect(getRecommendedPlanId(undefined)).toBeNull();
  });
});

describe('selectPublicPlans ordering', () => {
  it('orders by display_order and then by monthly price', () => {
    const plans = [
      plan('cheap-late', { display_order: 2, price_monthly: 10 }),
      plan('expensive-first', { display_order: 1, price_monthly: 900 }),
      plan('cheap-first', { display_order: 1, price_monthly: 20 }),
      plan('no-order', { price_monthly: 5 }),
    ];
    expect(selectPublicPlans(plans).map((p) => p.id)).toEqual(['no-order', 'cheap-first', 'expensive-first', 'cheap-late']);
  });
});
