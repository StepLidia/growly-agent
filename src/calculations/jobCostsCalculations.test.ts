import { describe, expect, it } from 'vitest';
import { calculateJobHourlySalary } from './jobCostsCalculations';

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
