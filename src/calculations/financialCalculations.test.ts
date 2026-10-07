import { describe, expect, it } from 'vitest';
import {
  buildProjection,
  calculateDashboard,
  futureValue,
  type FinancialAsset,
  type IncomePlan,
} from './financialCalculations';

const testAssets: FinancialAsset[] = [
  {
    id: 'savings',
    label: 'Savings',
    subtitle: 'Cash',
    amount: 1000,
    monthlyContribution: 100,
    annualReturn: 1,
    years: 3,
    color: 'blue',
  },
  {
    id: 'investments',
    label: 'Investments',
    subtitle: 'Portfolio',
    amount: 2000,
    monthlyContribution: 200,
    annualReturn: 5,
    years: 3,
    color: 'coral',
  },
  {
    id: 'pillar2',
    label: '2nd Pillar',
    subtitle: 'Pension',
    amount: 3000,
    monthlyContribution: 50,
    annualReturn: 2,
    years: 3,
    color: 'emerald',
  },
  {
    id: 'pillar3',
    label: '3rd Pillar',
    subtitle: 'Private pension',
    amount: 4000,
    monthlyContribution: 75,
    annualReturn: 3,
    years: 3,
    color: 'cyan',
  },
];

const testIncome: IncomePlan = {
  monthlyNetIncome: 1000,
  savingsContribution: 0,
  investmentContribution: 0,
  pillar3Contribution: 0,
  otherExpenses: 0,
};

describe('financial calculations', () => {
  it('calculates future value with yearly return only', () => {
    expect(futureValue(1000, 5, 3)).toBeCloseTo(1157.625, 3);
  });

  it('includes monthly contributions as yearly contributions', () => {
    expect(futureValue(1000, 5, 3, 100)).toBeCloseTo(4940.625, 3);
  });

  it('handles zero return', () => {
    expect(futureValue(1000, 0, 3, 100)).toBeCloseTo(4600, 3);
  });

  it('handles negative yearly return', () => {
    expect(futureValue(1000, -5, 3)).toBeCloseTo(857.375, 3);
  });

  it('handles zero years', () => {
    expect(futureValue(1000, 5, 0, 100)).toBeCloseTo(1000, 3);
  });

  it('generates chart projection data for every year', () => {
    const projection = buildProjection(1000, 5, 3, 100);

    expect(projection).toHaveLength(4);
    expect(projection[0]).toEqual({ year: 0, value: 1000 });
    expect(projection[1].value).toBeCloseTo(2250, 3);
    expect(projection[3].value).toBeCloseTo(4940.625, 3);
  });

  it('calculates total, pension, and savings plus investment wealth', () => {
    const dashboard = calculateDashboard(testAssets, testIncome, 3);

    expect(dashboard.liquidWealth).toBe(14548);
    expect(dashboard.pensionWealth).toBe(12173);
    expect(dashboard.totalWealth).toBe(26720);
  });

  it('calculates allocation percentages and derived expenses', () => {
    const dashboard = calculateDashboard(testAssets, testIncome, 3);

    expect(dashboard.income.savingsContribution).toBeCloseTo(100, 3);
    expect(dashboard.income.investmentContribution).toBeCloseTo(200, 3);
    expect(dashboard.income.pillar3Contribution).toBeCloseTo(75, 3);
    expect(dashboard.income.otherExpenses).toBeCloseTo(625, 3);
    expect(dashboard.futureBuildingPercent).toBeCloseTo(37.5, 3);
  });

  it('updates chart data generation in dashboard projections', () => {
    const dashboard = calculateDashboard(testAssets, testIncome, 3);

    expect(dashboard.totalProjection).toHaveLength(4);
    expect(dashboard.totalProjection[0].value).toBeCloseTo(10000, 3);
    expect(dashboard.totalProjection[3].value).toBeCloseTo(26720.253, 3);
    expect(dashboard.pensionProjection[3].value).toBeCloseTo(12172.582, 3);
    expect(dashboard.savingsInvestmentProjection[3].value).toBeCloseTo(14547.671, 3);
  });

  it('generates zero-return comparison chart data', () => {
    const dashboard = calculateDashboard(testAssets, testIncome, 3);

    expect(dashboard.zeroReturnTotalProjection).toHaveLength(4);
    expect(dashboard.zeroReturnTotalProjection[3].value).toBeCloseTo(25300, 3);
    expect(dashboard.zeroReturnPensionProjection[3].value).toBeCloseTo(11500, 3);
    expect(dashboard.zeroReturnSavingsInvestmentProjection[3].value).toBeCloseTo(13800, 3);
  });

  it('projects all wealth series through the 80-year horizon', () => {
    const assets = testAssets.map((asset) => ({ ...asset, annualReturn: 0 }));
    const dashboard = calculateDashboard(assets, testIncome, 80);
    const series = [
      dashboard.totalProjection,
      dashboard.pensionProjection,
      dashboard.savingsInvestmentProjection,
      dashboard.zeroReturnTotalProjection,
      dashboard.zeroReturnPensionProjection,
      dashboard.zeroReturnSavingsInvestmentProjection,
    ];

    for (const points of series) {
      expect(points).toHaveLength(81);
      expect(points.at(-1)?.year).toBe(80);
    }

    expect(dashboard.totalWealth).toBe(418000);
    expect(dashboard.pensionWealth).toBe(127000);
    expect(dashboard.liquidWealth).toBe(291000);
  });
});
