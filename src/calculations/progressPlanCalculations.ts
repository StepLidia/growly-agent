import type { FinancialAsset } from '../finance';
import type { ProgressStart, SavedProgressMonthlyRecords } from '../storage/progressStorage';
import { calculateTotalBalance, findLatestProgressRecordOnOrBefore } from './progressCalculations';

export type ProgressBaseline = ProgressStart & { balances: Record<string, number>; totalWealth: number };

export function getPlanProjectionBalances(assets: FinancialAsset[]): Record<string, number> {
  return Object.fromEntries(assets.map(({ id, amount }) => [id, Math.max(0, amount)]));
}

export function buildPlanProgressBaseline(
  start: ProgressStart | undefined,
  records: SavedProgressMonthlyRecords,
  initialBalances: Record<string, number>,
): ProgressBaseline | null {
  if (!start) {
    return null;
  }
  const record = findLatestProgressRecordOnOrBefore(records, new Date(start.recordedAt));
  const balances = record?.record.balances ?? initialBalances;
  return { ...start, balances, totalWealth: calculateTotalBalance(balances) };
}

export function buildSharedProgressAssets(assets: FinancialAsset[], balances: Record<string, number>): FinancialAsset[] {
  return assets.map((asset) => ({ ...asset, amount: balances[asset.id] ?? 0 }));
}
