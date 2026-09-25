import { describe, expect, it, vi } from 'vitest';
import { buildExpenseTrendPeriods, getPreviousExpenseTrendEndMonth } from './expenseTrendCalculations';

const selectedMonth = {
  key: '2026-09',
  label: 'September 2026',
  shortLabel: 'Sep',
};

function category(value: number) {
  return [{ id: 'housing', label: 'Housing', color: '#2563eb', value }];
}

describe('expense trend calculations', () => {
  it('builds monthly periods with daily averages and current unsaved values', () => {
    const periods = buildExpenseTrendPeriods({
      aggregationMode: 'month',
      endMonth: selectedMonth,
      periodCount: 2,
      readExpenses: () => category(310),
      readMonthlyIncome: () => 1000,
      currentCategories: category(900),
      currentMonthlyIncome: 2000,
    });

    expect(periods.map(({ key }) => key)).toEqual(['2026-08', '2026-09']);
    expect(periods[0].averageExpense).toBe(10);
    expect(periods[1].totalExpenses).toBe(900);
    expect(periods[1].income).toBe(2000);
    expect(periods[1].changeAmount).toBe(590);
  });

  it('aggregates all twelve months for each calendar year', () => {
    const readExpenses = vi.fn((monthKey: string) => {
      const month = Number(monthKey.slice(5, 7));

      return [
        { id: 'housing', label: 'Housing', color: '#2563eb', value: 100 },
        { id: 'food', label: 'Food', color: '#22c55e', value: month },
      ];
    });
    const periods = buildExpenseTrendPeriods({
      aggregationMode: 'year',
      endMonth: selectedMonth,
      periodCount: 1,
      readExpenses,
      readMonthlyIncome: () => 1000,
      currentDate: new Date(2026, 8, 25),
      currentCategories: [
        { id: 'housing', label: 'Housing', color: '#2563eb', value: 900 },
        { id: 'food', label: 'Food', color: '#22c55e', value: 9 },
      ],
      currentMonthlyIncome: 2000,
    });

    expect(periods[0].key).toBe('2026');
    expect(periods[0].label).toBe('2026 YTD');
    expect(periods[0].includedMonthCount).toBe(9);
    expect(periods[0].categories).toEqual([
      { id: 'housing', label: 'Housing', color: '#2563eb', value: 1700 },
      { id: 'food', label: 'Food', color: '#22c55e', value: 45 },
    ]);
    expect(periods[0].totalExpenses).toBe(1745);
    expect(periods[0].averageExpense).toBeCloseTo(193.89, 2);
    expect(periods[0].income).toBe(10000);
    expect(periods[0].cashFlow).toBe(8255);
    expect(readExpenses).toHaveBeenCalledWith('2026-01');
    expect(readExpenses).not.toHaveBeenCalledWith('2026-10');
  });

  it('compares annual totals with the previous calendar year', () => {
    const periods = buildExpenseTrendPeriods({
      aggregationMode: 'year',
      endMonth: selectedMonth,
      periodCount: 2,
      readExpenses: (monthKey) => category(Number(monthKey.slice(0, 4)) - 2000),
      readMonthlyIncome: () => 1000,
      currentDate: new Date(2026, 8, 25),
    });

    expect(periods.map(({ key }) => key)).toEqual(['2025', '2026']);
    expect(periods[0].changeAmount).toBe(12);
    expect(periods[1].changeAmount).toBe(9);
  });

  it('returns the correct endpoint for the preceding comparison range', () => {
    const [yearPeriod] = buildExpenseTrendPeriods({
      aggregationMode: 'year',
      endMonth: selectedMonth,
      periodCount: 1,
      readExpenses: () => category(100),
      readMonthlyIncome: () => 1000,
      currentDate: new Date(2026, 8, 25),
    });

    expect(getPreviousExpenseTrendEndMonth(yearPeriod, 'year').key).toBe('2025-12');
  });
});
