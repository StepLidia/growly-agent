import { describe, expect, it } from 'vitest';
import {
  calculateCurrentWealth,
  calculateMonthlyPlanContribution,
  calculateMonthsTracked,
  calculatePlannedWealth,
  calculateProgressDelta,
  calculateProgressDeltaPercent,
  calculateProjectedPlannedWealth,
  calculateProgressTargetPercent,
  calculateProgressTargetYears,
  calculateTotalBalance,
  calculateYearsTracked,
  buildProgressAssetTargetBars,
  buildProgressChartData,
  buildProgressVarianceCharts,
  buildNegativeProgressProjection,
  buildOptimisticProgressProjection,
  buildPessimisticProgressProjection,
  buildPlannedProgressProjection,
  findLatestProgressRecordOnOrBefore,
} from './progressCalculations';

describe('progress calculations', () => {
  it('calculates current wealth from asset amounts', () => {
    expect(
      calculateCurrentWealth([
        { amount: 1000, monthlyContribution: 100 },
        { amount: 2500, monthlyContribution: 200 },
      ]),
    ).toBe(3500);
  });

  it('calculates monthly planned contribution from assets', () => {
    expect(
      calculateMonthlyPlanContribution([
        { amount: 1000, monthlyContribution: 100 },
        { amount: 2500, monthlyContribution: 200 },
      ]),
    ).toBe(300);
  });

  it('calculates tracked months and years from month boundaries', () => {
    const monthsTracked = calculateMonthsTracked(new Date(2022, 0, 15), new Date(2026, 4, 1));

    expect(monthsTracked).toBe(52);
    expect(calculateYearsTracked(monthsTracked)).toBe(4.3);
  });

  it('tracks months by calendar month regardless of day in month', () => {
    expect(calculateMonthsTracked(new Date(2026, 1, 18), new Date(2026, 2, 1))).toBe(1);
    expect(calculateMonthsTracked(new Date(2026, 1, 1), new Date(2026, 2, 30))).toBe(1);
  });

  it('does not return negative tracked months', () => {
    expect(calculateMonthsTracked(new Date(2026, 4, 1), new Date(2022, 0, 15))).toBe(0);
  });

  it('calculates planned wealth and progress delta', () => {
    const plannedWealth = calculatePlannedWealth({
      baselineWealth: 100000,
      monthlyPlanContribution: 1000,
      monthsTracked: 12,
    });

    expect(plannedWealth).toBe(112000);
    expect(calculateProgressDelta(120000, plannedWealth)).toBe(8000);
    expect(calculateProgressDeltaPercent(120000, plannedWealth)).toBeCloseTo(7.14, 2);
  });

  it('calculates projected planned wealth with configured returns', () => {
    const plannedWealth = calculateProjectedPlannedWealth({
      assets: [
        { amount: 50000, annualReturn: 0, id: 'savings', monthlyContribution: 500 },
        { amount: 50000, annualReturn: 3, id: 'investments', monthlyContribution: 500 },
      ],
      baselineBalances: {
        investments: 50000,
        savings: 50000,
      },
      monthsTracked: 5,
    });

    expect(plannedWealth).toBeCloseTo(105625, 2);
  });

  it('calculates projected planned wealth from saved baseline balances', () => {
    const plannedWealth = calculateProjectedPlannedWealth({
      assets: [
        { amount: 60000, annualReturn: 0, id: 'savings', monthlyContribution: 500 },
        { amount: 40000, annualReturn: 3, id: 'investments', monthlyContribution: 500 },
      ],
      baselineBalances: {
        investments: 48000,
        savings: 72000,
      },
      monthsTracked: 5,
    });

    expect(plannedWealth).toBeCloseTo(125600, 2);
  });

  it('linearly interpolates planned wealth between yearly compounded values', () => {
    const plannedWealth = calculateProjectedPlannedWealth({
      assets: [
        { amount: 60000, annualReturn: 0, id: 'savings', monthlyContribution: 1000 },
        { amount: 0, annualReturn: 5, id: 'investments', monthlyContribution: 1800 },
      ],
      baselineBalances: {
        investments: 0,
        savings: 60000,
      },
      monthsTracked: 2,
    });

    expect(plannedWealth).toBeCloseTo(65600, 2);
  });

  it('calculates progress toward target projected wealth', () => {
    expect(calculateProgressTargetPercent(412000, 1000000)).toBeCloseTo(41.2, 2);
    expect(calculateProgressTargetPercent(-1000, 1000000)).toBe(0);
    expect(calculateProgressTargetPercent(1000, 0)).toBe(100);
    expect(calculateProgressTargetYears(412000, 1000000, 30)).toBeCloseTo(12.36, 2);
  });

  it('calculates total balance from saved monthly balances', () => {
    expect(calculateTotalBalance({ investments: 40000, pillar2: 85000, pillar3: 15000, savings: 25000 })).toBe(165000);
  });

  it('finds the latest saved progress record up to the current month', () => {
    const latestRecord = findLatestProgressRecordOnOrBefore(
      {
        '2026-04': {
          balances: { savings: 100000 },
          recordedAt: new Date(2026, 3, 1).toISOString(),
        },
        '2026-06': {
          balances: { savings: 106000 },
          recordedAt: new Date(2026, 5, 1).toISOString(),
        },
        '2026-08': {
          balances: { savings: 112000 },
          recordedAt: new Date(2026, 7, 1).toISOString(),
        },
      },
      new Date(2026, 6, 1),
    );

    expect(latestRecord?.key).toBe('2026-06');
    expect(latestRecord?.record.balances.savings).toBe(106000);
  });

  it('returns null when there is no saved progress record on or before the current month', () => {
    expect(
      findLatestProgressRecordOnOrBefore(
        {
          '2026-08': {
            balances: { savings: 112000 },
            recordedAt: new Date(2026, 7, 1).toISOString(),
          },
        },
        new Date(2026, 6, 1),
      ),
    ).toBeNull();
  });

  it('builds asset target progress bars in projection years', () => {
    const bars = buildProgressAssetTargetBars({
      assets: [
        {
          amount: 100000,
          annualReturn: 0,
          color: 'blue',
          id: 'savings',
          label: 'Savings',
          monthlyContribution: 1000,
        },
      ],
      baselineBalances: {
        savings: 100000,
      },
      projectionYears: 10,
    });

    expect(bars).toEqual([
      {
        color: 'blue',
        currentWealth: 100000,
        id: 'savings',
        label: 'Savings',
        progressPercent: expect.closeTo(45.45, 2),
        progressYears: expect.closeTo(4.55, 2),
        targetWealth: 220000,
      },
    ]);
  });

  it('builds asset target progress bars from baseline planned values', () => {
    const assets = [
      {
        amount: 120000,
        annualReturn: 0,
        color: 'blue',
        id: 'savings',
        label: 'Savings',
        monthlyContribution: 1000,
      },
      {
        amount: 30000,
        annualReturn: 3,
        color: 'coral',
        id: 'investments',
        label: 'Investments',
        monthlyContribution: 500,
      },
    ];
    const baselineBalances = {
      investments: 50000,
      savings: 100000,
    };
    const bars = buildProgressAssetTargetBars({
      assets,
      baselineBalances,
      projectionYears: 10,
    });
    const totalPlannedTarget = buildPlannedProgressProjection({
      assets,
      baselineBalances,
      projectionYears: 10,
    }).at(-1)?.value ?? 0;
    const totalBarTarget = bars.reduce((sum, bar) => sum + bar.targetWealth, 0);

    expect(bars[0].currentWealth).toBe(120000);
    expect(bars[0].targetWealth).toBe(220000);
    expect(totalBarTarget).toBeCloseTo(totalPlannedTarget, 2);
  });

  it('builds annual and monthly variance charts from saved progress records', () => {
    const charts = buildProgressVarianceCharts({
      assets: [
        { amount: 100000, annualReturn: 0, color: 'blue', id: 'savings', label: 'Savings', monthlyContribution: 1000 },
        { amount: 50000, annualReturn: 0, color: 'coral', id: 'investments', label: 'Investments', monthlyContribution: 500 },
        { amount: 80000, annualReturn: 0, color: 'emerald', id: 'pillar2', label: '2nd Pillar', monthlyContribution: 400 },
        { amount: 20000, annualReturn: 0, color: 'cyan', id: 'pillar3', label: '3rd Pillar', monthlyContribution: 100 },
      ],
      baselineBalances: {
        investments: 50000,
        pillar2: 80000,
        pillar3: 20000,
        savings: 100000,
      },
      baselineDate: new Date(2026, 0, 1),
      records: [
        {
          balances: { investments: 50500, pillar2: 80400, pillar3: 20100, savings: 101500 },
          recordedAt: new Date(2026, 0, 1).toISOString(),
        },
        {
          balances: { investments: 54500, pillar2: 84000, pillar3: 20900, savings: 109000 },
          recordedAt: new Date(2026, 5, 1).toISOString(),
        },
        {
          balances: { investments: 61500, pillar2: 89000, pillar3: 22500, savings: 121000 },
          recordedAt: new Date(2027, 0, 1).toISOString(),
        },
      ],
    });

    const totalChart = charts.find((chart) => chart.id === 'total');

    expect(totalChart?.annualPoints.map((point) => point.label)).toEqual(['2026', '2027']);
    expect(totalChart?.monthlyPointsByYear['2026'].map((point) => point.label)).toEqual(['Jan', 'Jun']);
    expect(totalChart?.monthlyPointsByYear['2026'][1].variance).toBeCloseTo(8400, 2);
    expect(totalChart?.annualPoints[0].variance).toBeCloseTo(8400, 2);
  });

  it('uses baseline balances for total variance planned values', () => {
    const charts = buildProgressVarianceCharts({
      assets: [
        { amount: 50000, annualReturn: 0, color: 'blue', id: 'savings', label: 'Savings', monthlyContribution: 500 },
        { amount: 50000, annualReturn: 3, color: 'coral', id: 'investments', label: 'Investments', monthlyContribution: 500 },
      ],
      baselineBalances: {
        investments: 50000,
        savings: 50000,
      },
      baselineDate: new Date(2026, 0, 1),
      records: [
        {
          balances: { investments: 54000, savings: 54000 },
          recordedAt: new Date(2026, 5, 1).toISOString(),
        },
      ],
    });
    const totalChart = charts.find((chart) => chart.id === 'total');

    expect(totalChart?.monthlyPointsByYear['2026'][0].plannedWealth).toBeCloseTo(105625, 2);
    expect(totalChart?.monthlyPointsByYear['2026'][0].variance).toBeCloseTo(2375, 2);
  });

  it('uses saved baseline balances when they differ from current assets', () => {
    const charts = buildProgressVarianceCharts({
      assets: [
        { amount: 60000, annualReturn: 0, color: 'blue', id: 'savings', label: 'Savings', monthlyContribution: 500 },
        { amount: 40000, annualReturn: 3, color: 'coral', id: 'investments', label: 'Investments', monthlyContribution: 500 },
      ],
      baselineBalances: {
        investments: 48000,
        savings: 72000,
      },
      baselineDate: new Date(2026, 0, 1),
      records: [
        {
          balances: { investments: 54000, savings: 72000 },
          recordedAt: new Date(2026, 5, 1).toISOString(),
        },
      ],
    });
    const totalChart = charts.find((chart) => chart.id === 'total');

    expect(totalChart?.monthlyPointsByYear['2026'][0].plannedWealth).toBeCloseTo(125600, 2);
    expect(totalChart?.monthlyPointsByYear['2026'][0].variance).toBeCloseTo(400, 2);
  });

  it('uses saved baseline balances for subgroup variance planned values', () => {
    const charts = buildProgressVarianceCharts({
      assets: [
        { amount: 60000, annualReturn: 0, color: 'blue', id: 'savings', label: 'Savings', monthlyContribution: 500 },
        { amount: 40000, annualReturn: 3, color: 'coral', id: 'investments', label: 'Investments', monthlyContribution: 500 },
        { amount: 90000, annualReturn: 1, color: 'emerald', id: 'pillar2', label: '2nd Pillar', monthlyContribution: 400 },
        { amount: 10000, annualReturn: 2, color: 'cyan', id: 'pillar3', label: '3rd Pillar', monthlyContribution: 100 },
      ],
      baselineBalances: {
        investments: 48000,
        pillar2: 78000,
        pillar3: 12000,
        savings: 72000,
      },
      baselineDate: new Date(2026, 0, 1),
      records: [
        {
          balances: { investments: 54000, pillar2: 82000, pillar3: 13000, savings: 72000 },
          recordedAt: new Date(2026, 5, 1).toISOString(),
        },
      ],
    });
    const liquidChart = charts.find((chart) => chart.id === 'liquid');
    const pensionChart = charts.find((chart) => chart.id === 'pension');

    expect(liquidChart?.monthlyPointsByYear['2026'][0].plannedWealth).toBeCloseTo(125600, 2);
    expect(pensionChart?.monthlyPointsByYear['2026'][0].plannedWealth).toBeCloseTo(92925, 2);
  });

  it('builds planned and actual progress chart points', () => {
    const points = buildProgressChartData({
      actualPoints: [
        { date: new Date(2026, 0, 1), totalWealth: 100000 },
        { date: new Date(2026, 5, 1), totalWealth: 108000 },
      ],
      baselineDate: new Date(2026, 0, 1),
      baselineBalances: {
        investments: 50000,
        savings: 50000,
      },
      optimisticAssets: [
        { amount: 50000, annualReturn: 0, id: 'savings', monthlyContribution: 500 },
        { amount: 50000, annualReturn: 3, id: 'investments', monthlyContribution: 500 },
      ],
      projectionYears: 1,
    });

    expect(points[0]).toEqual({
      actualWealth: 100000,
      monthLabel: 'January 2026',
      negativeWealth: 100000,
      optimisticWealth: 100000,
      pessimisticWealth: 100000,
      plannedWealth: 100000,
      year: 0,
    });
    expect(points).toHaveLength(13);
    expect(points[1]).toMatchObject({
      actualWealth: null,
      monthLabel: 'February 2026',
      year: 1 / 12,
    });
    expect(points[5].actualWealth).toBe(108000);
    expect(points[5].monthLabel).toBe('June 2026');
    expect(points[5].negativeWealth).toBeCloseTo(105416.67, 2);
    expect(points[5].optimisticWealth).toBeCloseTo(105833.33, 2);
    expect(points[5].pessimisticWealth).toBeCloseTo(105000, 2);
    expect(points[5].plannedWealth).toBeCloseTo(105625, 2);
    expect(points[5].year).toBe(5 / 12);
    expect(points[12]).toEqual({
      actualWealth: null,
      monthLabel: 'January 2027',
      negativeWealth: 113000,
      optimisticWealth: 114000,
      pessimisticWealth: 112000,
      plannedWealth: 113500,
      year: 1,
    });
  });

  it('builds a planned projection with configured asset returns', () => {
    const points = buildPlannedProgressProjection({
      assets: [
        { amount: 50000, annualReturn: 0, id: 'savings', monthlyContribution: 0 },
        { amount: 50000, annualReturn: 3, id: 'investments', monthlyContribution: 0 },
      ],
      baselineBalances: {
        investments: 50000,
        savings: 50000,
      },
      projectionYears: 1,
    });

    expect(points).toHaveLength(2);
    expect(points[0]).toEqual({ value: 100000, year: 0 });
    expect(points.at(-1)).toEqual({ value: 101500, year: 1 });
  });

  it('builds an optimistic projection with boosted investment and pension returns', () => {
    const points = buildOptimisticProgressProjection({
      assets: [
        { amount: 50000, annualReturn: 0, id: 'savings', monthlyContribution: 0 },
        { amount: 50000, annualReturn: 3, id: 'investments', monthlyContribution: 0 },
      ],
      baselineBalances: {
        investments: 50000,
        savings: 50000,
      },
      projectionYears: 1,
    });

    expect(points).toHaveLength(2);
    expect(points[0]).toEqual({ value: 100000, year: 0 });
    expect(points.at(-1)).toEqual({ value: 102000, year: 1 });
  });

  it('builds a negative projection with reduced investment and pension returns', () => {
    const points = buildNegativeProgressProjection({
      assets: [
        { amount: 50000, annualReturn: 0, id: 'savings', monthlyContribution: 0 },
        { amount: 50000, annualReturn: 3, id: 'investments', monthlyContribution: 0 },
      ],
      baselineBalances: {
        investments: 50000,
        savings: 50000,
      },
      projectionYears: 1,
    });

    expect(points).toHaveLength(2);
    expect(points[0]).toEqual({ value: 100000, year: 0 });
    expect(points.at(-1)).toEqual({ value: 101000, year: 1 });
  });

  it('builds a pessimistic projection with all returns set to zero', () => {
    const points = buildPessimisticProgressProjection({
      assets: [
        { amount: 50000, annualReturn: 0, id: 'savings', monthlyContribution: 100 },
        { amount: 50000, annualReturn: 3, id: 'investments', monthlyContribution: 200 },
      ],
      baselineBalances: {
        investments: 50000,
        savings: 50000,
      },
      projectionYears: 1,
    });

    expect(points).toHaveLength(2);
    expect(points[0]).toEqual({ value: 100000, year: 0 });
    expect(points.at(-1)).toEqual({ value: 103600, year: 1 });
  });
});
