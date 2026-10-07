import { assets as initialAssets, incomePlan, type FinancialAsset, type IncomePlan } from '../finance';

export const DASHBOARD_STORAGE_KEY = 'growly-dashboard-inputs-v1';

export type DashboardPlan = {
  id: string;
  name: string;
  assets: FinancialAsset[];
  income: IncomePlan;
  projectionYears: number;
};

export type DashboardPlansState = {
  activePlanId: string;
  plans: DashboardPlan[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function savedNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function restorePlan(value: unknown, id: string, name: string): DashboardPlan {
  const saved = asRecord(value);
  const savedAssets = asRecord(saved.assets);
  const savedIncome = asRecord(saved.income);
  const projectionYears = savedNumber(saved.projectionYears, 30);

  return {
    id,
    name,
    assets: initialAssets.map((asset) => {
      const savedAsset = asRecord(savedAssets[asset.id]);

      return {
        ...asset,
        years: projectionYears,
        amount: savedNumber(savedAsset.amount, asset.amount),
        monthlyContribution: savedNumber(savedAsset.monthlyContribution, asset.monthlyContribution),
        annualReturn: savedNumber(savedAsset.annualReturn, asset.annualReturn),
      };
    }),
    income: {
      monthlyNetIncome: savedNumber(savedIncome.monthlyNetIncome, incomePlan.monthlyNetIncome),
      savingsContribution: savedNumber(savedIncome.savingsContribution, incomePlan.savingsContribution),
      investmentContribution: savedNumber(savedIncome.investmentContribution, incomePlan.investmentContribution),
      pillar3Contribution: savedNumber(savedIncome.pillar3Contribution, incomePlan.pillar3Contribution),
      otherExpenses: savedNumber(savedIncome.otherExpenses, incomePlan.otherExpenses),
    },
    projectionYears,
  };
}

export function restoreDashboardPlans(value: unknown): DashboardPlansState {
  const saved = asRecord(value);
  const plans: DashboardPlan[] = [];

  if (Array.isArray(saved.plans)) {
    for (const entry of saved.plans) {
      const plan = asRecord(entry);
      if (typeof plan.id !== 'string' || !plan.id || plans.some(({ id }) => id === plan.id)) {
        continue;
      }
      const name = typeof plan.name === 'string' && plan.name.trim() ? plan.name.trim() : 'Untitled plan';
      plans.push(restorePlan(plan, plan.id, name));
    }
  }

  if (!plans.length) {
    plans.push(restorePlan(saved, 'plan-a', 'Plan A'));
  }

  return {
    plans,
    activePlanId: plans.find(({ id }) => id === saved.activePlanId)?.id ?? plans[0].id,
  };
}

export function serializeDashboardPlans(state: DashboardPlansState) {
  return JSON.stringify({
    activePlanId: state.activePlanId,
    plans: state.plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      assets: Object.fromEntries(plan.assets.map(({ id, amount, monthlyContribution, annualReturn }) => [
        id, { amount, monthlyContribution, annualReturn },
      ])),
      income: plan.income,
      projectionYears: plan.projectionYears,
    })),
  });
}

export function readDashboardPlans(): DashboardPlansState {
  try {
    const saved = window.localStorage.getItem(DASHBOARD_STORAGE_KEY);
    return restoreDashboardPlans(saved ? JSON.parse(saved) : null);
  } catch {
    return restoreDashboardPlans(null);
  }
}

export function saveDashboardPlans(state: DashboardPlansState) {
  try {
    window.localStorage.setItem(DASHBOARD_STORAGE_KEY, serializeDashboardPlans(state));
  } catch {
    // Keep plans usable when browser storage is unavailable.
  }
}

export function createBlankDashboardPlan(id: string, name: string): DashboardPlan {
  return {
    id,
    name,
    assets: initialAssets.map((asset) => ({ ...asset, amount: 0, monthlyContribution: 0, annualReturn: 0, years: 0 })),
    income: { monthlyNetIncome: 0, savingsContribution: 0, investmentContribution: 0, pillar3Contribution: 0, otherExpenses: 0 },
    projectionYears: 0,
  };
}

export function updateActiveDashboardPlan(state: DashboardPlansState, update: (plan: DashboardPlan) => DashboardPlan) {
  return {
    ...state,
    plans: state.plans.map((plan) => plan.id === state.activePlanId ? update(plan) : plan),
  };
}
