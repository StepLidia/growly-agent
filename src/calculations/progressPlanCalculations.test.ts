import { describe, expect, it } from 'vitest';
import { assets } from '../finance';
import { buildPlanProgressBaseline, buildSharedProgressAssets } from './progressPlanCalculations';
import { calculateCurrentWealth, calculateProjectedPlannedWealth } from './progressCalculations';

const january = { monthLabel: 'January 2026', recordedAt: new Date(2026, 0, 1).toISOString() };
const february = { monthLabel: 'February 2026', recordedAt: new Date(2026, 1, 1).toISOString() };
const initialBalances = { savings: 100, investments: 200, pillar2: 300, pillar3: 400 };
const records = {
  '2026-01': { ...january, balances: { savings: 1000, investments: 2000, pillar2: 3000, pillar3: 4000 } },
  '2026-02': { ...february, balances: { savings: 1100, investments: 2200, pillar2: 3300, pillar3: 4400 } },
};

describe('progress for financial plans', () => {
  it('leaves a new plan untracked', () => {
    expect(buildPlanProgressBaseline(undefined, records, initialBalances)).toBeNull();
  });

  it('uses each plan start month to select balances from the shared timeline', () => {
    expect(buildPlanProgressBaseline(january, records, initialBalances)?.totalWealth).toBe(10000);
    expect(buildPlanProgressBaseline(february, records, initialBalances)?.totalWealth).toBe(11000);
  });

  it('reflects shared history edits in every plan using that baseline month', () => {
    const edited = { ...records, '2026-01': { ...records['2026-01'], balances: { savings: 5000 } } };
    for (const start of [january, { ...january }]) {
      expect(buildPlanProgressBaseline(start, edited, initialBalances)?.totalWealth).toBe(5000);
    }
  });

  it('uses the last earlier record or shared initial balances when a start month has no record', () => {
    const march = { monthLabel: 'March 2026', recordedAt: new Date(2026, 2, 1).toISOString() };
    expect(buildPlanProgressBaseline(march, records, initialBalances)?.balances).toEqual(records['2026-02'].balances);
    expect(buildPlanProgressBaseline(january, {}, initialBalances)?.balances).toEqual(initialBalances);
  });

  it('keeps actual wealth independent of plan amounts while projections use plan returns and contributions', () => {
    const planA = assets.map((asset) => ({ ...asset, amount: 100000, annualReturn: 0, monthlyContribution: 100 }));
    const planB = assets.map((asset) => ({ ...asset, amount: 0, annualReturn: 0, monthlyContribution: 0 }));
    const sharedA = buildSharedProgressAssets(planA, initialBalances);
    const sharedB = buildSharedProgressAssets(planB, initialBalances);

    expect(calculateCurrentWealth(sharedA)).toBe(1000);
    expect(calculateCurrentWealth(sharedB)).toBe(1000);
    expect(calculateProjectedPlannedWealth({ assets: sharedA, baselineBalances: initialBalances, monthsTracked: 12 })).toBe(5800);
    expect(calculateProjectedPlannedWealth({ assets: sharedB, baselineBalances: initialBalances, monthsTracked: 12 })).toBe(1000);
    expect(planA[0].amount).toBe(100000);
  });
});
