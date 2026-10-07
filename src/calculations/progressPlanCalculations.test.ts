import { describe, expect, it } from 'vitest';
import { assets, calculateDashboard, incomePlan } from '../finance';
import { buildPlanProgressBaseline, buildSharedProgressAssets, getPlanProjectionBalances } from './progressPlanCalculations';
import { buildProgressAssetTargetBars, buildProgressChartData, buildProgressVarianceCharts, calculateCurrentWealth, calculateProjectedPlannedWealth } from './progressCalculations';
import { calculateOverviewProgress } from './overviewCalculations';

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

  it('keeps actual wealth shared while projections use all selected plan inputs', () => {
    const planA = assets.map((asset) => ({ ...asset, amount: 100000, annualReturn: 0, monthlyContribution: 100 }));
    const planB = assets.map((asset) => ({ ...asset, amount: 0, annualReturn: 0, monthlyContribution: 0 }));
    const sharedA = buildSharedProgressAssets(planA, initialBalances);
    const sharedB = buildSharedProgressAssets(planB, initialBalances);

    expect(calculateCurrentWealth(sharedA)).toBe(1000);
    expect(calculateCurrentWealth(sharedB)).toBe(1000);
    expect(calculateProjectedPlannedWealth({ assets: planA, baselineBalances: getPlanProjectionBalances(planA), monthsTracked: 12 })).toBe(404800);
    expect(calculateProjectedPlannedWealth({ assets: planB, baselineBalances: getPlanProjectionBalances(planB), monthsTracked: 12 })).toBe(0);
    expect(planA[0].amount).toBe(100000);
  });

  it.each([19, 80])('matches Details, Progress, Overview, and asset targets at %i years despite different recorded balances', (projectionYears) => {
    const dashboard = calculateDashboard(assets, incomePlan, projectionYears);
    const planBalances = getPlanProjectionBalances(assets);
    const progress = buildProgressChartData({
      actualPoints: [{ date: new Date(february.recordedAt), totalWealth: 11000 }],
      baselineDate: new Date(january.recordedAt),
      baselineBalances: planBalances,
      optimisticAssets: assets,
      projectionYears,
    });
    const overview = calculateOverviewProgress({
      assets: dashboard.assets,
      planId: 'plan-a',
      projectionYears,
      settings: { initialBalances, planStarts: { 'plan-a': january } },
      monthlyRecords: records,
      currentDate: new Date(2026, 9, 7),
    });
    const targets = buildProgressAssetTargetBars({ assets, baselineBalances: planBalances, projectionYears });

    expect(Math.round(progress.at(-1)!.plannedWealth)).toBe(dashboard.totalWealth);
    expect(Math.round(overview.targetWealth)).toBe(dashboard.totalWealth);
    expect(overview.totalCurrentWealth).toBe(11000);
    for (const target of targets) {
      expect(Math.round(target.targetWealth)).toBe(dashboard.assets.find(({ id }) => id === target.id)?.futureValue);
    }
  });

  it('compares historical actual balances against the plan projection without rebasing it', () => {
    const planAssets = assets.map((asset) => ({ ...asset, amount: 1000, annualReturn: 0, monthlyContribution: 100 }));
    const charts = buildProgressVarianceCharts({
      assets: planAssets,
      baselineBalances: getPlanProjectionBalances(planAssets),
      baselineDate: new Date(january.recordedAt),
      records: Object.values(records),
    });
    const total = charts.find(({ id }) => id === 'total')!;
    const points = total.monthlyPointsByYear['2026'];

    expect(points[0].actualWealth).toBe(10000);
    expect(points[0].plannedWealth).toBe(4000);
    expect(points[1].actualWealth).toBe(11000);
    expect(points[1].plannedWealth).toBeCloseTo(4400);
    expect(points[1].variance).toBeCloseTo(6600);
  });
});
