import { beforeEach, describe, expect, it } from 'vitest';
import { clearPlanIntent, readPlanIntent, savePlanIntent } from '../lib/planIntent';

const DAY = 24 * 60 * 60 * 1000;

describe('planIntent', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips the plan and cycle chosen on the landing', () => {
    savePlanIntent({ planId: 'plan-pro', cycle: 'annual' }, 1_000);
    expect(readPlanIntent(1_000 + DAY)).toEqual({ planId: 'plan-pro', cycle: 'annual' });
  });

  it('ignores a call without plan', () => {
    savePlanIntent({ planId: null, cycle: 'annual' });
    expect(readPlanIntent()).toBeNull();
  });

  it('normalizes an unknown cycle to monthly', () => {
    savePlanIntent({ planId: 'plan-pro', cycle: 'weekly' }, 0);
    expect(readPlanIntent(0)).toEqual({ planId: 'plan-pro', cycle: 'monthly' });
  });

  it('expires after 30 days and cleans the key', () => {
    savePlanIntent({ planId: 'plan-pro', cycle: 'monthly' }, 0);
    expect(readPlanIntent(31 * DAY)).toBeNull();
    expect(localStorage.getItem('marketfy_plan_intent')).toBeNull();
  });

  it('survives corrupted storage', () => {
    localStorage.setItem('marketfy_plan_intent', '{not json');
    expect(readPlanIntent()).toBeNull();
  });

  it('clears the intent', () => {
    savePlanIntent({ planId: 'plan-pro', cycle: 'monthly' });
    clearPlanIntent();
    expect(readPlanIntent()).toBeNull();
  });
});
