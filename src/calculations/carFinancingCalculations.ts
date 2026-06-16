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
  monthlyPayment: number;
  year: number;
};

export function parseCarMoneyInput(value: string | boolean) {
  if (typeof value !== 'string') {
    return 0;
  }

  const parsedValue = Number(value.replace(/,/g, '').trim());

  return Number.isFinite(parsedValue) ? parsedValue : 0;
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
    if (month > 0 && month <= summary.durationMonths && balance > 0) {
      const interestCost = balance * monthlyRate;
      const principalPayment = Math.max(summary.monthlyPayment - interestCost, 0);

      cumulativeInterestCost += interestCost;
      balance = Math.max(balance - principalPayment, 0);
    }

    return {
      cumulativeInterestCost,
      monthlyPayment: month <= summary.durationMonths ? summary.monthlyPayment : 0,
      year: month / 12,
    };
  });
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

function normalizeMoney(value: number) {
  return Number.isFinite(value) ? Math.max(value, 0) : 0;
}

function normalizeDuration(value: number) {
  return Number.isFinite(value) ? Math.max(Math.round(value), 0) : 0;
}
