import { useId, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, ChartLine, TrendingUp, Wallet, WalletCards, type LucideIcon } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatPercent, getPercent } from '../calculations/percent';
import { buttonClasses } from '../constants/buttonStyles';
import { tooltipContentClasses } from '../constants/tooltipStyles';
import { currency } from '../finance';
import type { ExpenseCategory, ExpenseMonth } from '../pages/ExpensesPage';

type ExpenseTrendAnalysisPageProps = {
  currentCategories: ExpenseCategory[];
  expenseMonth: ExpenseMonth;
  initialMonthsBack: number;
  readExpenses: (monthKey: string) => ExpenseCategory[];
};

type MetricTrend = {
  trend: string;
  trendDirection: 'up' | 'down';
  trendTone: 'good' | 'bad';
};

type ExpenseTrendMonth = {
  month: ExpenseMonth;
  categories: ExpenseCategory[];
  totalExpenses: number;
  averageDailyExpense: number;
  monthChangeAmount: number | null;
  highestCategory: ExpenseCategory | null;
};

type CategoryTrendSummary = {
  id: string;
  label: string;
  color: string;
  total: number;
};

type ShareCategorySummary = CategoryTrendSummary & {
  sourceIds: string[];
};

const OTHERS_CATEGORY_COLOR = '#94a3b8';

export function ExpenseTrendAnalysisPage({
  currentCategories,
  expenseMonth,
  initialMonthsBack,
  readExpenses,
}: ExpenseTrendAnalysisPageProps) {
  const gradientPrefix = useId().replaceAll(':', '');
  const [monthsBack, setMonthsBack] = useState(initialMonthsBack);
  const [isShowingOtherCategories, setIsShowingOtherCategories] = useState(false);
  const analyzedMonthCount = monthsBack + 1;
  const trendMonths = useMemo(
    () => buildExpenseTrendMonths(expenseMonth, analyzedMonthCount, readExpenses, currentCategories),
    [analyzedMonthCount, currentCategories, expenseMonth, readExpenses],
  );
  const previousTrendMonths = useMemo(
    () => buildExpenseTrendMonths(getPreviousExpenseMonth(trendMonths[0].month), analyzedMonthCount, readExpenses),
    [analyzedMonthCount, readExpenses, trendMonths],
  );
  const totalExpenses = trendMonths.reduce((sum, month) => sum + month.totalExpenses, 0);
  const averageMonthlyExpenses = totalExpenses / Math.max(trendMonths.length, 1);
  const averageDailyExpense =
    trendMonths.reduce((sum, month) => sum + month.averageDailyExpense, 0) / Math.max(trendMonths.length, 1);
  const highestMonth = trendMonths.reduce((highest, month) => (month.totalExpenses > highest.totalExpenses ? month : highest), trendMonths[0]);
  const lowestMonth = trendMonths.reduce((lowest, month) => (month.totalExpenses < lowest.totalExpenses ? month : lowest), trendMonths[0]);
  const categorySummaries = getTopCategorySummaries(trendMonths, 5);
  const shareCategorySummaries = getShareCategorySummaries(trendMonths, categorySummaries);
  const otherCategorySummaries = getOtherCategorySummaries(trendMonths, categorySummaries);
  const isShowingOtherCategoryBreakdown = isShowingOtherCategories && otherCategorySummaries.length > 0;
  const displayedCategorySpendSummaries = isShowingOtherCategoryBreakdown ? otherCategorySummaries : shareCategorySummaries;
  const shareTooltipColors = Object.fromEntries(
    [...shareCategorySummaries, ...otherCategorySummaries].flatMap((category) => [
      [`${category.id}Share`, category.color],
      [`${category.id}Amount`, category.color],
      [category.label, category.color],
    ]),
  );
  const previousAverage =
    previousTrendMonths.reduce((sum, month) => sum + month.totalExpenses, 0) / Math.max(previousTrendMonths.length, 1);
  const averageTrend = buildMetricTrend(averageMonthlyExpenses, previousAverage, 'lower');
  const expenseAxisTicks = buildThousandsTicks(trendMonths.map((month) => month.totalExpenses));
  const dailyAxisTicks = buildDailyExpenseTicks(trendMonths.map((month) => month.averageDailyExpense));
  const monthChangeDomain = buildMonthChangeDomain(trendMonths.map((month) => month.monthChangeAmount ?? 0));
  const categoryStackAxisTicks = buildRoundedThousandsTicks(
    trendMonths.map((month) =>
      displayedCategorySpendSummaries.reduce((sum, category) => sum + getShareCategoryValue(month.categories, category), 0),
    ),
  );
  const categoryAxisTicks = buildPaddedValueTicks(
    trendMonths.flatMap((month) =>
      categorySummaries.map((category) => month.categories.find((monthCategory) => monthCategory.id === category.id)?.value ?? 0),
    ),
  );
  const chartData = trendMonths.map((month) => ({
    name: month.month.shortLabel,
    averageDailyExpense: Math.round(month.averageDailyExpense),
    monthChange: month.monthChangeAmount ?? 0,
    totalExpenses: month.totalExpenses,
    ...Object.fromEntries(
      shareCategorySummaries.map((category) => [
        `${category.id}Share`,
        getPercent(getShareCategoryValue(month.categories, category), month.totalExpenses),
      ]),
    ),
    ...Object.fromEntries(
      [...shareCategorySummaries, ...otherCategorySummaries].map((category) => [
        `${category.id}Amount`,
        getShareCategoryValue(month.categories, category),
      ]),
    ),
    ...Object.fromEntries(
      categorySummaries.map((category) => [
        category.id,
        month.categories.find((monthCategory) => monthCategory.id === category.id)?.value ?? 0,
      ]),
    ),
  }));

  return (
    <section className="mt-5 space-y-3">
      <TrendMonthsSlider value={monthsBack} onChange={setMonthsBack} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <TrendMetricCard
          icon={WalletCards}
          iconClassName="bg-blue-600/10 text-blue-600"
          title="Average Monthly Expenses"
          amount={averageMonthlyExpenses}
          helper={`vs previous ${analyzedMonthCount} months`}
          trend={averageTrend}
        />
        <TrendMetricCard
          icon={TrendingUp}
          iconClassName="bg-emerald-500/12 text-emerald-600"
          title={`Total Expenses (${analyzedMonthCount} Months)`}
          amount={totalExpenses}
          helper={`${trendMonths[0].month.label} - ${trendMonths.at(-1)?.month.label}`}
        />
        <TrendMetricCard
          icon={ChartLine}
          iconClassName="bg-amber-500/12 text-amber-500"
          title="Highest Month"
          amount={highestMonth.totalExpenses}
          helper={highestMonth.month.label}
        />
        <TrendMetricCard
          icon={ArrowDown}
          iconClassName="bg-violet-500/12 text-violet-600"
          title="Lowest Month"
          amount={lowestMonth.totalExpenses}
          helper={lowestMonth.month.label}
        />
        <TrendMetricCard
          icon={Wallet}
          iconClassName="bg-cyan-500/12 text-cyan-600"
          title="Average Daily Expense"
          amount={averageDailyExpense}
          helper={`Across ${analyzedMonthCount} months`}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <TrendPanel title="Expenses Over Time">
          <ChartLegend
            items={[
              { label: 'Total Expenses (CHF)', color: '#2563eb' },
              { label: 'Average Daily Expense (CHF)', color: '#2563eb', line: true },
            ]}
          />
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chartData} margin={{ left: -10, right: 12, top: 12 }}>
              <defs>
                <linearGradient id={`${gradientPrefix}-total-expenses`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.82} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0.18} />
                </linearGradient>
              </defs>
              <CartesianGrid horizontal stroke="#cbd5e1" strokeDasharray="3 3" strokeOpacity={0.6} vertical={false} />
              {expenseAxisTicks.slice(1).map((tick) => (
                <ReferenceLine
                  key={tick}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  strokeOpacity={0.34}
                  y={tick}
                  yAxisId="total"
                />
              ))}
              <XAxis
                axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.65 }}
                dataKey="name"
                tick={{ fill: '#334155', fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.65 }}
                tick={{ fill: '#334155', fontSize: 12 }}
                tickFormatter={formatThousandsAxis}
                tickLine={false}
                ticks={expenseAxisTicks}
                width={46}
                yAxisId="total"
              />
              <YAxis
                axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.65 }}
                orientation="right"
                tick={{ fill: '#334155', fontSize: 12 }}
                tickLine={false}
                ticks={dailyAxisTicks}
                width={36}
                yAxisId="daily"
              />
              <Tooltip content={<TrendTooltip />} cursor={{ fill: 'rgba(37,99,235,.08)' }} />
              <Bar
                dataKey="totalExpenses"
                fill={`url(#${gradientPrefix}-total-expenses)`}
                name="Total Expenses"
                radius={[6, 6, 0, 0]}
                yAxisId="total"
              >
                <LabelList
                  dataKey="totalExpenses"
                  fill="#0f172a"
                  fontSize={12}
                  fontWeight={700}
                  formatter={(value) => currency(Number(value ?? 0))}
                  position="top"
                />
              </Bar>
              <Line
                dataKey="averageDailyExpense"
                dot={{ fill: '#60a5fa', r: 4, stroke: '#2563eb', strokeWidth: 2 }}
                name="Average Daily Expense"
                stroke="#2563eb"
                strokeWidth={2}
                yAxisId="daily"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </TrendPanel>

        <TrendPanel title="Top Categories Over Time">
          <ChartLegend items={categorySummaries.map((category) => ({ label: category.label, color: category.color, line: true }))} />
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chartData} margin={{ left: -10, right: 12, top: 12 }}>
              <CartesianGrid horizontal stroke="#cbd5e1" strokeDasharray="3 3" strokeOpacity={0.6} vertical={false} />
              <ReferenceLine stroke="#94a3b8" strokeOpacity={0.38} y={0} />
              <XAxis
                axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.65 }}
                dataKey="name"
                tick={{ fill: '#334155', fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.65 }}
                tick={{ fill: '#334155', fontSize: 12 }}
                tickFormatter={formatThousandsAxis}
                tickLine={false}
                ticks={categoryAxisTicks}
                width={46}
              />
              <Tooltip content={<TrendTooltip />} cursor={{ fill: 'rgba(37,99,235,.08)' }} />
              {categorySummaries.map((category) => (
                <Line
                  key={category.id}
                  dataKey={category.id}
                  dot={{ fill: category.color, r: 4, stroke: category.color, strokeWidth: 1 }}
                  name={category.label}
                  stroke={category.color}
                  strokeWidth={2}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </TrendPanel>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)]">
        <TrendPanel title="Month Over Month Change">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={chartData} margin={{ left: -12, right: 12, top: 16 }}>
              <defs>
                <linearGradient id={`${gradientPrefix}-positive-change`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.84} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.18} />
                </linearGradient>
                <linearGradient id={`${gradientPrefix}-negative-change`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.84} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.18} />
                </linearGradient>
              </defs>
              <CartesianGrid horizontal stroke="#cbd5e1" strokeDasharray="3 3" strokeOpacity={0.6} vertical={false} />
              <XAxis
                axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.65 }}
                dataKey="name"
                tick={{ fill: '#334155', fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.65 }}
                tick={{ fill: '#334155', fontSize: 12 }}
                tickFormatter={formatSignedThousandsAxis}
                tickLine={false}
                domain={monthChangeDomain}
                padding={{ bottom: 12, top: 8 }}
                width={54}
              />
              <Tooltip content={<TrendTooltip />} cursor={{ fill: 'rgba(37,99,235,.08)' }} />
              <Bar
                dataKey="monthChange"
                name="vs previous month"
                radius={[6, 6, 0, 0]}
                shape={<MonthChangeBarShape />}
              >
                {chartData.map((month) => (
                  <Cell
                    key={month.name}
                    fill={`url(#${gradientPrefix}-${month.monthChange >= 0 ? 'negative' : 'positive'}-change)`}
                  />
                ))}
                <LabelList content={<MonthChangeLabel />} dataKey="monthChange" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </TrendPanel>

        <TrendPanel
          title={isShowingOtherCategoryBreakdown ? 'Other Categories Over Time (CHF)' : 'Category Spend Over Time (CHF)'}
          action={
            isShowingOtherCategoryBreakdown ? (
              <button
                className={buttonClasses({ size: 'icon' })}
                aria-label="Back to category spend"
                type="button"
                onClick={() => setIsShowingOtherCategories(false)}
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : null
          }
        >
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={chartData} margin={{ left: 4, right: 12, top: 12 }} barCategoryGap="24%">
              <defs>
                {displayedCategorySpendSummaries.map((category) => (
                  <linearGradient key={category.id} id={`${gradientPrefix}-${category.id}-share`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={category.color} stopOpacity={0.82} />
                    <stop offset="70%" stopColor={category.color} stopOpacity={0.82} />
                    <stop offset="100%" stopColor={category.color} stopOpacity={0.48} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid horizontal stroke="#cbd5e1" strokeDasharray="3 3" strokeOpacity={0.6} vertical={false} />
              <XAxis
                axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.65 }}
                dataKey="name"
                tick={{ fill: '#334155', fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.65 }}
                tick={{ fill: '#334155', fontSize: 12 }}
                tickFormatter={formatThousandsAxis}
                tickLine={false}
                ticks={categoryStackAxisTicks}
                width={48}
              />
              <Tooltip content={<TrendTooltip colorByTooltipKey={shareTooltipColors} />} cursor={{ fill: 'rgba(37,99,235,.08)' }} />
              {displayedCategorySpendSummaries.map((category) => (
                <Bar
                  key={category.id}
                  dataKey={`${category.id}Amount`}
                  fill={`url(#${gradientPrefix}-${category.id}-share)`}
                  name={category.label}
                  stackId="share"
                  barSize={26}
                  className={category.id === 'others' && !isShowingOtherCategoryBreakdown ? 'cursor-pointer' : undefined}
                  onClick={() => {
                    if (category.id === 'others' && !isShowingOtherCategoryBreakdown) {
                      setIsShowingOtherCategories(true);
                    }
                  }}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </TrendPanel>

        <TrendPanel title="Top Categories by Total Spend">
          <div className="grid items-center gap-4 md:grid-cols-[13rem_1fr]">
            <div className="relative h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    {categorySummaries.map((category) => (
                      <linearGradient key={category.id} id={`${gradientPrefix}-${category.id}-pie`} x1="0" x2="1" y1="0" y2="1">
                        <stop offset="0%" stopColor={category.color} stopOpacity={0.38} />
                        <stop offset="100%" stopColor={category.color} stopOpacity={0.96} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie data={categorySummaries} dataKey="total" innerRadius="56%" outerRadius="86%" paddingAngle={1}>
                    {categorySummaries.map((category) => (
                      <Cell key={category.id} fill={`url(#${gradientPrefix}-${category.id}-pie)`} />
                    ))}
                  </Pie>
                  <Tooltip content={<TrendTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <p className="text-lg font-bold text-slate-950">
                  {currency(totalExpenses)}
                  <span className="block text-sm">CHF</span>
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {categorySummaries.map((category) => (
                <div key={category.id} className="grid grid-cols-[1fr_6rem_4rem] items-center gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                    <span className="truncate font-semibold text-slate-700">{category.label}</span>
                  </span>
                  <span className="text-right font-semibold text-slate-950">{currency(category.total)} CHF</span>
                  <span className="text-right font-semibold text-slate-600">{formatPercent(category.total, totalExpenses)}</span>
                </div>
              ))}
            </div>
          </div>
        </TrendPanel>
      </div>

      <TrendPanel title="Monthly Summary">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-600">
              <tr className="border-b border-slate-300/50">
                <th className="px-2 py-2 font-bold">Month</th>
                <th className="px-2 py-2 text-center font-bold">Total Expenses</th>
                <th className="px-2 py-2 text-center font-bold">vs Previous Month</th>
                <th className="px-2 py-2 text-center font-bold">Average Daily</th>
                <th className="px-2 py-2 text-center font-bold">Highest Category</th>
                <th className="px-2 py-2 text-center font-bold">Category Amount</th>
              </tr>
            </thead>
            <tbody>
              {trendMonths.map((month) => (
                <tr key={month.month.key} className="border-b border-slate-300/35 last:border-b-0">
                  <td className="px-2 py-2 font-semibold text-slate-800">{month.month.label}</td>
                  <td className="px-2 py-2 text-center font-semibold text-slate-950">{currency(month.totalExpenses)} CHF</td>
                  <td className={`px-2 py-2 text-center font-bold ${getTrendTextClass(month.monthChangeAmount ?? 0)}`}>
                    {month.monthChangeAmount === null ? '-' : formatSignedCurrency(month.monthChangeAmount)}
                  </td>
                  <td className="px-2 py-2 text-center font-semibold text-slate-700">{currency(month.averageDailyExpense)} CHF</td>
                  <td className="px-2 py-2 text-center font-semibold text-slate-700">{month.highestCategory?.label ?? '-'}</td>
                  <td className="px-2 py-2 text-center font-semibold text-slate-950">
                    {currency(month.highestCategory?.value ?? 0)} CHF
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TrendPanel>
    </section>
  );
}

function TrendMetricCard({
  icon: Icon,
  iconClassName,
  title,
  amount,
  helper,
  trend,
}: {
  icon: LucideIcon;
  iconClassName: string;
  title: string;
  amount: number;
  helper: string;
  trend?: MetricTrend;
}) {
  const TrendIcon = trend?.trendDirection === 'up' ? ArrowUp : ArrowDown;

  return (
    <section className="glass-panel flex h-full flex-col p-5">
      <div className="flex items-start gap-4">
        <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-3xl ${iconClassName}`}>
          <Icon className="h-7 w-7" />
        </div>
        <div className="min-w-0">
          <h2 className="min-h-10 text-sm font-bold leading-5 text-slate-950">{title}</h2>
        </div>
      </div>
      <p className="mt-4 text-center whitespace-nowrap text-2xl font-bold tracking-normal text-slate-950 2xl:text-3xl">
        {currency(amount)} <span className="text-sm font-bold">CHF</span>
      </p>
      <div className="mt-auto flex items-center justify-between gap-3 pt-7 text-sm">
        <span className="text-slate-600">{helper}</span>
        {trend && (
          <span className={`flex items-center gap-1 font-bold ${trend.trendTone === 'good' ? 'text-emerald-600' : 'text-red-500'}`}>
            <TrendIcon className="h-4 w-4" />
            {trend.trend}
          </span>
        )}
      </div>
    </section>
  );
}

function TrendMonthsSlider({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const percent = getPercent(value, 12);
  const analyzedMonthCount = value + 1;

  return (
    <section className="glass-panel px-5 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex min-w-44 items-baseline justify-between gap-3 md:block">
          <p className="text-sm font-bold text-slate-900">Months Back</p>
          <p className="mt-1 text-sm text-slate-600">
            <span className="font-extrabold text-slate-950">{analyzedMonthCount}</span> analyzed
          </p>
        </div>
        <div className="flex flex-1 items-center gap-4">
          <span className="text-sm font-bold text-slate-500">0</span>
          <input
            aria-label="Months back for expense trend analysis"
            className="years-slider"
            max={12}
            min={0}
            step={1}
            style={{ '--slider-progress': `${percent}%` } as CSSProperties}
            type="range"
            value={value}
            onChange={(event) => onChange(Number(event.currentTarget.value))}
          />
          <span className="text-sm font-bold text-slate-500">12</span>
        </div>
      </div>
    </section>
  );
}

function TrendPanel({ action, children, title }: { action?: ReactNode; children: ReactNode; title: string }) {
  return (
    <section className="glass-panel min-w-0 p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-bold text-slate-950">{title}</h2>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ChartLegend({ items }: { items: Array<{ color: string; label: string; line?: boolean }> }) {
  return (
    <div className="mb-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-slate-700">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-2">
          {item.line ? (
            <span className="relative h-2.5 w-5">
              <span className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2" style={{ backgroundColor: item.color }} />
              <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ backgroundColor: item.color }} />
            </span>
          ) : (
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          )}
          {item.label}
        </span>
      ))}
    </div>
  );
}

function TrendTooltip({
  active,
  colorByTooltipKey = {},
  payload,
  label,
}: {
  active?: boolean;
  colorByTooltipKey?: Record<string, string>;
  payload?: Array<{ color?: string; dataKey?: string | number; name?: string; value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className={tooltipContentClasses('px-3 py-2')}>
      {label && <p className="mb-1 font-semibold text-slate-950">{label}</p>}
      {payload.map((item) => {
        const dataKey = String(item.dataKey ?? '');
        const name = item.name ?? '';
        const labelColor =
          item.name === 'Average Daily Expense' ? '#059669' : colorByTooltipKey[dataKey] ?? colorByTooltipKey[name] ?? item.color;

        return (
          <p key={`${item.name}-${dataKey}`} className="text-slate-700">
            <span className="font-medium" style={{ color: labelColor }}>
              {item.name}:
            </span>{' '}
            {formatTooltipValue(item.name, item.value ?? 0, item.dataKey)}
          </p>
        );
      })}
    </div>
  );
}

function formatTooltipValue(name: string | undefined, value: number, dataKey: string | number | undefined) {
  if (name?.includes('previous month')) {
    return formatSignedCurrency(value);
  }

  if (String(dataKey).endsWith('Share')) {
    return formatPercent(value, 100);
  }

  return `${currency(value)} CHF`;
}

function MonthChangeLabel({
  value,
  width,
  x,
  y,
}: {
  value?: number | string;
  width?: number | string;
  x?: number | string;
  y?: number | string;
}) {
  const numericValue = Number(value ?? 0);

  if (!Number.isFinite(numericValue) || numericValue === 0) {
    return null;
  }

  const labelX = Number(x ?? 0) + Number(width ?? 0) / 2;
  const labelY = numericValue > 0 ? Number(y ?? 0) - 8 : Number(y ?? 0) + 18;

  return (
    <text
      fill={numericValue > 0 ? '#ef4444' : '#059669'}
      fontSize={12}
      fontWeight={700}
      textAnchor="middle"
      x={labelX}
      y={labelY}
    >
      {formatSignedCurrency(numericValue)}
    </text>
  );
}

function MonthChangeBarShape({
  fill,
  height,
  value,
  width,
  x,
  y,
}: {
  fill?: string;
  height?: number | string;
  value?: number | string;
  width?: number | string;
  x?: number | string;
  y?: number | string;
}) {
  const numericValue = Number(value ?? 0);
  const barX = Number(x ?? 0);
  const barY = Number(y ?? 0);
  const barWidth = Number(width ?? 0);
  const barHeight = Number(height ?? 0);
  const normalizedBarHeight = Math.abs(barHeight);
  const normalizedBarY = barHeight < 0 ? barY + barHeight : barY;

  if (numericValue === 0) {
    const labelX = barX + barWidth / 2;
    const lineHalfWidth = Math.max(barWidth / 3, 10);

    return (
      <g>
        <line
          stroke="#64748b"
          strokeLinecap="round"
          strokeWidth={2}
          x1={labelX - lineHalfWidth}
          x2={labelX + lineHalfWidth}
          y1={barY}
          y2={barY}
        />
        <text fill="#475569" fontSize={12} fontWeight={700} textAnchor="middle" x={labelX} y={barY - 7}>
          0
        </text>
      </g>
    );
  }

  return (
    <rect
      fill={fill}
      height={normalizedBarHeight}
      rx={6}
      ry={6}
      width={barWidth}
      x={barX}
      y={normalizedBarY}
    />
  );
}

function buildExpenseTrendMonths(
  endMonth: ExpenseMonth,
  monthCount: number,
  readExpenses: (monthKey: string) => ExpenseCategory[],
  currentCategories?: ExpenseCategory[],
): ExpenseTrendMonth[] {
  const [endYear, endMonthNumber] = endMonth.key.split('-').map(Number);
  const months = Array.from({ length: monthCount }, (_, index) =>
    buildExpenseMonth(endYear, endMonthNumber - monthCount + index),
  );

  return months.map((month, index) => {
    const categories = month.key === endMonth.key && currentCategories ? currentCategories : readExpenses(month.key);
    const totalExpenses = getCategoryTotal(categories);
    const previousMonth = index === 0 ? getPreviousExpenseMonth(month) : months[index - 1];
    const previousCategories =
      previousMonth.key === endMonth.key && currentCategories ? currentCategories : readExpenses(previousMonth.key);
    const previousTotal = getCategoryTotal(previousCategories);
    const monthChangeAmount = previousTotal > 0 ? totalExpenses - previousTotal : null;
    const highestCategory = [...categories].sort((first, second) => second.value - first.value)[0] ?? null;

    return {
      month,
      categories,
      totalExpenses,
      averageDailyExpense: totalExpenses / getDaysInExpenseMonth(month),
      monthChangeAmount,
      highestCategory,
    };
  });
}

function getTopCategorySummaries(trendMonths: ExpenseTrendMonth[], maxCategories: number): CategoryTrendSummary[] {
  const categoryTotals = new Map<string, CategoryTrendSummary>();

  for (const month of trendMonths) {
    for (const category of month.categories) {
      const existingCategory = categoryTotals.get(category.id);

      categoryTotals.set(category.id, {
        id: category.id,
        label: category.label,
        color: category.color,
        total: (existingCategory?.total ?? 0) + category.value,
      });
    }
  }

  return [...categoryTotals.values()].sort((first, second) => second.total - first.total).slice(0, maxCategories);
}

function getShareCategorySummaries(
  trendMonths: ExpenseTrendMonth[],
  topCategorySummaries: CategoryTrendSummary[],
): ShareCategorySummary[] {
  const topCategoryIds = new Set(topCategorySummaries.map((category) => category.id));
  const otherCategoryIds = new Set<string>();
  let otherCategoryTotal = 0;

  for (const month of trendMonths) {
    for (const category of month.categories) {
      if (!topCategoryIds.has(category.id)) {
        otherCategoryIds.add(category.id);
        otherCategoryTotal += category.value;
      }
    }
  }

  const shareCategories = topCategorySummaries.map((category) => ({
    ...category,
    sourceIds: [category.id],
  }));

  if (otherCategoryIds.size > 0 && otherCategoryTotal > 0) {
    shareCategories.push({
      id: 'others',
      label: 'Others',
      color: OTHERS_CATEGORY_COLOR,
      total: otherCategoryTotal,
      sourceIds: [...otherCategoryIds],
    });
  }

  return shareCategories;
}

function getOtherCategorySummaries(
  trendMonths: ExpenseTrendMonth[],
  topCategorySummaries: CategoryTrendSummary[],
): ShareCategorySummary[] {
  const topCategoryIds = new Set(topCategorySummaries.map((category) => category.id));
  const otherCategoryTotals = new Map<string, ShareCategorySummary>();

  for (const month of trendMonths) {
    for (const category of month.categories) {
      if (topCategoryIds.has(category.id)) {
        continue;
      }

      const existingCategory = otherCategoryTotals.get(category.id);

      otherCategoryTotals.set(category.id, {
        id: category.id,
        label: category.label,
        color: category.color,
        total: (existingCategory?.total ?? 0) + category.value,
        sourceIds: [category.id],
      });
    }
  }

  return [...otherCategoryTotals.values()].sort((first, second) => second.total - first.total);
}

function getShareCategoryValue(categories: ExpenseCategory[], shareCategory: ShareCategorySummary) {
  const sourceIds = new Set(shareCategory.sourceIds);

  return categories.reduce((sum, category) => (sourceIds.has(category.id) ? sum + category.value : sum), 0);
}

function buildMetricTrend(currentValue: number, previousValue: number, betterWhen: 'higher' | 'lower'): MetricTrend {
  const difference = currentValue - previousValue;
  const percentChange = previousValue === 0 ? (currentValue === 0 ? 0 : 100) : getPercent(Math.abs(difference), previousValue);
  const trendDirection = difference >= 0 ? 'up' : 'down';
  const isGood = betterWhen === 'higher' ? difference >= 0 : difference <= 0;

  return {
    trend: formatPercent(percentChange, 100),
    trendDirection,
    trendTone: isGood ? 'good' : 'bad',
  };
}

function buildExpenseMonth(year: number, monthIndex: number): ExpenseMonth {
  const date = new Date(year, monthIndex, 1);

  return {
    key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    label: date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    }),
    shortLabel: date.toLocaleDateString('en-US', {
      month: 'short',
    }),
  };
}

function getPreviousExpenseMonth(expenseMonth: ExpenseMonth) {
  const [year, month] = expenseMonth.key.split('-').map(Number);

  return buildExpenseMonth(year, month - 2);
}

function getCategoryTotal(categories: ExpenseCategory[]) {
  return categories.reduce((sum, category) => sum + category.value, 0);
}

function getDaysInExpenseMonth(expenseMonth: ExpenseMonth) {
  const [year, month] = expenseMonth.key.split('-').map(Number);

  return new Date(year, month, 0).getDate();
}

function getTrendTextClass(value: number) {
  if (value > 0) {
    return 'text-red-500';
  }

  if (value < 0) {
    return 'text-emerald-600';
  }

  return 'text-slate-600';
}

function formatThousandsAxis(value: number) {
  return value >= 1000 ? `${Math.round(value / 1000)}K` : `${value}`;
}

function formatSignedThousandsAxis(value: number) {
  const absoluteValue = Math.abs(value);
  const formattedValue = absoluteValue >= 1000 ? `${Math.round(absoluteValue / 1000)}K` : `${absoluteValue}`;

  if (value > 0) {
    return `+${formattedValue}`;
  }

  if (value < 0) {
    return `-${formattedValue}`;
  }

  return '0';
}

function formatSignedCurrency(value: number) {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';

  return `${sign}${currency(Math.abs(value))}`;
}

function buildThousandsTicks(values: number[]) {
  const maxValue = Math.max(...values, 0);
  const step = Math.max(1000, Math.ceil(maxValue / 4 / 1000) * 1000);

  return Array.from({ length: 5 }, (_, index) => index * step);
}

function buildRoundedThousandsTicks(values: number[]) {
  const maxValue = Math.max(...values, 0);
  const axisMax = Math.max(1000, Math.ceil(maxValue / 1000) * 1000);

  return Array.from({ length: axisMax / 1000 + 1 }, (_, index) => index * 1000);
}

function buildDailyExpenseTicks(values: number[]) {
  const maxValue = Math.max(...values, 0);
  const axisMax = Math.max(100, Math.ceil((maxValue * 2.25) / 50) * 50);
  const step = axisMax / 4;

  return Array.from({ length: 5 }, (_, index) => index * step);
}

function buildPaddedValueTicks(values: number[]) {
  const maxValue = Math.max(...values, 0);
  const axisMax = Math.max(1000, Math.ceil((maxValue * 1.25) / 500) * 500);
  const step = axisMax / 4;

  return Array.from({ length: 5 }, (_, index) => index * step);
}

function buildMonthChangeDomain(values: number[]): [number, number] {
  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values, 0);
  const lowerPadding = Math.max(700, Math.abs(minValue) * 1.5);
  const upperPadding = Math.max(300, Math.abs(maxValue) * 0.12);
  const domainMin = Math.floor((minValue - lowerPadding) / 100) * 100;
  const domainMax = Math.ceil((maxValue + upperPadding) / 100) * 100;

  return [domainMin, domainMax];
}
