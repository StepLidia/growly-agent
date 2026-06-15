import { CalendarDays, Leaf, PiggyBank, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  buildProgressChartData,
  calculateCurrentWealth,
  calculateProgressTargetPercent,
  calculateTotalBalance,
} from '../calculations/progressCalculations';
import { type calculateDashboard, type FinancialAsset } from '../finance';

type OverviewPageProps = {
  dashboard: ReturnType<typeof calculateDashboard>;
  projectionYears: number;
};

type ProgressBaseline = {
  balances: Record<string, number>;
  monthLabel: string;
  recordedAt: string;
  totalWealth: number;
};

type ProgressMonth = {
  key: string;
  label: string;
  shortLabel: string;
};

type ProgressMonthlyRecord = {
  monthLabel: string;
  recordedAt: string;
  balances: Record<string, number>;
};

type SavedProgressMonthlyRecords = Record<string, ProgressMonthlyRecord>;

const PROGRESS_BASELINE_STORAGE_KEY = 'growly-progress-baseline-v1';
const PROGRESS_MONTHLY_RECORD_STORAGE_KEY = 'growly-progress-monthly-record-v1';

const overviewCardStyles = [
  {
    id: 'projected',
    label: 'Total projected wealth',
    cardClass: 'border-sky-200/80 bg-sky-50/80',
    icon: Leaf,
    iconClass: 'text-sky-500',
    imagePosition: '18% 62%',
    labelClass: 'text-slate-800',
    valueClass: 'text-sky-700',
    washClass: 'bg-sky-50/60',
  },
  {
    id: 'current',
    label: 'Current wealth',
    cardClass: 'overview-current-card',
    icon: PiggyBank,
    iconClass: 'text-lime-700',
    imagePosition: '46% 58%',
    labelClass: 'text-slate-800',
    valueClass: 'overview-current-value',
    washClass: 'overview-current-wash',
  },
  {
    id: 'monthly',
    label: 'Monthly future building',
    cardClass: 'border-blue-200/80 bg-blue-50/80',
    icon: Wallet,
    iconClass: 'text-blue-500',
    imagePosition: '68% 62%',
    labelClass: 'text-slate-800',
    valueClass: 'text-blue-900',
    washClass: 'bg-blue-50/60',
  },
  {
    id: 'horizon',
    label: 'Planning horizon',
    cardClass: 'border-yellow-200/80 bg-yellow-50/80',
    icon: CalendarDays,
    iconClass: 'text-yellow-700',
    imagePosition: '88% 58%',
    labelClass: 'text-slate-800',
    valueClass: 'text-yellow-800',
    washClass: 'bg-yellow-50/60',
  },
] as const;

export function OverviewPage({ dashboard, projectionYears }: OverviewPageProps) {
  const currentDate = new Date();
  const currentProgressMonth = getProgressMonthFromDate(currentDate);
  const baseline = readSavedProgressBaseline();
  const monthlyRecords = readSavedProgressMonthlyRecords();
  const monthlyRecord = monthlyRecords[currentProgressMonth.key] ?? null;
  const currentAssets = getProgressCurrentAssets(dashboard.assets, monthlyRecord);
  const totalCurrentWealth = calculateCurrentWealth(currentAssets);
  const activeBaselineBalances = baseline?.balances ?? getProgressAssetBalances(currentAssets);
  const progressChartData = buildProgressChartData({
    actualPoints: getProgressActualPoints({
      baseline,
      currentDate,
      currentWealth: totalCurrentWealth,
      monthlyRecords,
    }),
    baselineDate: baseline ? new Date(baseline.recordedAt) : currentDate,
    baselineBalances: activeBaselineBalances,
    optimisticAssets: currentAssets,
    projectionYears,
  });
  const targetWealth = progressChartData.at(-1)?.plannedWealth ?? totalCurrentWealth;
  const currentWealthProgressPercent = calculateProgressTargetPercent(totalCurrentWealth, targetWealth);
  const monthlyFutureBuilding =
    dashboard.income.savingsContribution + dashboard.income.investmentContribution + dashboard.income.pillar3Contribution;
  const cards = [
    formatMoney(targetWealth),
    formatMoney(totalCurrentWealth),
    formatMoney(monthlyFutureBuilding),
    `${projectionYears} years`,
  ];

  return (
    <section
      className="relative flex min-h-152 flex-1 overflow-hidden rounded-lg border border-slate-200/60 bg-cover bg-bottom px-5 pt-6 pb-40 shadow-sm sm:pb-48 md:min-h-144 md:px-8 md:pt-5 md:pb-48 xl:pt-6 xl:pb-56"
      style={{ backgroundImage: 'url("/images/background.webp")' }}
    >
      <div className="absolute inset-0 bg-linear-to-br from-white/80 via-sky-50/60 to-yellow-50/64" aria-hidden="true" />
      <img
        className="rocking-grandma pointer-events-none absolute -bottom-3 left-2 z-20 w-64 object-contain opacity-75 drop-shadow-md saturate-65 sm:w-76 md:-left-9 md:w-84 xl:w-92 2xl:left-6"
        src="/images/grandma.webp"
        alt=""
        aria-hidden="true"
      />
      <div className="butterfly-corner-flight pointer-events-none absolute bottom-12 right-10 z-20 w-14 sm:bottom-14 sm:right-14 sm:w-16 md:bottom-16 md:right-18 xl:bottom-20 xl:right-24 xl:w-20" aria-hidden="true">
        <img
          className="butterfly-flutter block w-full object-contain opacity-100 drop-shadow-md saturate-150"
          src="/images/butterfly.webp"
          alt=""
        />
      </div>
      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-5 md:gap-7">
        <div className="max-w-4xl text-center mt-4">
          <h1 className="text-4xl font-bold tracking-normal text-slate-800 md:text-4xl 2xl:text-5xl">
            Track your financial future
          </h1>
          <p className="mt-5 text-lg font-bold text-slate-600 md:text-xl">
            Visualize today, plan for tomorrow, achieve your dreams
          </p>
        </div>

        <Link
          aria-label="Open financial details"
          className="w-full max-w-4xl rounded-lg transition hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-sky-700/30 xl:max-w-5xl"
          to="/details"
        >
          <div className="mx-auto rounded-lg border border-white/80 bg-white/50 p-3 shadow-xl shadow-slate-300/30 backdrop-blur-md md:p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 xl:gap-4">
              {overviewCardStyles.map(({ id, label, cardClass, icon: Icon, iconClass, imagePosition, labelClass, valueClass, washClass }, index) => (
                <div
                  key={label}
                  className={`relative min-h-48 overflow-hidden rounded-lg border ${cardClass} px-3 py-4 text-center shadow-md shadow-slate-300/30 backdrop-blur-sm xl:min-h-56 xl:px-4 xl:py-6`}
                >
                  <div
                    className="pointer-events-none absolute inset-0 bg-cover opacity-30"
                    aria-hidden="true"
                    style={{
                      backgroundImage: 'url("/images/background.webp")',
                      backgroundPosition: imagePosition,
                    }}
                  />
                  <div className={`pointer-events-none absolute inset-0 ${washClass}`} aria-hidden="true" />
                  <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-white/70 via-white/45 to-white/20" aria-hidden="true" />
                  <div className="relative flex h-full flex-col items-center justify-center gap-4">
                    {id === 'current' ? (
                      <CurrentWealthProgressRing
                        amount={cards[index]}
                        amountClassName={valueClass}
                        progressPercent={currentWealthProgressPercent}
                      />
                    ) : (
                      <>
                        <Icon className={`h-7 w-7 xl:h-8 xl:w-8 ${iconClass}`} strokeWidth={1.6} />
                        <p className={`text-sm font-bold leading-5 ${labelClass}`}>{label}</p>
                        <p className={`text-2xl font-black tracking-normal xl:text-3xl ${valueClass}`}>
                          {cards[index]}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}

function CurrentWealthProgressRing({
  amount,
  amountClassName,
  progressPercent,
}: {
  amount: string;
  amountClassName: string;
  progressPercent: number;
}) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const safeProgressPercent = Math.min(Math.max(progressPercent, 0), 100);
  const strokeDashoffset = circumference - (safeProgressPercent / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3 xl:gap-4">
      <div className="relative h-32 w-32 xl:h-36 xl:w-36">
        <svg className="h-32 w-32 -rotate-90 xl:h-36 xl:w-36" role="img" viewBox="0 0 112 112" aria-label={`${Math.round(safeProgressPercent)}% goal`}>
          <circle
            cx="56"
            cy="56"
            fill="none"
            r={radius}
            stroke="rgb(226 232 240)"
            strokeWidth="11"
          />
          <circle
            cx="56"
            cy="56"
            fill="none"
            r={radius}
            className="overview-current-ring"
            stroke="currentColor"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            strokeWidth="11"
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-2xl font-black tracking-normal text-slate-950 xl:text-3xl">{Math.round(safeProgressPercent)}%</p>
            <p className="overview-current-goal text-sm font-bold">goal</p>
          </div>
        </div>
      </div>
      <p className={`text-lg font-black tracking-normal ${amountClassName}`}>{amount}</p>
    </div>
  );
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(value))} CHF`;
}

function readSavedProgressBaseline(): ProgressBaseline | null {
  try {
    const savedValue = window.localStorage.getItem(PROGRESS_BASELINE_STORAGE_KEY);
    const baseline = savedValue ? JSON.parse(savedValue) : null;

    return isProgressBaseline(baseline) ? baseline : null;
  } catch {
    return null;
  }
}

function readSavedProgressMonthlyRecords(): SavedProgressMonthlyRecords {
  try {
    const savedValue = window.localStorage.getItem(PROGRESS_MONTHLY_RECORD_STORAGE_KEY);
    const records = savedValue ? JSON.parse(savedValue) : null;

    if (isProgressMonthlyRecord(records)) {
      return {
        [getProgressMonthFromDate(new Date(records.recordedAt)).key]: records,
      };
    }

    return isSavedProgressMonthlyRecords(records) ? records : {};
  } catch {
    return {};
  }
}

function getProgressCurrentAssets(assets: FinancialAsset[], monthlyRecord: ProgressMonthlyRecord | null) {
  if (!monthlyRecord) {
    return assets;
  }

  return assets.map((asset) => ({
    ...asset,
    amount: getSavedProgressBalance(monthlyRecord.balances[asset.id], asset.amount),
  }));
}

function getProgressAssetBalances(assets: FinancialAsset[]) {
  return Object.fromEntries(assets.map((asset) => [asset.id, Math.max(0, asset.amount)]));
}

function getProgressActualPoints({
  baseline,
  currentDate,
  currentWealth,
  monthlyRecords,
}: {
  baseline: ProgressBaseline | null;
  currentDate: Date;
  currentWealth: number;
  monthlyRecords: SavedProgressMonthlyRecords;
}) {
  const actualPoints = [
    {
      date: baseline ? new Date(baseline.recordedAt) : currentDate,
      totalWealth: baseline?.totalWealth ?? currentWealth,
    },
  ];

  Object.values(monthlyRecords).forEach((monthlyRecord) => {
    actualPoints.push({
      date: new Date(monthlyRecord.recordedAt),
      totalWealth: calculateTotalBalance(monthlyRecord.balances),
    });
  });

  return actualPoints;
}

function getSavedProgressBalance(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function getProgressMonthFromDate(date: Date) {
  return buildProgressMonth(date.getFullYear(), date.getMonth());
}

function buildProgressMonth(year: number, monthIndex: number): ProgressMonth {
  const date = new Date(year, monthIndex, 1);

  return {
    key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    label: formatProgressMonth(date),
    shortLabel: date.toLocaleDateString('en-US', {
      month: 'short',
    }),
  };
}

function formatProgressMonth(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function isProgressBaseline(value: unknown): value is ProgressBaseline {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const baseline = value as Partial<ProgressBaseline>;

  return (
    typeof baseline.monthLabel === 'string' &&
    typeof baseline.recordedAt === 'string' &&
    typeof baseline.totalWealth === 'number' &&
    Number.isFinite(baseline.totalWealth) &&
    isProgressBalanceRecord(baseline.balances)
  );
}

function isProgressMonthlyRecord(value: unknown): value is ProgressMonthlyRecord {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Partial<ProgressMonthlyRecord>;

  return (
    typeof record.monthLabel === 'string' &&
    typeof record.recordedAt === 'string' &&
    isProgressBalanceRecord(record.balances)
  );
}

function isSavedProgressMonthlyRecords(value: unknown): value is SavedProgressMonthlyRecords {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return Object.values(value).every(isProgressMonthlyRecord);
}

function isProgressBalanceRecord(value: unknown): value is Record<string, number> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return Object.values(value).every((balance) => typeof balance === 'number' && Number.isFinite(balance));
}
