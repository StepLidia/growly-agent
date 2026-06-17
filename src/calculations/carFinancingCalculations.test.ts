import { describe, expect, it } from 'vitest';
import {
  calculateCreditSummary,
  calculateEstimatedLeaseResidualValue,
  calculateLeasingSummary,
  buildCarFinancingProjection,
  buildCarNetGainProjection,
  parseCarMoneyInput,
} from './carFinancingCalculations';

describe('car financing calculations', () => {
  it('parses formatted car money inputs', () => {
    expect(parseCarMoneyInput('52,500')).toBe(52500);
    expect(parseCarMoneyInput('5.49')).toBe(5.49);
    expect(parseCarMoneyInput(true)).toBe(0);
    expect(parseCarMoneyInput('not a number')).toBe(0);
  });

  it('estimates lease residual value from price, duration, and annual mileage', () => {
    expect(calculateEstimatedLeaseResidualValue({
      annualMileage: 12000,
      durationMonths: 36,
      vehiclePrice: 52500,
    })).toBe(26300);
  });

  it('lowers lease residual value when annual mileage increases', () => {
    const lowerMileageResidual = calculateEstimatedLeaseResidualValue({
      annualMileage: 10000,
      durationMonths: 36,
      vehiclePrice: 52500,
    });
    const higherMileageResidual = calculateEstimatedLeaseResidualValue({
      annualMileage: 30000,
      durationMonths: 36,
      vehiclePrice: 52500,
    });

    expect(higherMileageResidual).toBeLessThan(lowerMileageResidual);
  });

  it('returns zero estimated residual value for invalid lease inputs', () => {
    expect(calculateEstimatedLeaseResidualValue({
      annualMileage: 12000,
      durationMonths: 0,
      vehiclePrice: 52500,
    })).toBe(0);
    expect(calculateEstimatedLeaseResidualValue({
      annualMileage: 12000,
      durationMonths: 36,
      vehiclePrice: 0,
    })).toBe(0);
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
    expect(summary.durationMonths).toBe(36);
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
    expect(summary.durationMonths).toBe(60);
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

  it('builds monthly payment and cumulative interest projection points through the horizon', () => {
    const summary = calculateCreditSummary({
      annualInterestRate: 5.49,
      downPayment: 5250,
      durationMonths: 60,
      vehiclePrice: 52500,
    });
    const points = buildCarFinancingProjection({
      annualInterestRate: 5.49,
      horizonYears: 6,
      summary,
    });

    expect(points).toHaveLength(73);
    expect(points[0]).toEqual({
      cumulativeInterestCost: 0,
      monthlyInterestCost: 0,
      monthlyPayment: summary.monthlyPayment,
      monthlyPrincipalRepayment: 0,
      year: 0,
    });
    expect(points[60].monthlyPayment).toBeCloseTo(summary.monthlyPayment, 2);
    expect(points[1].monthlyInterestCost).toBeCloseTo(216.17, 2);
    expect(points[1].monthlyPrincipalRepayment).toBeCloseTo(summary.monthlyPayment - points[1].monthlyInterestCost, 2);
    expect(points[61].monthlyInterestCost).toBe(0);
    expect(points[60].cumulativeInterestCost).toBeCloseTo(summary.totalInterestCost, 2);
    expect(points[61].monthlyPayment).toBe(0);
    expect(points.at(-1)?.cumulativeInterestCost).toBeCloseTo(summary.totalInterestCost, 2);
  });

  it('builds cumulative net gain with credit depreciation and lease buyout depreciation', () => {
    const leasingSummary = calculateLeasingSummary({
      annualInterestRate: 5,
      downPayment: 10000,
      durationMonths: 12,
      residualValue: 10000,
      vehiclePrice: 50000,
    });
    const creditSummary = calculateCreditSummary({
      annualInterestRate: 5,
      downPayment: 10000,
      durationMonths: 12,
      vehiclePrice: 50000,
    });
    const points = buildCarNetGainProjection({
      creditAnnualTaxAdvantage: 1200,
      creditDownPayment: 10000,
      creditExpectedResaleValue: 24000,
      creditVehiclePrice: 50000,
      creditSummary,
      horizonYears: 2,
      leasingBuyoutOption: true,
      leasingDownPayment: 10000,
      leasingExpectedResaleValue: 24000,
      leasingResidualValue: 10000,
      leasingVehiclePrice: 50000,
      leasingSummary,
    });

    expect(points).toHaveLength(25);
    expect(points[0]).toEqual({ creditNetGain: 40000, leasingNetGain: -10000, year: 0 });
    expect(points[12].leasingNetGain).toBeCloseTo(37000 - 10000 - 10000 - leasingSummary.monthlyPayment * 12, 2);
    expect(points[24].leasingNetGain).toBeCloseTo(24000 - 10000 - 10000 - leasingSummary.monthlyPayment * 12, 2);
    expect(points[12].creditNetGain).toBeCloseTo(37000 - 10000 - creditSummary.monthlyPayment * 12 + 1200, 2);
    expect(points[24].creditNetGain).toBeCloseTo(24000 - 10000 - creditSummary.monthlyPayment * 12 + 2400, 2);
  });
});
