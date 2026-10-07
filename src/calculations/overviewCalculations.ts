import type { FinancialAsset } from '../finance';
import type { ProgressSettings, SavedProgressMonthlyRecords } from '../storage/progressStorage';
import { buildPlanProgressBaseline, buildSharedProgressAssets, getPlanProjectionBalances } from './progressPlanCalculations';
import {
  buildProgressChartData,
  calculateCurrentWealth,
  calculateProgressTargetPercent,
  calculateTotalBalance,
  findLatestProgressRecordOnOrBefore,
} from './progressCalculations';

export function calculateOverviewProgress({
  assets,
  projectionYears,
  planId,
  settings,
  monthlyRecords,
  currentDate,
}: {
  assets: FinancialAsset[];
  projectionYears: number;
  planId: string;
  settings: ProgressSettings;
  monthlyRecords: SavedProgressMonthlyRecords;
  currentDate: Date;
}) {
  const baseline = buildPlanProgressBaseline(settings.planStarts[planId], monthlyRecords, settings.initialBalances);
  const latestRecord = findLatestProgressRecordOnOrBefore(monthlyRecords, currentDate);
  const currentBalances = latestRecord?.record.balances ?? settings.initialBalances;
  const currentAssets = buildSharedProgressAssets(assets, currentBalances);
  const totalCurrentWealth = calculateCurrentWealth(currentAssets);
  const progressChartData = buildProgressChartData({
    actualPoints: [
      { date: baseline ? new Date(baseline.recordedAt) : currentDate, totalWealth: baseline?.totalWealth ?? totalCurrentWealth },
      ...Object.values(monthlyRecords).map((record) => ({
        date: new Date(record.recordedAt),
        totalWealth: calculateTotalBalance(record.balances),
      })),
    ],
    baselineDate: baseline ? new Date(baseline.recordedAt) : currentDate,
    baselineBalances: getPlanProjectionBalances(assets),
    optimisticAssets: assets,
    projectionYears,
  });
  const targetWealth = progressChartData.at(-1)?.plannedWealth ?? totalCurrentWealth;

  return {
    totalCurrentWealth,
    targetWealth,
    currentWealthProgressPercent: calculateProgressTargetPercent(totalCurrentWealth, targetWealth),
  };
}
