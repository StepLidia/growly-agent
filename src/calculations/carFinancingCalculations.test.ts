import { describe, expect, it } from 'vitest';
import {
  calculateCreditSummary,
  calculateLeasingSummary,
  parseCarMoneyInput,
} from './carFinancingCalculations';

describe('car financing calculations', () => {
  it('parses formatted car money inputs', () => {
    expect(parseCarMoneyInput('52,500')).toBe(52500);
    expect(parseCarMoneyInput('5.49')).toBe(5.49);
    expect(parseCarMoneyInput(true)).toBe(0);
    expect(parseCarMoneyInput('not a number')).toBe(0);
  });

  it('calculates leasing payment and total interest from depreciation amount', () => {
    const summary = calculateLeasingSummary({
      annualInterestRate: 5.49,
      downPayment: 2500,
      durationMonths: 36,
      residualValue: 26250,
      vehiclePrice: 52500,
    });

    expect(summary.financedAmount).toBe(23750);
    expect(summary.durationYears).toBe(3);
    expect(summary.monthlyPayment).toBeCloseTo(717.05, 2);
    expect(summary.totalInterestCost).toBeCloseTo(2063.64, 2);
  });

  it('calculates credit payment and total interest from loan principal', () => {
    const summary = calculateCreditSummary({
      annualInterestRate: 5.49,
      downPayment: 5250,
      durationMonths: 60,
      vehiclePrice: 52500,
    });

    expect(summary.financedAmount).toBe(47250);
    expect(summary.durationYears).toBe(5);
    expect(summary.monthlyPayment).toBeCloseTo(902.31, 2);
    expect(summary.totalInterestCost).toBeCloseTo(6888.71, 2);
  });

  it('does not add interest when the rate is zero', () => {
    const summary = calculateCreditSummary({
      annualInterestRate: 0,
      downPayment: 5000,
      durationMonths: 50,
      vehiclePrice: 55000,
    });

    expect(summary.monthlyPayment).toBe(1000);
    expect(summary.totalInterestCost).toBe(0);
  });
});
