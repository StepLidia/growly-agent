export type CarFinancingInputs = {
  annualInterestRate: number;
  downPayment: number;
  durationMonths: number;
  residualValue?: number;
  vehiclePrice: number;
};

export type CarFinancingSummary = {
  durationYears: number;
  durationMonths: number;
  financedAmount: number;
  monthlyPayment: number;
  totalInterestCost: number;
};

export type CarFinancingProjectionPoint = {
  cumulativeInterestCost: number;
  monthlyInterestCost: number;
  monthlyPayment: number;
  monthlyPrincipalRepayment: number;
  year: number;
};

export type CarNetGainProjectionPoint = {
  creditNetGain: number;
  leasingNetGain: number;
  year: number;
};

export function parseCarMoneyInput(value: string | boolean) {
  if (typeof value !== 'string') {
    return 0;
  }

  const parsedValue = Number(value.replace(/,/g, '').trim());

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

export function calculateEstimatedLeaseResidualValue({
  annualMileage,
  durationMonths,
  vehiclePrice,
}: {
  annualMileage: number;
  durationMonths: number;
  vehiclePrice: number;
}) {
  const safeVehiclePrice = normalizeMoney(vehiclePrice);
  const safeDurationYears = normalizeDuration(durationMonths) / 12;

  if (safeVehiclePrice <= 0 || safeDurationYears <= 0) {
    return 0;
  }

  const annualDepreciationRate = calculateLeaseDepreciationRate(annualMileage);
  const residualValue = safeVehiclePrice * (1 - annualDepreciationRate) ** safeDurationYears;

  return roundToNearest(residualValue, 50);
}

export function calculateLeasingSummary(inputs: CarFinancingInputs): CarFinancingSummary {
  const vehiclePrice = normalizeMoney(inputs.vehiclePrice);
  const downPayment = normalizeMoney(inputs.downPayment);
  const residualValue = normalizeMoney(inputs.residualValue ?? 0);
  const durationMonths = normalizeDuration(inputs.durationMonths);
  const financedAmount = Math.max(vehiclePrice - downPayment - residualValue, 0);

  return calculateFinancingSummary({
    annualInterestRate: inputs.annualInterestRate,
    durationMonths,
    financedAmount,
  });
}

export function calculateCreditSummary(inputs: CarFinancingInputs): CarFinancingSummary {
  const vehiclePrice = normalizeMoney(inputs.vehiclePrice);
  const downPayment = normalizeMoney(inputs.downPayment);
  const durationMonths = normalizeDuration(inputs.durationMonths);
  const financedAmount = Math.max(vehiclePrice - downPayment, 0);

  return calculateFinancingSummary({
    annualInterestRate: inputs.annualInterestRate,
    durationMonths,
    financedAmount,
  });
}

function calculateFinancingSummary({
  annualInterestRate,
  durationMonths,
  financedAmount,
}: {
  annualInterestRate: number;
  durationMonths: number;
  financedAmount: number;
}): CarFinancingSummary {
  const safeDurationMonths = normalizeDuration(durationMonths);
  const safeFinancedAmount = normalizeMoney(financedAmount);
  const monthlyPayment = calculateMonthlyPayment({
    annualInterestRate,
    durationMonths: safeDurationMonths,
    principal: safeFinancedAmount,
  });

  return {
    durationYears: safeDurationMonths / 12,
    durationMonths: safeDurationMonths,
    financedAmount: safeFinancedAmount,
    monthlyPayment,
    totalInterestCost: Math.max(monthlyPayment * safeDurationMonths - safeFinancedAmount, 0),
  };
}

export function buildCarFinancingProjection({
  annualInterestRate,
  horizonYears,
  summary,
}: {
  annualInterestRate: number;
  horizonYears: number;
  summary: CarFinancingSummary;
}): CarFinancingProjectionPoint[] {
  const horizonMonths = normalizeDuration(horizonYears * 12);
  const monthlyRate = Math.max(annualInterestRate, 0) / 100 / 12;
  let balance = summary.financedAmount;
  let cumulativeInterestCost = 0;

  return Array.from({ length: horizonMonths + 1 }, (_, month) => {
    let monthlyInterestCost = 0;
    let monthlyPrincipalRepayment = 0;

    if (month > 0 && month <= summary.durationMonths && balance > 0) {
      const interestCost = balance * monthlyRate;
      const principalPayment = Math.max(summary.monthlyPayment - interestCost, 0);

      monthlyInterestCost = interestCost;
      monthlyPrincipalRepayment = principalPayment;
      cumulativeInterestCost += interestCost;
      balance = Math.max(balance - principalPayment, 0);
    }

    return {
      cumulativeInterestCost,
      monthlyInterestCost,
      monthlyPayment: month <= summary.durationMonths ? summary.monthlyPayment : 0,
      monthlyPrincipalRepayment,
      year: month / 12,
    };
  });
}

export function buildCarNetGainProjection({
  creditAnnualTaxAdvantage,
  creditExpectedResaleValue,
  creditDownPayment,
  creditVehiclePrice,
  creditSummary,
  horizonYears,
  leasingBuyoutOption,
  leasingDownPayment,
  leasingExpectedResaleValue,
  leasingResidualValue,
  leasingVehiclePrice,
  leasingSummary,
}: {
  creditAnnualTaxAdvantage: number;
  creditExpectedResaleValue: number;
  creditDownPayment: number;
  creditVehiclePrice: number;
  creditSummary: CarFinancingSummary;
  horizonYears: number;
  leasingBuyoutOption: boolean;
  leasingDownPayment: number;
  leasingExpectedResaleValue: number;
  leasingResidualValue: number;
  leasingVehiclePrice: number;
  leasingSummary: CarFinancingSummary;
}): CarNetGainProjectionPoint[] {
  const horizonMonths = normalizeDuration(horizonYears * 12);
  const safeCreditResaleValue = normalizeMoney(creditExpectedResaleValue);
  const safeCreditDownPayment = normalizeMoney(creditDownPayment);
  const safeCreditVehiclePrice = normalizeMoney(creditVehiclePrice);
  const safeCreditTaxAdvantagePerMonth = normalizeMoney(creditAnnualTaxAdvantage) / 12;
  const safeLeasingDownPayment = normalizeMoney(leasingDownPayment);
  const safeLeasingResaleValue = normalizeMoney(leasingExpectedResaleValue);
  const safeLeasingResidualValue = normalizeMoney(leasingResidualValue);
  const safeLeasingVehiclePrice = normalizeMoney(leasingVehiclePrice);

  return Array.from({ length: horizonMonths + 1 }, (_, month) => {
    const creditPaidMonths = Math.min(month, creditSummary.durationMonths);
    const leasingPaidMonths = Math.min(month, leasingSummary.durationMonths);
    const creditOwnershipEquity = calculateLinearValue({
      endValue: safeCreditResaleValue,
      horizonMonths,
      month,
      startValue: safeCreditVehiclePrice,
    });
    const leasingBuyoutEquity = leasingBuyoutOption && month >= leasingSummary.durationMonths
      ? calculateLinearValue({
        endValue: safeLeasingResaleValue,
        horizonMonths,
        month,
        startValue: safeLeasingVehiclePrice,
      }) - safeLeasingResidualValue
      : 0;

    return {
      creditNetGain:
        creditOwnershipEquity
        - safeCreditDownPayment
        - creditSummary.monthlyPayment * creditPaidMonths
        + safeCreditTaxAdvantagePerMonth * month,
      leasingNetGain:
        -safeLeasingDownPayment
        + leasingBuyoutEquity
        - leasingSummary.monthlyPayment * leasingPaidMonths,
      year: month / 12,
    };
  });
}

function calculateLinearValue({
  endValue,
  horizonMonths,
  month,
  startValue,
}: {
  endValue: number;
  horizonMonths: number;
  month: number;
  startValue: number;
}) {
  if (horizonMonths <= 0) {
    return endValue;
  }

  const progress = Math.min(Math.max(month / horizonMonths, 0), 1);

  return startValue + (endValue - startValue) * progress;
}

function calculateMonthlyPayment({
  annualInterestRate,
  durationMonths,
  principal,
}: {
  annualInterestRate: number;
  durationMonths: number;
  principal: number;
}) {
  if (principal <= 0 || durationMonths <= 0) {
    return 0;
  }

  const monthlyRate = Math.max(annualInterestRate, 0) / 100 / 12;

  if (monthlyRate === 0) {
    return principal / durationMonths;
  }

  const compoundFactor = (1 + monthlyRate) ** durationMonths;

  return principal * ((monthlyRate * compoundFactor) / (compoundFactor - 1));
}

function calculateLeaseDepreciationRate(annualMileage: number) {
  const baselineAnnualMileage = 15000;
  const baseAnnualDepreciationRate = 0.215;
  const depreciationMileageStep = 0.003;
  const safeAnnualMileage = normalizeMoney(annualMileage);
  const mileageAdjustment = ((safeAnnualMileage - baselineAnnualMileage) / 1000) * depreciationMileageStep;

  return clamp(baseAnnualDepreciationRate + mileageAdjustment, 0.1, 0.35);
}

function roundToNearest(value: number, step: number) {
  return Math.round(value / step) * step;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeMoney(value: number) {
  return Number.isFinite(value) ? Math.max(value, 0) : 0;
}

function normalizeDuration(value: number) {
  return Number.isFinite(value) ? Math.max(Math.round(value), 0) : 0;
}
