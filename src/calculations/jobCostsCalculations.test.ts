import { describe, expect, it } from 'vitest';
import { calculateJobHourlySalary, calculateJobHourlySalaryAfterExpenses } from './jobCostsCalculations';

describe('calculateJobHourlySalary', () => {
  it('divides annual net salary by working hours excluding vacation weeks', () => {
    expect(calculateJobHourlySalary({ annualNetSalary: 94000, vacationWeeks: 5, hoursPerWeek: 40 })).toBe(50);
  });

  it('supports no vacation, part-time work and fractional weeks and hours', () => {
    expect(calculateJobHourlySalary({ annualNetSalary: 52000, vacationWeeks: 0, hoursPerWeek: 20 })).toBe(50);
    expect(calculateJobHourlySalary({ annualNetSalary: 85000, vacationWeeks: 5.5, hoursPerWeek: 37.5 })).toBeCloseTo(48.7455, 4);
  });

  it('returns zero for a zero salary with valid working hours', () => {
    expect(calculateJobHourlySalary({ annualNetSalary: 0, vacationWeeks: 5, hoursPerWeek: 40 })).toBe(0);
  });

  it.each([
    { annualNetSalary: -1, vacationWeeks: 5, hoursPerWeek: 40 },
    { annualNetSalary: 94000, vacationWeeks: -1, hoursPerWeek: 40 },
    { annualNetSalary: 94000, vacationWeeks: 52, hoursPerWeek: 40 },
    { annualNetSalary: 94000, vacationWeeks: 53, hoursPerWeek: 40 },
    { annualNetSalary: 94000, vacationWeeks: 5, hoursPerWeek: 0 },
    { annualNetSalary: 94000, vacationWeeks: 5, hoursPerWeek: -1 },
    { annualNetSalary: NaN, vacationWeeks: 5, hoursPerWeek: 40 },
    { annualNetSalary: 94000, vacationWeeks: NaN, hoursPerWeek: 40 },
    { annualNetSalary: 94000, vacationWeeks: 5, hoursPerWeek: Infinity },
  ])('returns no result for invalid inputs: %j', (inputs) => {
    expect(calculateJobHourlySalary(inputs)).toBeNull();
  });
});

describe('calculateJobHourlySalaryAfterExpenses', () => {
  it('annualizes all expense time and money using working weeks', () => {
    expect(calculateJobHourlySalaryAfterExpenses({
      annualNetSalary: 94000, vacationWeeks: 5, hoursPerWeek: 40,
      expenses: [{ hoursPerWeek: 3, moneyPerWeek: 60 }, { hoursPerWeek: 7, moneyPerWeek: 140 }],
    })).toBe(36);
  });

  it('matches the original hourly salary when expenses are absent or zero', () => {
    const salary = { annualNetSalary: 85000, vacationWeeks: 5.5, hoursPerWeek: 37.5 };
    expect(calculateJobHourlySalaryAfterExpenses({ ...salary, expenses: [] })).toBe(calculateJobHourlySalary(salary));
    expect(calculateJobHourlySalaryAfterExpenses({ ...salary, expenses: [{ hoursPerWeek: 0, moneyPerWeek: 0 }] })).toBe(calculateJobHourlySalary(salary));
  });

  it('preserves fractional hours and expenses', () => {
    expect(calculateJobHourlySalaryAfterExpenses({
      annualNetSalary: 50000, vacationWeeks: 4.5, hoursPerWeek: 20,
      expenses: [{ hoursPerWeek: 2.5, moneyPerWeek: 50.75 }],
    })).toBeCloseTo((50000 - 50.75 * 47.5) / (22.5 * 47.5));
  });

  it('allows negative earnings when annual expenses exceed salary', () => {
    expect(calculateJobHourlySalaryAfterExpenses({
      annualNetSalary: 1000, vacationWeeks: 2, hoursPerWeek: 10,
      expenses: [{ hoursPerWeek: 0, moneyPerWeek: 40 }],
    })).toBe(-2);
  });

  it.each([
    { hoursPerWeek: -1, moneyPerWeek: 0 },
    { hoursPerWeek: 0, moneyPerWeek: -1 },
    { hoursPerWeek: NaN, moneyPerWeek: 0 },
    { hoursPerWeek: 0, moneyPerWeek: Infinity },
    { hoursPerWeek: Number.MAX_VALUE, moneyPerWeek: 0 },
  ])('rejects invalid or overflowing expense inputs: %j', (expense) => {
    expect(calculateJobHourlySalaryAfterExpenses({
      annualNetSalary: 94000, vacationWeeks: 5, hoursPerWeek: 40, expenses: [expense],
    })).toBeNull();
  });

  it('requires complete salary terms and nonzero working hours', () => {
    expect(calculateJobHourlySalaryAfterExpenses({ annualNetSalary: NaN, vacationWeeks: 5, hoursPerWeek: 40, expenses: [] })).toBeNull();
    expect(calculateJobHourlySalaryAfterExpenses({ annualNetSalary: 94000, vacationWeeks: 52, hoursPerWeek: 40, expenses: [] })).toBeNull();
    expect(calculateJobHourlySalaryAfterExpenses({ annualNetSalary: 94000, vacationWeeks: 5, hoursPerWeek: 0, expenses: [{ hoursPerWeek: 5, moneyPerWeek: 0 }] })).toBeNull();
  });
});
