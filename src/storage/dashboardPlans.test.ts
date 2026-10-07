import { describe, expect, it } from 'vitest';
import { calculateDashboard } from '../finance';
import {
  createBlankDashboardPlan,
  restoreDashboardPlans,
  serializeDashboardPlans,
  updateActiveDashboardPlan,
} from './dashboardPlans';

describe('dashboard plans', () => {
  it('starts with one Plan A when there are no saved inputs', () => {
    const state = restoreDashboardPlans(null);

    expect(state.plans).toHaveLength(1);
    expect(state.activePlanId).toBe(state.plans[0].id);
    expect(state.plans[0].name).toBe('Plan A');
    expect(state.plans[0].assets.find(({ id }) => id === 'savings')?.amount).toBe(25000);
  });

  it('migrates all legacy inputs into Plan A without losing zero or negative returns', () => {
    const state = restoreDashboardPlans({
      assets: {
        savings: { amount: 0, monthlyContribution: 120, annualReturn: 0 },
        investments: { amount: 45000, monthlyContribution: 500, annualReturn: -2 },
        pillar2: { amount: 20000, monthlyContribution: 500, annualReturn: 1 },
        pillar3: { amount: 15000, monthlyContribution: 1000, annualReturn: 2 },
      },
      income: { monthlyNetIncome: 7250 },
      projectionYears: 80,
    });
    const plan = state.plans[0];

    expect(plan.name).toBe('Plan A');
    expect(plan.assets.map(({ amount, monthlyContribution, annualReturn }) => ({ amount, monthlyContribution, annualReturn }))).toEqual([
      { amount: 0, monthlyContribution: 120, annualReturn: 0 },
      { amount: 45000, monthlyContribution: 500, annualReturn: -2 },
      { amount: 20000, monthlyContribution: 500, annualReturn: 1 },
      { amount: 15000, monthlyContribution: 1000, annualReturn: 2 },
    ]);
    expect(plan.income.monthlyNetIncome).toBe(7250);
    expect(plan.projectionYears).toBe(80);
  });

  it('creates a blank plan with every numerical input and calculated total at zero', () => {
    const plan = createBlankDashboardPlan('b', 'Plan B');

    for (const asset of plan.assets) {
      expect([asset.amount, asset.monthlyContribution, asset.annualReturn, asset.years]).toEqual([0, 0, 0, 0]);
    }
    expect(Object.values(plan.income).every((value) => value === 0)).toBe(true);
    expect(plan.projectionYears).toBe(0);
    const dashboard = calculateDashboard(plan.assets, plan.income, plan.projectionYears);
    expect(dashboard.totalWealth).toBe(0);
    expect(dashboard.totalProjection).toEqual([{ year: 0, value: 0 }]);
  });

  it('updates only the active plan and restores each plan after switching', () => {
    const original = restoreDashboardPlans(null);
    const blank = createBlankDashboardPlan('b', 'Plan B');
    const state = { activePlanId: blank.id, plans: [...original.plans, blank] };
    const edited = updateActiveDashboardPlan(state, (plan) => ({
      ...plan,
      assets: plan.assets.map((asset) => ({ ...asset, amount: 100, monthlyContribution: 10, annualReturn: 1 })),
      income: { ...plan.income, monthlyNetIncome: 500 },
      projectionYears: 80,
    }));

    expect(edited.plans[0]).toBe(original.plans[0]);
    expect(state.plans[1]).toEqual(blank);
    expect(edited.plans[1].assets.every(({ amount }) => amount === 100)).toBe(true);
    expect(edited.plans[1].income.monthlyNetIncome).toBe(500);
    expect(edited.plans[1].projectionYears).toBe(80);
    const switched = { ...edited, activePlanId: original.activePlanId };
    expect(switched.plans.find(({ id }) => id === switched.activePlanId)).toEqual(original.plans[0]);
  });

  it('persists all plans, renamed titles, zero values, and the selected plan through JSON', () => {
    const original = restoreDashboardPlans(null);
    const blank = createBlankDashboardPlan('b', 'Retirement');
    const state = { activePlanId: blank.id, plans: [...original.plans, blank] };

    expect(restoreDashboardPlans(JSON.parse(serializeDashboardPlans(state)))).toEqual(state);
  });

  it('recovers a valid selection and ignores duplicate or invalid plan IDs', () => {
    const state = restoreDashboardPlans({
      activePlanId: 'missing',
      plans: [{ id: 'a', name: 'First' }, { id: 'a', name: 'Duplicate' }, null, { id: 5 }],
    });

    expect(state.plans).toHaveLength(1);
    expect(state.activePlanId).toBe('a');
    expect(state.plans[0].name).toBe('First');
    expect(restoreDashboardPlans({ plans: [] }).plans[0].name).toBe('Plan A');
  });
});
