import { describe, expect, it } from 'vitest';
import { assets as defaultAssets } from '../finance';
import { calculateOverviewProgress } from './overviewCalculations';

const january = { monthLabel: 'January 2026', recordedAt: new Date(2026, 0, 1).toISOString() };
const february = { monthLabel: 'February 2026', recordedAt: new Date(2026, 1, 1).toISOString() };
const settings = {
  initialBalances: { savings: 100 },
  planStarts: { 'plan-a': january, 'plan-b': february },
};
const monthlyRecords = {
  '2026-01': { ...january, balances: { savings: 1000 } },
  '2026-02': { ...february, balances: { savings: 2000 } },
};
const input = {
  assets: [{ ...defaultAssets[0], amount: 99999, monthlyContribution: 10, annualReturn: 0 }],
  projectionYears: 1,
  planId: 'plan-a',
  settings,
  monthlyRecords,
  currentDate: new Date(2026, 9, 7),
};

describe('overview progress', () => {
  it('keeps the plan target independent of its start date and current wealth shared', () => {
    const planA = calculateOverviewProgress(input);
    const planB = calculateOverviewProgress({ ...input, planId: 'plan-b' });

    expect(planA.totalCurrentWealth).toBe(2000);
    expect(planB.totalCurrentWealth).toBe(2000);
    expect(planA.targetWealth).toBe(100119);
    expect(planB.targetWealth).toBe(100119);
    expect(planA.currentWealthProgressPercent).toBeCloseTo(2000 / 100119 * 100);
    expect(planB.currentWealthProgressPercent).toBeCloseTo(2000 / 100119 * 100);
  });

  it('uses the selected plan returns, contributions, and horizon for the target', () => {
    const result = calculateOverviewProgress({
      ...input,
      planId: 'plan-b',
      projectionYears: 2,
      assets: [{ ...input.assets[0], amount: 3000, annualReturn: 10, monthlyContribution: 0 }],
    });

    expect(result.totalCurrentWealth).toBe(2000);
    expect(result.targetWealth).toBeCloseTo(3630);
  });

  it('uses the latest earlier balance and ignores future records for current wealth', () => {
    const result = calculateOverviewProgress({
      ...input,
      monthlyRecords: {
        ...monthlyRecords,
        '2026-11': { monthLabel: 'November 2026', recordedAt: new Date(2026, 10, 1).toISOString(), balances: { savings: 9999 } },
      },
    });

    expect(result.totalCurrentWealth).toBe(2000);
    expect(result.targetWealth).toBe(100119);
  });

  it('projects an untracked plan from its input amounts', () => {
    const result = calculateOverviewProgress({ ...input, planId: 'new-plan' });

    expect(result.totalCurrentWealth).toBe(2000);
    expect(result.targetWealth).toBe(100119);
  });

  it('uses shared initial balances when no monthly history exists', () => {
    const result = calculateOverviewProgress({ ...input, monthlyRecords: {} });

    expect(result.totalCurrentWealth).toBe(100);
    expect(result.targetWealth).toBe(100119);
  });

  it('keeps plan targets unchanged after a shared historical balance is edited', () => {
    const result = calculateOverviewProgress({
      ...input,
      monthlyRecords: { ...monthlyRecords, '2026-01': { ...january, balances: { savings: 1500 } } },
    });

    expect(result.totalCurrentWealth).toBe(2000);
    expect(result.targetWealth).toBe(100119);
  });
});
