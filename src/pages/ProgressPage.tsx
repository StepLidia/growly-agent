import { useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  LabelList,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowLeft,
  CalendarDays,
  CalendarCheck2,
  CheckCircle2,
  ChevronDown,
  Coins,
  Info,
  ListChecks,
  Pencil,
  RefreshCcw,
  Save,
  Sparkles,
  TrendingUp,
  Trash2,
  ZoomOut,
  type LucideIcon,
} from 'lucide-react';
import { colorClasses } from '../constants/colors';
import { buttonClasses } from '../constants/buttonStyles';
import {
  buildProgressAssetTargetBars,
  buildProgressChartData,
  buildProgressVarianceCharts,
  calculateCurrentWealth,
  calculateMonthsTracked,
  calculateProgressDelta,
  calculateProgressDeltaPercent,
  calculateProjectedPlannedWealth,
  calculateProgressTargetPercent,
  calculateTotalBalance,
  calculateYearsTracked,
} from '../calculations/progressCalculations';
import { hoverTooltipClasses, tooltipContentClasses } from '../constants/tooltipStyles';
import { currency, type FinancialAsset } from '../finance';
import { Header } from '../components/Header';
import { MonthPicker } from '../components/MonthPicker';
import { YearPicker } from '../components/YearPicker';
import { useEditableNumber } from '../hooks/useEditableNumber';

const PROGRESS_BASELINE_STORAGE_KEY = 'growly-progress-baseline-v1';
const PROGRESS_MONTHLY_RECORD_STORAGE_KEY = 'growly-progress-monthly-record-v1';

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

type ProgressZoomDomain = {
  x: [number, number];
  y: [number, number];
};

type ProgressZoomSelection = {
  endX: number;
  endY: number;
  startX: number;
  startY: number;
};

type ProgressChartPlotBounds = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

type ProgressChartPointerPoint = {
  x: number;
  y: number;
};

const PROGRESS_CHART_VALUE_KEYS = [
  'actualWealth',
  'negativeWealth',
  'optimisticWealth',
  'pessimisticWealth',
  'plannedWealth',
] as const;
const PROGRESS_CHART_MARGIN = { top: 14, right: 16, bottom: 6, left: -4 };
const PROGRESS_CHART_Y_AXIS_WIDTH = 58;

export function ProgressPage({
  assets,
  projectionYears,
}: {
  assets: FinancialAsset[];
  projectionYears: number;
}) {
  const [baseline, setBaseline] = useState<ProgressBaseline | null>(readSavedProgressBaseline);
  const [monthlyRecords, setMonthlyRecords] = useState<SavedProgressMonthlyRecords>(readSavedProgressMonthlyRecords);
  const currentDate = useMemo(() => new Date(), []);
  const currentProgressMonth = useMemo(() => getProgressMonthFromDate(currentDate), [currentDate]);
  const monthlyRecord = monthlyRecords[currentProgressMonth.key] ?? null;
  const [assetBalances, setAssetBalances] = useState(() => getInitialProgressAssetBalances(assets, monthlyRecord));
  const currentAssets = useMemo(() => getProgressCurrentAssets(assets, monthlyRecord), [assets, monthlyRecord]);
  const currentMonthLabel = formatProgressMonth(currentDate);
  const currentWealth = calculateCurrentWealth(currentAssets);
  const activeBaselineBalances = baseline?.balances ?? getProgressAssetBalances(currentAssets);
  const monthsTracked = baseline ? calculateMonthsTracked(new Date(baseline.recordedAt), currentDate) : 0;
  const yearsTracked = calculateYearsTracked(monthsTracked);
  const plannedWealth = baseline
    ? calculateProjectedPlannedWealth({
      assets: currentAssets,
      baselineBalances: activeBaselineBalances,
      monthsTracked,
    })
    : currentWealth;
  const progressDelta = calculateProgressDelta(currentWealth, plannedWealth);
  const progressDeltaPercent = calculateProgressDeltaPercent(currentWealth, plannedWealth);
  const progressChartData = buildProgressChartData({
    actualPoints: getProgressActualPoints({
      baseline,
      currentDate,
      currentWealth,
      monthlyRecords,
    }),
    baselineDate: baseline ? new Date(baseline.recordedAt) : currentDate,
    baselineBalances: activeBaselineBalances,
    optimisticAssets: currentAssets,
    projectionYears,
  });
  const progressVarianceCharts = buildProgressVarianceCharts({
    assets: currentAssets,
    baselineDate: baseline ? new Date(baseline.recordedAt) : currentDate,
    baselineBalances: activeBaselineBalances,
    records: Object.values(monthlyRecords),
  });

  function recordBaseline() {
    const balances = getProgressAssetBalances(currentAssets);
    const nextBaseline = {
      balances,
      monthLabel: currentMonthLabel,
      recordedAt: getProgressMonthDate(currentProgressMonth).toISOString(),
      totalWealth: calculateTotalBalance(balances),
    };

    setBaseline(nextBaseline);
    saveProgressBaseline(nextBaseline);
  }

  function updateAssetBalance(assetId: string, value: number) {
    setAssetBalances((currentBalances) => ({
      ...currentBalances,
      [assetId]: value,
    }));
  }

  useEffect(() => {
    setAssetBalances(getInitialProgressAssetBalances(assets, monthlyRecord));
  }, [assets, monthlyRecord]);

  function saveMonthlyRecord() {
    const nextRecord = {
      monthLabel: currentMonthLabel,
      recordedAt: getProgressMonthDate(currentProgressMonth).toISOString(),
      balances: assetBalances,
    };

    const nextRecords = {
      ...monthlyRecords,
      [currentProgressMonth.key]: nextRecord,
    };

    setMonthlyRecords(nextRecords);
    saveProgressMonthlyRecords(nextRecords);
  }

  function saveAllMonthlyRecords(nextRecords: SavedProgressMonthlyRecords) {
    setMonthlyRecords(nextRecords);
    saveProgressMonthlyRecords(nextRecords);
  }

  return (
    <>
      <Header
        title="Wealth progress"
        subtitle="Track your actual wealth over time and compare it to your plan"
        showActions={false}
      />
      <div className="mt-5 grid min-w-0 gap-3 md:grid-cols-2 2xl:grid-cols-4">
        <BaselineCard
          assets={currentAssets}
          baseline={baseline}
          currentMonthLabel={currentMonthLabel}
          monthlyRecords={monthlyRecords}
          onBaselineChange={(nextBaseline) => {
            setBaseline(nextBaseline);
            saveProgressBaseline(nextBaseline);
          }}
          onRecord={recordBaseline}
        />
        <ProgressMetricCard
          icon={TrendingUp}
          iconClassName="bg-emerald-500/12 text-emerald-600"
          title={progressDelta >= 0 ? 'Ahead of Plan' : 'Behind Plan'}
          value={`${formatSignedCurrency(progressDelta)} CHF`}
          helper={`${formatSignedPercent(progressDeltaPercent)} vs plan`}
          helperClassName={progressDelta >= 0 ? 'text-emerald-600' : 'text-red-500'}
        />
        <ProgressMetricCard
          icon={CalendarDays}
          iconClassName="bg-blue-600/10 text-blue-600"
          title="Years Tracked"
          value={yearsTracked.toFixed(1)}
          helper="of your journey"
          helperClassName="text-blue-600"
        />
        <ProgressMetricCard
          icon={Coins}
          iconClassName="bg-amber-500/12 text-amber-500"
          title="Current Wealth"
          value={`${currency(currentWealth)} CHF`}
          helper={`as of ${currentMonthLabel}`}
          helperClassName="text-amber-500"
        />
      </div>
      <div className="mt-3 grid min-w-0 gap-3 md:grid-cols-2 2xl:grid-cols-[minmax(0,2fr)_minmax(22rem,1fr)]">
        <MonthlyAssetBalancesCard
          assets={assets}
          balances={assetBalances}
          currentMonthLabel={currentMonthLabel}
          savedMonthLabel={monthlyRecord?.monthLabel}
          onBalanceChange={updateAssetBalance}
          onSave={saveMonthlyRecord}
        />
        <HowProgressWorksCard />
      </div>
      <div className="mt-3 grid min-w-0 gap-3 2xl:grid-cols-[minmax(0,2fr)_minmax(22rem,1fr)]">
        <ProgressWealthChartCard
          currentWealth={currentWealth}
          data={progressChartData}
          projectionYears={projectionYears}
        />
        <ProgressAssetTargetBarsCard
          assets={currentAssets}
          baselineBalances={activeBaselineBalances}
          projectionYears={projectionYears}
        />
      </div>
      <div className="mt-3 grid min-w-0 gap-3 xl:grid-cols-3">
        {progressVarianceCharts.map((chart) => (
          <ProgressVarianceChartCard key={chart.id} chart={chart} />
        ))}
      </div>
      <div className="mt-3">
        <ProgressMonthlyRecordsEditor
          assets={assets}
          currentDate={currentDate}
          records={monthlyRecords}
          onSave={saveAllMonthlyRecords}
        />
      </div>
    </>
  );
}

function BaselineCard({
  assets,
  baseline,
  currentMonthLabel,
  monthlyRecords,
  onBaselineChange,
  onRecord,
}: {
  assets: FinancialAsset[];
  baseline: ProgressBaseline | null;
  currentMonthLabel: string;
  monthlyRecords: SavedProgressMonthlyRecords;
  onBaselineChange: (baseline: ProgressBaseline) => void;
  onRecord: () => void;
}) {
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const selectedMonth = baseline ? getProgressMonthFromDate(new Date(baseline.recordedAt)) : getCurrentProgressMonth();

  function resetBaselineMonth(month: ProgressMonth) {
    const balances = getProgressBaselineBalances({
      assets,
      savedRecord: monthlyRecords[month.key],
    });

    onBaselineChange({
      balances,
      monthLabel: month.label,
      recordedAt: getProgressMonthDate(month).toISOString(),
      totalWealth: calculateTotalBalance(balances),
    });
    setIsMonthPickerOpen(false);
  }

  return (
    <section className={`glass-panel flex w-full min-w-0 flex-col p-5 ${isMonthPickerOpen ? 'z-30' : ''}`}>
      <div className="glass-panel-floating-layer flex items-start gap-4">
        <span className="group relative">
          <button
            className={`grid h-16 w-16 shrink-0 place-items-center rounded-full border bg-white transition hover:scale-102 hover:bg-white focus:outline-none focus:ring-4 ${baseline
              ? 'border-blue-300 text-blue-700 shadow-sm shadow-blue-500/15 focus:ring-blue-500/20'
              : 'pulse-red-border border-slate-950 focus:ring-red-500/20'
              }`}
            aria-controls={baseline ? 'progress-baseline-month-picker' : undefined}
            aria-describedby="progress-baseline-tooltip"
            aria-expanded={baseline ? isMonthPickerOpen : undefined}
            aria-label={baseline ? 'Reset baseline' : 'Start tracking'}
            type="button"
            onClick={baseline ? () => setIsMonthPickerOpen((isOpen) => !isOpen) : onRecord}
          >
            {baseline ? (
              <RefreshCcw className="h-7 w-7" />
            ) : (
              <span className="h-7 w-7 rounded-full bg-red-500 shadow-sm shadow-red-500/40" />
            )}
          </button>
          {baseline && isMonthPickerOpen && (
            <MonthPicker
              buildMonth={buildProgressMonth}
              className="left-0 top-20"
              id="progress-baseline-month-picker"
              selectedMonth={selectedMonth}
              onMonthChange={resetBaselineMonth}
            />
          )}
          <span
            id="progress-baseline-tooltip"
            role="tooltip"
            className={hoverTooltipClasses('bottom-20 left-1/2 w-max -translate-x-1/2 whitespace-nowrap px-3 py-2')}
          >
            {baseline ? 'Reset baseline' : 'Start tracking'}
          </span>
        </span>
        <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-bold leading-5 text-slate-950">{baseline ? 'Started' : 'Start'}</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">{baseline?.monthLabel ?? currentMonthLabel}</p>
          </div>
          {baseline && (
            <div className="flex w-fit shrink-0 items-center gap-2 rounded-full border border-emerald-300/50 bg-emerald-500/12 px-3 py-1 text-sm font-bold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Baseline set
            </div>
          )}
        </div>
      </div>
      <p className="mt-4 max-w-xs wrap-break-word text-sm leading-6 text-slate-700">
        Your asset values of this month are used as the starting point for progress tracking.
      </p>
    </section>
  );
}

function MonthlyAssetBalancesCard({
  assets,
  balances,
  className = '',
  currentMonthLabel,
  savedMonthLabel,
  onBalanceChange,
  onSave,
}: {
  assets: FinancialAsset[];
  balances: Record<string, number>;
  className?: string;
  currentMonthLabel: string;
  savedMonthLabel?: string;
  onBalanceChange: (assetId: string, value: number) => void;
  onSave: () => void;
}) {
  return (
    <section className={`glass-panel w-full min-w-0 p-5 ${className}`}>
      <div className="flex min-w-0 items-center gap-3">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl border ${colorClasses.violet.border} ${colorClasses.violet.bg} ${colorClasses.violet.text}`}>
          <Pencil className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-950">Record Current Month ({currentMonthLabel})</h2>
        </div>
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-600">
        Enter your current asset balances to save your progress
      </p>
      <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-4 2xl:gap-5">
        {assets.map((asset) => (
          <ProgressAssetBalanceField
            key={asset.id}
            asset={asset}
            value={balances[asset.id] ?? asset.amount}
            onChange={(value) => onBalanceChange(asset.id, value)}
          />
        ))}
      </div>
      <div className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          {savedMonthLabel ? `Last saved for ${savedMonthLabel}` : 'No monthly record saved yet'}
        </p>
        <button
          className={buttonClasses()}
          type="button"
          onClick={onSave}
        >
          <Save className="h-4 w-4" />
          Save
        </button>
      </div>
    </section>
  );
}

function ProgressAssetBalanceField({
  asset,
  value,
  onChange,
}: {
  asset: FinancialAsset;
  value: number;
  onChange: (value: number) => void;
}) {
  const colors = colorClasses[asset.color];
  const { inputValue, onInputChange } = useEditableNumber(value, onChange, { format: 'money' });

  return (
    <label className="flex min-w-0 flex-col gap-2 rounded-lg border border-slate-300/30 bg-white/20 p-3">
      <span className="flex min-w-0 items-center justify-end gap-2 text-sm font-bold text-slate-700">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colors.bg} ring-4 ring-white`} style={{ backgroundColor: colors.stroke }} />
        <span className="min-w-0">
          <span className="block truncate">{asset.label}</span>
        </span>
      </span>
      <span className="glass-input flex w-full min-w-0 items-center gap-2 py-2 text-sm">
        <input
          aria-label={`${asset.label} current balance`}
          className="min-w-0 flex-1 bg-transparent text-right font-black text-slate-950 outline-none"
          inputMode="numeric"
          type="text"
          value={inputValue}
          onChange={(event) => onInputChange(event.currentTarget.value)}
        />
        <span className="font-semibold text-slate-600">CHF</span>
      </span>
    </label>
  );
}

function HowProgressWorksCard({ className = '' }: { className?: string }) {
  const steps = [
    {
      color: colorClasses.blue.text,
      icon: CalendarCheck2,
      label: 'Set a baseline month',
    },
    {
      color: colorClasses.violet.text,
      icon: ListChecks,
      label: 'Add your actual balances each month',
    },
    {
      color: colorClasses.emerald.text,
      icon: TrendingUp,
      label: 'Compare actual vs. projected wealth',
    },
    {
      color: colorClasses.coral.text,
      icon: Sparkles,
      label: 'Stay on track and achieve your goals',
    },
  ];

  return (
    <section className={`glass-panel flex h-full w-full min-w-0 flex-col p-5 ${className}`}>
      <div className="flex items-center gap-3">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl border ${colorClasses.cyan.border} ${colorClasses.cyan.bg} ${colorClasses.cyan.text}`}>
          <Info className="h-5 w-5" />
        </div>
        <h2 className="text-sm font-bold text-slate-950">How it works</h2>
      </div>
      <div className="mt-5 flex flex-1 flex-col gap-2">
        {steps.map(({ color, icon: Icon, label }) => (
          <div key={label} className="flex min-w-0 items-center gap-3 text-sm font-medium text-slate-700">
            <span className="grid h-9 w-9 shrink-0 place-items-center">
              <Icon className={`h-5 w-5 ${color}`} />
            </span>
            <span className="min-w-0">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProgressWealthChartCard({
  className = '',
  currentWealth,
  data,
  projectionYears,
}: {
  className?: string;
  currentWealth: number;
  data: ReturnType<typeof buildProgressChartData>;
  projectionYears: number;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [zoomDomain, setZoomDomain] = useState<ProgressZoomDomain | null>(null);
  const [zoomHistory, setZoomHistory] = useState<Array<ProgressZoomDomain | null>>([]);
  const [zoomSelection, setZoomSelection] = useState<ProgressZoomSelection | null>(null);
  const safeProjectionYears = Math.max(1, Math.round(projectionYears));
  const xDomain = zoomDomain?.x ?? [0, safeProjectionYears];
  const yDomain = zoomDomain?.y ?? buildProgressChartYDomain(data, xDomain);
  const plotBounds = getProgressChartPlotBounds(chartRef.current);
  const selectionBox = zoomSelection ? getProgressZoomSelectionBox(zoomSelection) : null;
  const targetProjectedWealth = data.at(-1)?.plannedWealth ?? currentWealth;
  const targetPercent = calculateProgressTargetPercent(currentWealth, targetProjectedWealth);

  function startZoomSelection(event: PointerEvent<HTMLDivElement>) {
    const nextPoint = getProgressChartPointerPoint(event, chartRef.current);

    if (!nextPoint) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setZoomSelection({
      endX: nextPoint.x,
      endY: nextPoint.y,
      startX: nextPoint.x,
      startY: nextPoint.y,
    });
  }

  function updateZoomSelection(event: PointerEvent<HTMLDivElement>) {
    const nextPoint = getProgressChartPointerPoint(event, chartRef.current);

    if (!nextPoint) {
      return;
    }

    setZoomSelection((currentSelection) => (
      currentSelection ? { ...currentSelection, endX: nextPoint.x, endY: nextPoint.y } : currentSelection
    ));
  }

  function commitZoomSelection() {
    if (!zoomSelection || !plotBounds) {
      setZoomSelection(null);
      return;
    }

    const selectionWidth = Math.abs(zoomSelection.endX - zoomSelection.startX);
    const selectionHeight = Math.abs(zoomSelection.endY - zoomSelection.startY);
    setZoomSelection(null);

    if (selectionWidth < 8 || selectionHeight < 8) {
      return;
    }

    if (isProgressZoomOutSelection(zoomSelection)) {
      setZoomDomain(zoomHistory.at(-1) ?? null);
      setZoomHistory((currentHistory) => currentHistory.slice(0, -1));
      return;
    }

    const nextZoomDomain = getProgressChartZoomDomainFromSelection(zoomSelection, plotBounds, xDomain, yDomain);

    if (nextZoomDomain.x[1] - nextZoomDomain.x[0] < 0.05 || nextZoomDomain.y[1] - nextZoomDomain.y[0] < 1) {
      return;
    }

    setZoomHistory((currentHistory) => [...currentHistory, zoomDomain]);
    setZoomDomain(nextZoomDomain);
  }

  return (
    <section className={`glass-panel w-full min-w-0 p-5 ${className}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-950">Actual vs Planned Wealth</h2>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            Compare saved monthly balances with your planned wealth path
          </p>
        </div>
        {zoomDomain && (
          <button
            className={buttonClasses({ className: 'md:self-start' })}
            type="button"
            onClick={() => {
              setZoomDomain(null);
              setZoomHistory([]);
            }}
          >
            <ZoomOut className="h-4 w-4" />
            Reset zoom
          </button>
        )}
      </div>
      <ProgressChartLegend />
      <div
        ref={chartRef}
        className="relative mt-3 h-80 w-full min-w-0 cursor-crosshair select-none touch-none"
        onPointerDown={startZoomSelection}
        onPointerLeave={() => setZoomSelection(null)}
        onPointerMove={updateZoomSelection}
        onPointerUp={commitZoomSelection}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={PROGRESS_CHART_MARGIN}
          >
            <defs>
              <linearGradient id="progress-planned-gradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={colorClasses.blue.stroke} stopOpacity={0.22} />
                <stop offset="52%" stopColor={colorClasses.blue.stroke} stopOpacity={0.1} />
                <stop offset="100%" stopColor={colorClasses.blue.stroke} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(100,116,139,.18)" strokeDasharray="0" vertical={false} />
            <XAxis
              allowDataOverflow
              axisLine={false}
              dataKey="year"
              domain={xDomain}
              interval="preserveStartEnd"
              tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
              tickFormatter={formatProgressYearAxis}
              tickLine={false}
              ticks={buildProgressYearTicks(safeProjectionYears, xDomain)}
              type="number"
            />
            <YAxis
              allowDataOverflow
              axisLine={false}
              domain={yDomain}
              tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
              tickFormatter={formatChartAxisValue}
              tickLine={false}
              width={58}
            />
            <Tooltip
              content={<ProgressChartTooltip />}
              cursor={{ stroke: colorClasses.blue.stroke, strokeDasharray: '3 5', strokeOpacity: 0.45, strokeWidth: 1.5 }}
              isAnimationActive={false}
              wrapperStyle={{ outline: 'none', pointerEvents: 'none' }}
            />
            <Area
              activeDot={{ r: 5, fill: colorClasses.blue.stroke, stroke: 'white', strokeWidth: 2 }}
              dataKey="plannedWealth"
              dot={false}
              fill="url(#progress-planned-gradient)"
              isAnimationActive={false}
              name="Planned"
              stroke={colorClasses.blue.stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              type="monotone"
            />
            <Line
              activeDot={{ r: 5, fill: colorClasses.emerald.stroke, stroke: 'white', strokeWidth: 2 }}
              connectNulls
              dataKey="actualWealth"
              dot={{ fill: colorClasses.emerald.stroke, r: 4, stroke: 'white', strokeWidth: 2 }}
              isAnimationActive={false}
              name="Actual"
              stroke={colorClasses.emerald.stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              type="monotone"
            />
            <Line
              activeDot={{ r: 5, fill: '#64748b', stroke: 'white', strokeWidth: 2 }}
              dataKey="optimisticWealth"
              dot={false}
              isAnimationActive={false}
              name="Optimistic"
              stroke="#64748b"
              strokeDasharray="3 5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              type="monotone"
            />
            <Line
              activeDot={{ r: 5, fill: colorClasses.coral.stroke, stroke: 'white', strokeWidth: 2 }}
              dataKey="negativeWealth"
              dot={false}
              isAnimationActive={false}
              name="Negative"
              stroke={colorClasses.coral.stroke}
              strokeDasharray="2 6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              type="monotone"
            />
            <Line
              activeDot={{ r: 5, fill: '#94a3b8', stroke: 'white', strokeWidth: 2 }}
              dataKey="pessimisticWealth"
              dot={false}
              isAnimationActive={false}
              name="No return"
              stroke="#94a3b8"
              strokeDasharray="2 6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              type="monotone"
            />
          </AreaChart>
        </ResponsiveContainer>
        <ProgressTargetOverlay
          currentWealth={currentWealth}
          percent={targetPercent}
          targetWealth={targetProjectedWealth}
        />
        {selectionBox && (
          <div
            className="pointer-events-none absolute rounded border border-blue-500/70 bg-blue-500/10"
            style={{
              left: `${selectionBox.left}px`,
              top: `${selectionBox.top}px`,
              height: `${selectionBox.height}px`,
              width: `${selectionBox.width}px`,
            }}
          />
        )}
      </div>
    </section>
  );
}

function ProgressChartLegend() {
  const items = [
    { color: colorClasses.blue.stroke, label: 'Planned' },
    { color: colorClasses.emerald.stroke, label: 'Actual' },
    { color: '#64748b', dashed: true, label: 'Optimistic (+1%)' },
    { color: colorClasses.coral.stroke, dashed: true, label: 'Negative (-1%)' },
    { color: '#94a3b8', dashed: true, label: 'No return (0%)' },
  ];

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-bold text-slate-700">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-2">
          <span
            className={`h-0.5 w-7 rounded-full ${item.dashed ? 'bg-repeat-x' : ''}`}
            style={{
              backgroundColor: item.dashed ? undefined : item.color,
              backgroundImage: item.dashed ? `linear-gradient(to right, ${item.color} 0 45%, transparent 45% 100%)` : undefined,
              backgroundSize: item.dashed ? '8px 2px' : undefined,
            }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function ProgressTargetOverlay({
  currentWealth,
  percent,
  targetWealth,
}: {
  currentWealth: number;
  percent: number;
  targetWealth: number;
}) {
  const displayPercent = Math.round(percent);
  const ringPercent = Math.min(Math.max(percent, 0), 100);
  const radius = 34;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - ringPercent / 100);

  return (
    <div className="pointer-events-none absolute left-16 top-4 z-10 hidden w-72 items-center gap-3 rounded-lg bg-white/10 p-2 shadow-lg shadow-slate-400/10 backdrop-blur-md sm:flex">
      <div className="relative h-20 w-20 shrink-0">
        <svg className="h-20 w-20 -rotate-90" viewBox="0 0 88 88" aria-hidden="true">
          <circle
            cx="44"
            cy="44"
            fill="none"
            r={radius}
            stroke="#e5eaf2"
            strokeWidth={strokeWidth}
          />
          <circle
            cx="44"
            cy="44"
            fill="none"
            r={radius}
            stroke={colorClasses.emerald.stroke}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            strokeWidth={strokeWidth}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-lg font-semibold leading-5 text-slate-950">{displayPercent}%</p>
            <p className="text-sm font-medium leading-3 text-emerald-600">goal</p>
          </div>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-4 text-slate-600">Current Wealth</p>
        <p className="mt-0.5 text-base font-semibold leading-5 tracking-normal text-slate-950">
          {currency(currentWealth)} <span className="text-sm font-semibold">CHF</span>
        </p>
        <p className="mt-1 text-sm font-semibold leading-4 text-blue-600">
          Goal {currency(targetWealth)} CHF
        </p>
      </div>
    </div>
  );
}

function getProgressChartPlotBounds(element: HTMLDivElement | null): ProgressChartPlotBounds | null {
  if (!element) {
    return null;
  }

  const rect = element.getBoundingClientRect();
  const left = Math.max(PROGRESS_CHART_Y_AXIS_WIDTH + PROGRESS_CHART_MARGIN.left, 0);
  const right = Math.max(left + 1, rect.width - PROGRESS_CHART_MARGIN.right);
  const top = PROGRESS_CHART_MARGIN.top;
  const bottom = Math.max(top + 1, rect.height - PROGRESS_CHART_MARGIN.bottom);

  return {
    bottom,
    height: bottom - top,
    left,
    right,
    top,
    width: right - left,
  };
}

function getProgressChartPointerPoint(
  event: PointerEvent<HTMLDivElement>,
  element: HTMLDivElement | null,
): ProgressChartPointerPoint | null {
  const bounds = getProgressChartPlotBounds(element);

  if (!element || !bounds) {
    return null;
  }

  const rect = element.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  return {
    x: clampNumber(x, bounds.left, bounds.right),
    y: clampNumber(y, bounds.top, bounds.bottom),
  };
}

function getProgressZoomSelectionBox(selection: ProgressZoomSelection) {
  const left = Math.min(selection.startX, selection.endX);
  const top = Math.min(selection.startY, selection.endY);

  return {
    height: Math.abs(selection.endY - selection.startY),
    left,
    top,
    width: Math.abs(selection.endX - selection.startX),
  };
}

function isProgressZoomOutSelection(selection: ProgressZoomSelection) {
  return selection.endX < selection.startX && selection.endY < selection.startY;
}

function getProgressChartZoomDomainFromSelection(
  selection: ProgressZoomSelection,
  plotBounds: ProgressChartPlotBounds,
  currentDomain: [number, number],
  currentYDomain: [number, number],
): ProgressZoomDomain {
  const minX = Math.min(selection.startX, selection.endX);
  const maxX = Math.max(selection.startX, selection.endX);
  const minY = Math.min(selection.startY, selection.endY);
  const maxY = Math.max(selection.startY, selection.endY);
  const [minYear, maxYear] = currentDomain;
  const [minValue, maxValue] = currentYDomain;
  const yearRange = maxYear - minYear;
  const valueRange = maxValue - minValue;
  const startRatio = (minX - plotBounds.left) / plotBounds.width;
  const endRatio = (maxX - plotBounds.left) / plotBounds.width;
  const topRatio = (minY - plotBounds.top) / plotBounds.height;
  const bottomRatio = (maxY - plotBounds.top) / plotBounds.height;

  return {
    x: [
      minYear + startRatio * yearRange,
      minYear + endRatio * yearRange,
    ],
    y: [
      maxValue - bottomRatio * valueRange,
      maxValue - topRatio * valueRange,
    ],
  };
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function buildProgressChartYDomain(
  data: ReturnType<typeof buildProgressChartData>,
  xDomain: [number, number],
): [number, number] {
  const [minYear, maxYear] = xDomain;
  const valuesAtVisiblePoints = data
    .filter((point) => point.year >= minYear && point.year <= maxYear)
    .flatMap((point) => PROGRESS_CHART_VALUE_KEYS.map((key) => point[key]))
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const valuesAtDomainEdges = [
    ...getProgressChartValuesAtYear(data, minYear),
    ...getProgressChartValuesAtYear(data, maxYear),
  ];
  const values = [...valuesAtVisiblePoints, ...valuesAtDomainEdges];

  if (values.length === 0) {
    return [0, 1];
  }

  const maxValue = Math.max(...values);
  const paddedMax = maxValue + Math.max(maxValue * 0.08, 1);

  return [0, paddedMax];
}

function getProgressChartValuesAtYear(data: ReturnType<typeof buildProgressChartData>, year: number) {
  const lowerPoint = [...data].reverse().find((point) => point.year <= year) ?? data[0];
  const upperPoint = data.find((point) => point.year >= year) ?? data.at(-1);

  if (!lowerPoint || !upperPoint) {
    return [];
  }

  return PROGRESS_CHART_VALUE_KEYS.map((key) => {
    const lowerValue = lowerPoint[key];
    const upperValue = upperPoint[key];

    if (typeof lowerValue !== 'number' || typeof upperValue !== 'number') {
      return null;
    }

    if (lowerPoint.year === upperPoint.year) {
      return lowerValue;
    }

    const progress = (year - lowerPoint.year) / (upperPoint.year - lowerPoint.year);

    return lowerValue + (upperValue - lowerValue) * progress;
  }).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
}

function ProgressChartTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: number | string;
  payload?: Array<{
    color?: string;
    dataKey?: string | number;
    name?: string;
    payload?: ReturnType<typeof buildProgressChartData>[number];
    value?: number | null;
  }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const values = payload.filter((item) => typeof item.value === 'number');

  if (values.length === 0) {
    return null;
  }

  return (
    <div className={tooltipContentClasses('px-3 py-2')}>
      <p className="mb-2 font-bold text-slate-950">
        {payload[0]?.payload?.monthLabel ?? formatProgressChartTooltipLabel(Number(label ?? 0))}
      </p>
      {values.map((item) => (
        <p key={`${item.name}-${item.dataKey}`} className="text-slate-700">
          <span className="font-semibold" style={{ color: item.color }}>
            {item.name}:
          </span>{' '}
          {currency(item.value ?? 0)} CHF
        </p>
      ))}
    </div>
  );
}

function ProgressAssetTargetBarsCard({
  assets,
  baselineBalances,
  projectionYears,
}: {
  assets: FinancialAsset[];
  baselineBalances: Record<string, number>;
  projectionYears: number;
}) {
  const bars = buildProgressAssetTargetBars({ assets, baselineBalances, projectionYears });
  const safeProjectionYears = Math.max(1, Math.round(projectionYears));

  return (
    <section className="glass-panel w-full min-w-0 p-5">
      <div>
        <h2 className="text-sm font-bold text-slate-950">Asset Goal Progress</h2>
        <p className="mt-1 text-sm font-semibold text-slate-600">
          Current asset value vs projected value
        </p>
      </div>
      <div className="mt-4 h-80 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={bars}
            layout="vertical"
            margin={{ top: 8, right: 44, bottom: 10, left: 4 }}
          >
            <defs>
              {bars.map((bar) => (
                <linearGradient key={bar.id} id={getProgressAssetBarGradientId(bar.id)} x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor={getProgressAssetBarColor(bar.color)} stopOpacity={0.38} />
                  <stop offset="70%" stopColor={getProgressAssetBarColor(bar.color)} stopOpacity={0.82} />
                  <stop offset="100%" stopColor={getProgressAssetBarColor(bar.color)} stopOpacity={0.96} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke="rgba(100,116,139,.16)" strokeDasharray="0" horizontal={false} />
            <XAxis
              axisLine={false}
              domain={[0, safeProjectionYears]}
              tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
              tickFormatter={(value) => `${value}y`}
              tickLine={false}
              ticks={buildProgressYearTicks(safeProjectionYears)}
              type="number"
            />
            <YAxis
              axisLine={false}
              dataKey="label"
              tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }}
              tickFormatter={formatProgressAssetBarLabel}
              tickLine={false}
              type="category"
              width={72}
            />
            <Tooltip
              content={<ProgressAssetTargetBarsTooltip />}
              cursor={{ fill: 'rgba(15,23,42,.04)' }}
              isAnimationActive={false}
              wrapperStyle={{ outline: 'none', pointerEvents: 'none' }}
            />
            <Bar
              dataKey="progressYears"
              isAnimationActive={false}
              name="Current vs projected"
              radius={[0, 8, 8, 0]}
            >
              {bars.map((bar) => (
                <Cell key={bar.id} fill={`url(#${getProgressAssetBarGradientId(bar.id)})`} />
              ))}
              <LabelList content={(props) => renderProgressAssetBarPercentLabel(props, bars)} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function getProgressAssetBarColor(color: string) {
  return color in colorClasses ? colorClasses[color as keyof typeof colorClasses].stroke : colorClasses.blue.stroke;
}

function getProgressAssetBarGradientId(assetId: string) {
  return `progress-asset-target-${assetId}`;
}

function renderProgressAssetBarPercentLabel({
  height,
  index,
  width,
  x,
  y,
}: {
  height?: number | string;
  index?: number | string;
  width?: number | string;
  x?: number | string;
  y?: number | string;
}, bars: ReturnType<typeof buildProgressAssetTargetBars>) {
  const bar = bars[Number(index)];

  if (!bar) {
    return null;
  }

  const labelX = Number(x ?? 0) + Number(width ?? 0) + 8;
  const labelY = Number(y ?? 0) + Number(height ?? 0) / 2 + 4;

  return (
    <text
      fill={getProgressAssetBarColor(bar.color)}
      fontSize={13}
      fontWeight={700}
      textAnchor="start"
      x={labelX}
      y={labelY}
    >
      {Math.round(bar.progressPercent)}%
    </text>
  );
}

function formatProgressAssetBarLabel(label: string) {
  return label
    .replace('Savings Account', 'Savings')
    .replace('BVG (2nd Pillar)', '2nd Pillar')
    .replace('3rd Pillar', '3rd Pillar');
}

function ProgressAssetTargetBarsTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: ReturnType<typeof buildProgressAssetTargetBars>[number] }>;
}) {
  const bar = payload?.[0]?.payload;

  if (!active || !bar) {
    return null;
  }

  return (
    <div className={tooltipContentClasses('px-3 py-2')}>
      <p className="font-bold text-slate-950">{bar.label}</p>
      <p className="mt-2 text-slate-700">
        Current: <span className="font-semibold">{currency(bar.currentWealth)} CHF</span>
      </p>
      <p className="text-slate-700">
        Projected: <span className="font-semibold">{currency(bar.targetWealth)} CHF</span>
      </p>
      <p className="text-slate-700">
        Progress: <span className="font-semibold">{bar.progressPercent.toFixed(1)}%</span>
      </p>
    </div>
  );
}

function ProgressVarianceChartCard({
  chart,
}: {
  chart: ReturnType<typeof buildProgressVarianceCharts>[number];
}) {
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const visiblePoints = selectedYear ? chart.monthlyPointsByYear[selectedYear] ?? [] : chart.annualPoints;
  const maxAbsVariance = Math.max(...visiblePoints.map((point) => Math.abs(point.variance)), 1);
  const yLimit = buildProgressVarianceAxisLimit(maxAbsVariance);
  const yTicks = buildProgressVarianceTicks(yLimit);
  const gradientPrefix = `progress-variance-${chart.id}`;

  return (
    <section className="glass-panel w-full min-w-0 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-950">
            {selectedYear ? `${selectedYear} Monthly Variance` : chart.title}
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-600">Actual vs plan</p>
        </div>
        {selectedYear && (
          <button
            className={buttonClasses({ size: 'icon' })}
            aria-label="Back to annual variance"
            type="button"
            onClick={() => setSelectedYear(null)}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="mt-4 h-64 w-full min-w-0">
        {visiblePoints.length === 0 ? (
          <div className="grid h-full place-items-center rounded-lg border border-slate-300/30 bg-white/30 text-center text-sm font-semibold text-slate-500">
            Save monthly progress to see variance
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={visiblePoints} margin={{ top: 22, right: 10, bottom: 8, left: -6 }}>
              <defs>
                <linearGradient id={`${gradientPrefix}-positive`} x1="0" x2="0" y1="1" y2="0">
                  <stop offset="0%" stopColor={colorClasses.emerald.stroke} stopOpacity={0.38} />
                  <stop offset="70%" stopColor={colorClasses.emerald.stroke} stopOpacity={0.82} />
                  <stop offset="100%" stopColor={colorClasses.emerald.stroke} stopOpacity={0.96} />
                </linearGradient>
                <linearGradient id={`${gradientPrefix}-negative`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.38} />
                  <stop offset="70%" stopColor="#ef4444" stopOpacity={0.82} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.96} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(100,116,139,.16)" strokeDasharray="0" vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="label"
                tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                domain={[-yLimit, yLimit]}
                tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                tickFormatter={formatSignedChartAxisValue}
                tickLine={false}
                ticks={yTicks}
                width={54}
              />
              <ReferenceLine y={0} stroke="rgba(71,85,105,.38)" strokeWidth={1} />
              <Tooltip
                content={<ProgressVarianceTooltip canDrillDown={!selectedYear} />}
                cursor={{ fill: 'rgba(15,23,42,.04)' }}
                isAnimationActive={false}
                wrapperStyle={{ outline: 'none', pointerEvents: 'none' }}
              />
              <Bar
                dataKey="variance"
                isAnimationActive={false}
                name="Variance"
                radius={[7, 7, 7, 7]}
                onClick={(point) => {
                  if (!selectedYear && point?.key) {
                    setSelectedYear(String(point.key));
                  }
                }}
              >
                {visiblePoints.map((point) => (
                  <Cell
                    key={point.key}
                    cursor={selectedYear ? 'default' : 'pointer'}
                    fill={`url(#${gradientPrefix}-${point.variance >= 0 ? 'positive' : 'negative'})`}
                  />
                ))}
                <LabelList content={renderProgressVarianceBarLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

function renderProgressVarianceBarLabel({
  height,
  value,
  width,
  x,
  y,
}: {
  height?: number | string;
  value?: unknown;
  width?: number | string;
  x?: number | string;
  y?: number | string;
}) {
  const variance = Number(value ?? 0);
  const labelX = Number(x ?? 0) + Number(width ?? 0) / 2;
  const labelY = variance >= 0 ? Number(y ?? 0) - 6 : Number(y ?? 0) + Number(height ?? 0) + 14;

  return (
    <text
      fill={variance >= 0 ? colorClasses.emerald.stroke : '#ef4444'}
      fontSize={11}
      fontWeight={700}
      textAnchor="middle"
      x={labelX}
      y={labelY}
    >
      {formatSignedCompactCurrency(variance)}
    </text>
  );
}

function ProgressVarianceTooltip({
  active,
  canDrillDown,
  payload,
}: {
  active?: boolean;
  canDrillDown?: boolean;
  payload?: Array<{ payload?: ReturnType<typeof buildProgressVarianceCharts>[number]['annualPoints'][number] }>;
}) {
  const point = payload?.[0]?.payload;

  if (!active || !point) {
    return null;
  }

  return (
    <div className={tooltipContentClasses('px-3 py-2')}>
      <p className="font-bold text-slate-950">{point.label}</p>
      <p className="mt-2 text-slate-700">
        Actual: <span className="font-semibold">{currency(point.actualWealth)} CHF</span>
      </p>
      <p className="text-slate-700">
        Plan: <span className="font-semibold">{currency(point.plannedWealth)} CHF</span>
      </p>
      <p className={point.variance >= 0 ? 'text-emerald-700' : 'text-red-500'}>
        Variance: <span className="font-semibold">{formatSignedCurrency(point.variance)} CHF</span>
      </p>
      {canDrillDown && (
        <p className="mt-2 text-sm font-semibold text-slate-500">Click bar for monthly view</p>
      )}
    </div>
  );
}

function buildProgressVarianceAxisLimit(maxAbsVariance: number) {
  const paddedValue = Math.max(maxAbsVariance * 1.25, 1);
  const magnitude = 10 ** Math.floor(Math.log10(paddedValue));
  const normalized = paddedValue / magnitude;
  const niceNormalized = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

  return niceNormalized * magnitude;
}

function buildProgressVarianceTicks(limit: number) {
  return [-limit, -limit / 2, 0, limit / 2, limit];
}

function ProgressMonthlyRecordsEditor({
  assets,
  currentDate,
  records,
  onSave,
}: {
  assets: FinancialAsset[];
  currentDate: Date;
  records: SavedProgressMonthlyRecords;
  onSave: (records: SavedProgressMonthlyRecords) => void;
}) {
  const [selectedYear, setSelectedYear] = useState(() => String(currentDate.getFullYear()));
  const [draftRecords, setDraftRecords] = useState(records);
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const onSaveRef = useRef(onSave);
  const shouldSkipAutosaveRef = useRef(true);
  const months = Array.from({ length: 12 }, (_, monthIndex) => buildProgressMonth(Number(selectedYear), monthIndex));

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    shouldSkipAutosaveRef.current = true;
    setDraftRecords(records);
  }, [records]);

  useEffect(() => {
    if (shouldSkipAutosaveRef.current) {
      shouldSkipAutosaveRef.current = false;
      return;
    }

    const autosaveTimeout = window.setTimeout(() => {
      onSaveRef.current(removeEmptyProgressMonthlyRecords(draftRecords));
    }, 400);

    return () => window.clearTimeout(autosaveTimeout);
  }, [draftRecords]);

  function updateDraftBalance(month: ProgressMonth, assetId: string, value: number) {
    setDraftRecords((currentRecords) => {
      const currentRecord = currentRecords[month.key] ?? buildEmptyProgressMonthlyRecord(month, assets);

      return {
        ...currentRecords,
        [month.key]: {
          ...currentRecord,
          balances: {
            ...currentRecord.balances,
            [assetId]: Math.max(0, value),
          },
        },
      };
    });
  }

  function clearDraftMonth(month: ProgressMonth) {
    setDraftRecords((currentRecords) => ({
      ...currentRecords,
      [month.key]: buildEmptyProgressMonthlyRecord(month, assets),
    }));
  }

  return (
    <section className={`glass-panel w-full min-w-0 p-5 ${isYearPickerOpen ? 'z-50' : ''}`}>
      <div className="glass-panel-floating-layer flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-950">Record Your Actual Balances</h2>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            Edit saved monthly balances
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              className={buttonClasses({ className: 'min-w-28 whitespace-nowrap' })}
              aria-controls="progress-record-year-picker"
              aria-expanded={isYearPickerOpen}
              type="button"
              onClick={() => setIsYearPickerOpen((isOpen) => !isOpen)}
            >
              <CalendarDays className="h-4 w-4 shrink-0" />
              <span>{selectedYear}</span>
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isYearPickerOpen ? 'rotate-180' : ''}`} />
            </button>
            {isYearPickerOpen && (
              <YearPicker
                className="right-0 top-12"
                id="progress-record-year-picker"
                selectedYear={Number(selectedYear)}
                onYearChange={(year) => {
                  setSelectedYear(String(year));
                  setIsYearPickerOpen(false);
                }}
              />
            )}
          </div>
        </div>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-3xl table-fixed border-separate border-spacing-0 md:min-w-full">
          <thead>
            <tr className="text-left text-sm font-bold text-slate-600">
              <th className="w-20 pb-3 pr-2">Month</th>
              {assets.map((asset) => {
                const colors = colorClasses[asset.color];

                return (
                  <th key={asset.id} className="pb-3 pr-2 text-right xl:pr-3">
                    <span className="flex items-center justify-end gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors.stroke }} />
                      {formatProgressAssetBarLabel(asset.label)}
                    </span>
                  </th>
                );
              })}
              <th className="w-28 pb-3 pr-2 text-right xl:w-32 xl:pr-3">Total</th>
              <th className="w-16 pb-3 pr-1 text-right xl:w-20 xl:pr-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {months.map((month) => {
              const record = draftRecords[month.key] ?? buildEmptyProgressMonthlyRecord(month, assets);
              const total = calculateTotalBalance(record.balances);

              return (
                <tr key={month.key}>
                  <td className="border-t border-slate-300/30 py-2 pr-2 text-sm font-bold text-slate-700">
                    {month.shortLabel} {selectedYear}
                  </td>
                  {assets.map((asset) => (
                    <td key={asset.id} className="border-t border-slate-300/30 py-2 pr-2 xl:pr-3">
                      <ProgressRecordMoneyInput
                        ariaLabel={`${month.label} ${asset.label} balance`}
                        value={record.balances[asset.id] ?? 0}
                        onChange={(value) => updateDraftBalance(month, asset.id, value)}
                      />
                    </td>
                  ))}
                  <td className="border-t border-slate-300/30 py-2 pr-2 text-right text-sm font-bold text-slate-950 xl:pr-3">
                    {currency(total)}
                  </td>
                  <td className="border-t border-slate-300/30 py-2 pr-1 text-right xl:pr-2">
                    <button
                      className={buttonClasses({ size: 'icon', tone: 'danger' })}
                      aria-label={`Clear ${month.label}`}
                      type="button"
                      onClick={() => clearDraftMonth(month)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProgressRecordMoneyInput({
  ariaLabel,
  value,
  onChange,
}: {
  ariaLabel: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const { inputValue, onInputChange } = useEditableNumber(value, onChange, { format: 'money' });

  return (
    <span className="glass-input ml-auto flex h-10 w-full max-w-xs min-w-0 items-center gap-2 px-2 py-2 text-sm xl:px-3">
      <input
        aria-label={ariaLabel}
        className="min-w-0 flex-1 bg-transparent text-right font-black text-slate-950 outline-none"
        inputMode="numeric"
        type="text"
        value={inputValue}
        onChange={(event) => onInputChange(event.currentTarget.value)}
      />
      <span className="font-semibold text-slate-600">CHF</span>
    </span>
  );
}

function ProgressMetricCard({
  helper,
  icon: Icon,
  iconClassName,
  title,
  value,
  helperClassName,
}: {
  helper: string;
  helperClassName: string;
  icon: LucideIcon;
  iconClassName: string;
  title: string;
  value: string;
}) {
  return (
    <section className="glass-panel w-full min-w-0 p-5">
      <div className="flex items-start gap-4">
        <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-3xl ${iconClassName}`}>
          <Icon className="h-7 w-7" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold leading-5 text-slate-950">{title}</h2>
          <p className="mt-6 text-3xl font-bold tracking-normal text-slate-950">
            <MetricValue>{value}</MetricValue>
          </p>
          <p className={`mt-2 text-sm font-bold ${helperClassName}`}>{helper}</p>
        </div>
      </div>
    </section>
  );
}

function MetricValue({ children }: { children: ReactNode }) {
  const [amount, suffix] = String(children).split(' CHF');

  if (!suffix && !String(children).includes('CHF')) {
    return children;
  }

  return (
    <>
      {amount} <span className="text-sm font-bold">CHF</span>
    </>
  );
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

function saveProgressBaseline(baseline: ProgressBaseline) {
  try {
    window.localStorage.setItem(PROGRESS_BASELINE_STORAGE_KEY, JSON.stringify(baseline));
  } catch {
    // Keep progress tracking usable when browser storage is unavailable.
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

function saveProgressMonthlyRecords(records: SavedProgressMonthlyRecords) {
  try {
    window.localStorage.setItem(PROGRESS_MONTHLY_RECORD_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Keep monthly recording usable when browser storage is unavailable.
  }
}

function getInitialProgressAssetBalances(assets: FinancialAsset[], savedRecord: ProgressMonthlyRecord | null) {
  return Object.fromEntries(
    assets.map((asset) => [
      asset.id,
      getSavedProgressBalance(savedRecord?.balances[asset.id], asset.amount),
    ]),
  );
}

function getProgressAssetBalances(assets: FinancialAsset[]) {
  return Object.fromEntries(assets.map((asset) => [asset.id, Math.max(0, asset.amount)]));
}

function getProgressBaselineBalances({
  assets,
  savedRecord,
}: {
  assets: FinancialAsset[];
  savedRecord?: ProgressMonthlyRecord;
}) {
  if (savedRecord) {
    return Object.fromEntries(
      assets.map((asset) => [
        asset.id,
        getSavedProgressBalance(savedRecord.balances[asset.id], 0),
      ]),
    );
  }

  return getProgressAssetBalances(assets);
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

function getSavedProgressBalance(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
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

function formatProgressMonth(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function getCurrentProgressMonth() {
  const currentDate = new Date();

  return buildProgressMonth(currentDate.getFullYear(), currentDate.getMonth());
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

function getProgressMonthDate(month: ProgressMonth) {
  const [year, monthNumber] = month.key.split('-').map(Number);

  return new Date(year, monthNumber - 1, 1);
}

function buildEmptyProgressMonthlyRecord(month: ProgressMonth, assets: FinancialAsset[]): ProgressMonthlyRecord {
  return {
    monthLabel: month.label,
    recordedAt: getProgressMonthDate(month).toISOString(),
    balances: Object.fromEntries(assets.map((asset) => [asset.id, 0])),
  };
}

function removeEmptyProgressMonthlyRecords(records: SavedProgressMonthlyRecords) {
  return Object.fromEntries(
    Object.entries(records).filter(([, record]) => calculateTotalBalance(record.balances) > 0),
  );
}

function buildProgressYearTicks(maxYear: number, domain: [number, number] = [0, maxYear]) {
  const [minYear, maxDomainYear] = domain;
  const startYear = Math.ceil(minYear);
  const endYear = Math.floor(maxDomainYear);
  const range = Math.max(endYear - startYear, 0);
  const interval = range > 12 ? 5 : range > 6 ? 2 : 1;
  const ticks = Array.from(
    { length: Math.floor(range / interval) + 1 },
    (_, index) => startYear + index * interval,
  ).filter((year) => year >= minYear && year <= maxDomainYear && year <= maxYear);

  if (!ticks.includes(minYear)) {
    ticks.unshift(minYear);
  }

  if (!ticks.includes(maxDomainYear)) {
    ticks.push(maxDomainYear);
  }

  return ticks;
}

function formatProgressYearAxis(value: number) {
  if (value === 0) {
    return 'Baseline';
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatProgressChartTooltipLabel(value: number) {
  if (value === 0) {
    return 'Baseline';
  }

  const roundedMonths = Math.round(value * 12);

  if (roundedMonths < 12) {
    return `Month ${roundedMonths}`;
  }

  const years = Math.floor(roundedMonths / 12);
  const months = roundedMonths % 12;

  return months === 0 ? `Year ${years}` : `Year ${years}, month ${months}`;
}

function formatChartAxisValue(value: number) {
  if (value === 0) {
    return '0';
  }

  if (value >= 1000000) {
    return `${Number((value / 1000000).toFixed(value >= 10000000 ? 0 : 1))}M`;
  }

  if (value >= 1000) {
    return `${Number((value / 1000).toFixed(value >= 100000 ? 0 : 1))}K`;
  }

  return String(Math.round(value));
}

function formatSignedChartAxisValue(value: number) {
  if (value === 0) {
    return '0';
  }

  const sign = value > 0 ? '+' : '-';

  return `${sign}${formatChartAxisValue(Math.abs(value))}`;
}

function formatSignedCompactCurrency(value: number) {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';

  return `${sign}${currency(Math.abs(value), true)}`;
}

function formatSignedCurrency(value: number) {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';

  return `${sign}${currency(Math.abs(value))}`;
}

function formatSignedPercent(value: number) {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';

  return `${sign}${Math.abs(value).toFixed(1)}%`;
}
