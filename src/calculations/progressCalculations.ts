export type ProgressAsset = {
  amount: number;
  monthlyContribution: number;
};

export type ProgressProjectionAsset = ProgressAsset & {
  annualReturn: number;
  id: string;
};

export type ProgressAssetTargetInput = ProgressProjectionAsset & {
  color: string;
  label: string;
};

export type ProgressAssetTargetBar = {
  color: string;
  currentWealth: number;
  id: string;
  label: string;
  progressPercent: number;
  progressYears: number;
  targetWealth: number;
};

export type ProgressVarianceRecord = {
  balances: Record<string, number>;
  recordedAt: string;
};

export type ProgressVariancePoint = {
  actualWealth: number;
  key: string;
  label: string;
  plannedWealth: number;
  sortValue: number;
  variance: number;
};

export type ProgressVarianceChart = {
  annualPoints: ProgressVariancePoint[];
  color: string;
  id: 'total' | 'pension' | 'liquid';
  monthlyPointsByYear: Record<string, ProgressVariancePoint[]>;
  title: string;
};

export type ProgressChartActualPoint = {
  date: Date;
  totalWealth: number;
};

export type LatestProgressRecordResult<TRecord> = {
  key: string;
  record: TRecord;
};

export type ProgressChartPoint = {
  actualWealth: number | null;
  monthLabel: string;
  negativeWealth: number;
  optimisticWealth: number;
  pessimisticWealth: number;
  plannedWealth: number;
  year: number;
};

export function calculateCurrentWealth(assets: ProgressAsset[]) {
  return assets.reduce((sum, asset) => sum + asset.amount, 0);
}

export function calculateMonthlyPlanContribution(assets: ProgressAsset[]) {
  return assets.reduce((sum, asset) => sum + asset.monthlyContribution, 0);
}

export function calculateMonthsTracked(startDate: Date, endDate: Date) {
  const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + endDate.getMonth() - startDate.getMonth();

  return Math.max(0, months);
}

export function calculateYearsTracked(monthsTracked: number) {
  return Math.round((monthsTracked / 12) * 10) / 10;
}

export function calculatePlannedWealth({
  baselineWealth,
  monthlyPlanContribution,
  monthsTracked,
}: {
  baselineWealth: number;
  monthlyPlanContribution: number;
  monthsTracked: number;
}) {
  return baselineWealth + monthlyPlanContribution * monthsTracked;
}

export function calculateProjectedPlannedWealth({
  assets,
  baselineBalances,
  monthsTracked,
}: {
  assets: ProgressProjectionAsset[];
  baselineBalances: Record<string, number>;
  monthsTracked: number;
}) {
  const safeMonthsTracked = Math.max(0, monthsTracked);
  const trackedYears = safeMonthsTracked / 12;
  const projectionYears = Math.max(1, Math.ceil(trackedYears));
  const plannedProjection = buildPlannedProgressProjection({
    assets,
    baselineBalances,
    projectionYears,
  });

  return interpolateProgressProjectionValue(plannedProjection, trackedYears);
}

export function calculateProgressDelta(currentWealth: number, plannedWealth: number) {
  return currentWealth - plannedWealth;
}

export function calculateProgressDeltaPercent(currentWealth: number, plannedWealth: number) {
  if (plannedWealth === 0) {
    return currentWealth === 0 ? 0 : 100;
  }

  return ((currentWealth - plannedWealth) / plannedWealth) * 100;
}

export function calculateProgressTargetPercent(currentWealth: number, targetWealth: number) {
  if (targetWealth <= 0) {
    return currentWealth > 0 ? 100 : 0;
  }

  return (Math.max(currentWealth, 0) / targetWealth) * 100;
}

export function calculateProgressTargetYears(currentWealth: number, targetWealth: number, projectionYears: number) {
  const safeProjectionYears = Math.max(0, Math.round(projectionYears));
  const progressRatio = Math.min(calculateProgressTargetPercent(currentWealth, targetWealth) / 100, 1);

  return progressRatio * safeProjectionYears;
}

export function calculateTotalBalance(balances: Record<string, number>) {
  return Object.values(balances).reduce((sum, balance) => sum + balance, 0);
}

export function findLatestProgressRecordOnOrBefore<TRecord extends { recordedAt: string }>(
  records: Record<string, TRecord>,
  referenceDate: Date,
): LatestProgressRecordResult<TRecord> | null {
  const referenceMonthValue = getProgressMonthSortValue(referenceDate);

  return Object.entries(records)
    .map(([key, record]) => ({
      key,
      monthValue: getProgressMonthSortValue(new Date(record.recordedAt)),
      record,
    }))
    .filter(({ monthValue }) => Number.isFinite(monthValue) && monthValue <= referenceMonthValue)
    .sort((first, second) => second.monthValue - first.monthValue)
    .map(({ key, record }) => ({ key, record }))
    .at(0) ?? null;
}

export function buildProgressAssetTargetBars({
  assets,
  baselineBalances,
  projectionYears,
}: {
  assets: ProgressAssetTargetInput[];
  baselineBalances: Record<string, number>;
  projectionYears: number;
}): ProgressAssetTargetBar[] {
  const safeProjectionYears = Math.max(0, Math.round(projectionYears));

  return assets.map((asset) => {
    const targetWealth = calculateAssetProjectionValue({
      annualReturnPercent: asset.annualReturn,
      monthlyContribution: asset.monthlyContribution,
      principal: getProgressAssetBaselineAmount(asset, baselineBalances),
      years: safeProjectionYears,
    });

    return {
      color: asset.color,
      currentWealth: asset.amount,
      id: asset.id,
      label: asset.label,
      progressPercent: calculateProgressTargetPercent(asset.amount, targetWealth),
      progressYears: calculateProgressTargetYears(asset.amount, targetWealth, safeProjectionYears),
      targetWealth,
    };
  });
}

export function buildProgressVarianceCharts({
  assets,
  baselineDate,
  baselineBalances,
  records,
}: {
  assets: ProgressAssetTargetInput[];
  baselineDate: Date;
  baselineBalances: Record<string, number>;
  records: ProgressVarianceRecord[];
}): ProgressVarianceChart[] {
  const groups: Array<Pick<ProgressVarianceChart, 'color' | 'id' | 'title'> & { assetIds: string[] }> = [
    { assetIds: assets.map((asset) => asset.id), color: 'blue', id: 'total', title: 'Total Wealth Variance' },
    { assetIds: ['pillar2', 'pillar3'], color: 'emerald', id: 'pension', title: 'Pension Wealth Variance' },
    { assetIds: ['savings', 'investments'], color: 'coral', id: 'liquid', title: 'Savings + Investments Variance' },
  ];

  return groups.map((group) => {
    const monthlyPoints = records
      .map((record) => buildProgressVariancePoint({
        assetIds: group.assetIds,
        assets,
        baselineDate,
        baselineBalances,
        record,
      }))
      .filter((point): point is ProgressVariancePoint => point !== null)
      .sort((first, second) => first.sortValue - second.sortValue);
    const monthlyPointsByYear = monthlyPoints.reduce<Record<string, ProgressVariancePoint[]>>((pointsByYear, point) => {
      const year = point.key.slice(0, 4);

      return {
        ...pointsByYear,
        [year]: [...(pointsByYear[year] ?? []), point],
      };
    }, {});
    const annualPoints = Object.entries(monthlyPointsByYear).map(([year, points]) => {
      const latestPoint = points.at(-1) ?? points[0];

      return {
        ...latestPoint,
        key: year,
        label: year,
      };
    });

    return {
      annualPoints,
      color: group.color,
      id: group.id,
      monthlyPointsByYear,
      title: group.title,
    };
  });
}

export function buildProgressChartData({
  actualPoints,
  baselineBalances,
  baselineDate,
  optimisticAssets,
  projectionYears,
}: {
  actualPoints: ProgressChartActualPoint[];
  baselineBalances: Record<string, number>;
  baselineDate: Date;
  optimisticAssets: ProgressProjectionAsset[];
  projectionYears: number;
}) {
  const safeProjectionYears = Math.max(1, Math.round(projectionYears));
  const plannedProjection = buildPlannedProgressProjection({
    assets: optimisticAssets,
    baselineBalances,
    projectionYears: safeProjectionYears,
  });
  const optimisticProjection = buildOptimisticProgressProjection({
    assets: optimisticAssets,
    baselineBalances,
    projectionYears: safeProjectionYears,
  });
  const negativeProjection = buildNegativeProgressProjection({
    assets: optimisticAssets,
    baselineBalances,
    projectionYears: safeProjectionYears,
  });
  const pessimisticProjection = buildPessimisticProgressProjection({
    assets: optimisticAssets,
    baselineBalances,
    projectionYears: safeProjectionYears,
  });
  const pointByYear = new Map<string, ProgressChartPoint>();

  function setPoint(year: number, actualWealth: number | null = null) {
    const safeYear = Math.max(0, Math.min(safeProjectionYears, year));
    const key = safeYear.toFixed(4);
    const existingPoint = pointByYear.get(key);
    const plannedWealth = interpolateProgressProjectionValue(plannedProjection, safeYear);

    pointByYear.set(key, {
      actualWealth: actualWealth ?? existingPoint?.actualWealth ?? null,
      monthLabel: formatProgressChartMonthLabel(addProgressMonths(baselineDate, Math.round(safeYear * 12))),
      negativeWealth: interpolateProgressProjectionValue(negativeProjection, safeYear),
      optimisticWealth: interpolateProgressProjectionValue(optimisticProjection, safeYear),
      pessimisticWealth: interpolateProgressProjectionValue(pessimisticProjection, safeYear),
      plannedWealth,
      year: safeYear,
    });
  }

  for (let month = 0; month <= safeProjectionYears * 12; month += 1) {
    setPoint(month / 12);
  }

  actualPoints.forEach((point) => {
    const monthsTracked = calculateMonthsTracked(baselineDate, point.date);
    const year = monthsTracked / 12;

    if (year <= safeProjectionYears) {
      setPoint(year, point.totalWealth);
    }
  });

  return [...pointByYear.values()].sort((a, b) => a.year - b.year);
}

function addProgressMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function getProgressMonthSortValue(date: Date) {
  return date.getFullYear() * 12 + date.getMonth();
}

function formatProgressChartMonthLabel(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function buildProgressVariancePoint({
  assetIds,
  assets,
  baselineDate,
  baselineBalances,
  record,
}: {
  assetIds: string[];
  assets: ProgressAssetTargetInput[];
  baselineDate: Date;
  baselineBalances: Record<string, number>;
  record: ProgressVarianceRecord;
}) {
  const recordedDate = new Date(record.recordedAt);
  const monthsTracked = calculateMonthsTracked(baselineDate, recordedDate);
  const yearsTracked = monthsTracked / 12;
  const groupAssets = assets.filter((asset) => assetIds.includes(asset.id));
  const actualWealth = assetIds.reduce((sum, assetId) => sum + (record.balances[assetId] ?? 0), 0);
  const plannedWealth = groupAssets.reduce((sum, asset) => {
    return sum + interpolateProgressAssetProjectionValue({
      asset,
      baselineAmount: getProgressAssetBaselineAmount(asset, baselineBalances),
      years: yearsTracked,
    });
  }, 0);

  if (!Number.isFinite(actualWealth) || !Number.isFinite(plannedWealth)) {
    return null;
  }

  return {
    actualWealth,
    key: `${recordedDate.getFullYear()}-${String(recordedDate.getMonth() + 1).padStart(2, '0')}`,
    label: recordedDate.toLocaleDateString('en-US', { month: 'short' }),
    plannedWealth,
    sortValue: recordedDate.getFullYear() * 12 + recordedDate.getMonth(),
    variance: actualWealth - plannedWealth,
  };
}

function interpolateProgressAssetProjectionValue({
  asset,
  baselineAmount,
  years,
}: {
  asset: ProgressProjectionAsset;
  baselineAmount: number;
  years: number;
}) {
  const safeYears = Math.max(0, years);
  const lowerYear = Math.floor(safeYears);
  const upperYear = Math.ceil(safeYears);
  const lowerValue = calculateAssetProjectionValue({
    annualReturnPercent: asset.annualReturn,
    monthlyContribution: asset.monthlyContribution,
    principal: baselineAmount,
    years: lowerYear,
  });
  const upperValue = calculateAssetProjectionValue({
    annualReturnPercent: asset.annualReturn,
    monthlyContribution: asset.monthlyContribution,
    principal: baselineAmount,
    years: upperYear,
  });

  if (lowerYear === upperYear) {
    return lowerValue;
  }

  return lowerValue + (upperValue - lowerValue) * (safeYears - lowerYear);
}

function interpolateProgressProjectionValue(points: Array<{ value: number; year: number }>, year: number) {
  const lowerPoint = [...points].reverse().find((point) => point.year <= year) ?? points[0];
  const upperPoint = points.find((point) => point.year >= year) ?? points.at(-1);

  if (!lowerPoint || !upperPoint) {
    return 0;
  }

  if (lowerPoint.year === upperPoint.year) {
    return lowerPoint.value;
  }

  const progress = (year - lowerPoint.year) / (upperPoint.year - lowerPoint.year);

  return lowerPoint.value + (upperPoint.value - lowerPoint.value) * progress;
}

export function buildPlannedProgressProjection({
  assets,
  baselineBalances,
  projectionYears,
}: {
  assets: ProgressProjectionAsset[];
  baselineBalances: Record<string, number>;
  projectionYears: number;
}) {
  return buildProgressProjectionWithReturns({
    assets,
    baselineBalances,
    getAnnualReturn: (asset) => asset.annualReturn,
    projectionYears,
  });
}

export function buildOptimisticProgressProjection({
  assets,
  baselineBalances,
  projectionYears,
}: {
  assets: ProgressProjectionAsset[];
  baselineBalances: Record<string, number>;
  projectionYears: number;
}) {
  return buildProgressProjectionWithReturns({
    assets,
    baselineBalances,
    getAnnualReturn: (asset) => (shouldBoostOptimisticReturn(asset.id) ? asset.annualReturn + 1 : asset.annualReturn),
    projectionYears,
  });
}

export function buildNegativeProgressProjection({
  assets,
  baselineBalances,
  projectionYears,
}: {
  assets: ProgressProjectionAsset[];
  baselineBalances: Record<string, number>;
  projectionYears: number;
}) {
  return buildProgressProjectionWithReturns({
    assets,
    baselineBalances,
    getAnnualReturn: (asset) => (shouldBoostOptimisticReturn(asset.id) ? asset.annualReturn - 1 : asset.annualReturn),
    projectionYears,
  });
}

export function buildPessimisticProgressProjection({
  assets,
  baselineBalances,
  projectionYears,
}: {
  assets: ProgressProjectionAsset[];
  baselineBalances: Record<string, number>;
  projectionYears: number;
}) {
  return buildProgressProjectionWithReturns({
    assets,
    baselineBalances,
    getAnnualReturn: () => 0,
    projectionYears,
  });
}

function buildProgressProjectionWithReturns({
  assets,
  baselineBalances,
  getAnnualReturn,
  projectionYears,
}: {
  assets: ProgressProjectionAsset[];
  baselineBalances: Record<string, number>;
  getAnnualReturn: (asset: ProgressProjectionAsset) => number;
  projectionYears: number;
}) {
  const safeProjectionYears = Math.max(1, Math.round(projectionYears));

  return Array.from({ length: safeProjectionYears + 1 }, (_, year) => ({
    value: assets.reduce((sum, asset) => {
      return sum + calculateAssetProjectionValue({
        annualReturnPercent: getAnnualReturn(asset),
        monthlyContribution: asset.monthlyContribution,
        principal: getProgressAssetBaselineAmount(asset, baselineBalances),
        years: year,
      });
    }, 0),
    year,
  }));
}

function getProgressAssetBaselineAmount(asset: ProgressProjectionAsset, baselineBalances: Record<string, number>) {
  const baselineBalance = baselineBalances[asset.id];

  if (typeof baselineBalance === 'number' && Number.isFinite(baselineBalance)) {
    return Math.max(0, baselineBalance);
  }

  return 0;
}

function calculateAssetProjectionValue({
  annualReturnPercent,
  monthlyContribution,
  principal,
  years,
}: {
  annualReturnPercent: number;
  monthlyContribution: number;
  principal: number;
  years: number;
}) {
  const safeYears = Math.max(0, Math.round(years));
  const yearlyRate = annualReturnPercent / 100;
  const yearlyContribution = Math.max(0, monthlyContribution) * 12;
  let value = Math.max(0, principal);

  for (let year = 0; year < safeYears; year += 1) {
    value = value * (1 + yearlyRate) + yearlyContribution;
  }

  return value;
}

function shouldBoostOptimisticReturn(assetId: string) {
  return assetId === 'investments' || assetId === 'pillar2' || assetId === 'pillar3';
}
