import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  buildCarFinancingProjection,
  buildCarNetGainProjection,
  type CarFinancingSummary,
} from '../calculations/carFinancingCalculations';
import { colorClasses } from '../constants/colors';
import { tooltipClasses, tooltipContentClasses } from '../constants/tooltipStyles';
import { currency } from '../finance';

type CarFinancingChartsProps = {
  creditAnnualInterestRate: number;
  creditAnnualTaxAdvantage: number;
  creditDownPayment: number;
  creditExpectedResaleValue: number;
  creditSummary: CarFinancingSummary;
  creditVehiclePrice: number;
  horizonYears: number;
  leasingAnnualInterestRate: number;
  leasingBuyoutOption: boolean;
  leasingResidualValue: number;
  leasingSummary: CarFinancingSummary;
};

type CarChartMetric = 'monthlyPayment' | 'netGain';

type CarChartPoint = {
  creditMonthlyInterestCost: number;
  creditMonthlyPayment: number;
  creditMonthlyPrincipalRepayment: number;
  creditNetGain: number;
  leasingMonthlyInterestCost: number;
  leasingCumulativeInterestCost: number;
  leasingMonthlyPayment: number;
  leasingMonthlyPrincipalRepayment: number;
  leasingNetGain: number;
  month: number;
  year: number;
};

const carBorrowedBadgeClasses = {
  credit: 'border-emerald-300/50 bg-emerald-500/10 text-emerald-700',
  leasing: 'border-blue-300/50 bg-blue-500/10 text-blue-700',
};
const leasingInterestColor = '#fb7185';
const creditInterestColor = '#dc2626';

export function CarFinancingCharts({
  creditAnnualInterestRate,
  creditAnnualTaxAdvantage,
  creditDownPayment,
  creditExpectedResaleValue,
  creditSummary,
  creditVehiclePrice,
  horizonYears,
  leasingAnnualInterestRate,
  leasingBuyoutOption,
  leasingResidualValue,
  leasingSummary,
}: CarFinancingChartsProps) {
  const points = buildCarChartPoints({
    creditAnnualInterestRate,
    creditAnnualTaxAdvantage,
    creditDownPayment,
    creditExpectedResaleValue,
    creditSummary,
    creditVehiclePrice,
    horizonYears,
    leasingAnnualInterestRate,
    leasingBuyoutOption,
    leasingResidualValue,
    leasingSummary,
  });

  return (
    <div className="grid min-w-0 gap-3 md:grid-cols-2">
      <CarFinancingChartCard
        creditSummary={creditSummary}
        creditAnnualTaxAdvantage={creditAnnualTaxAdvantage}
        data={points}
        horizonYears={horizonYears}
        leasingBuyoutOption={leasingBuyoutOption}
        leasingResidualValue={leasingResidualValue}
        leasingSummary={leasingSummary}
        metric="monthlyPayment"
        subtitle="Monthly payment schedule over the selected horizon"
        title="Payments per Month"
      />
      <CarFinancingChartCard
        creditSummary={creditSummary}
        creditAnnualTaxAdvantage={creditAnnualTaxAdvantage}
        data={points}
        horizonYears={horizonYears}
        leasingBuyoutOption={leasingBuyoutOption}
        leasingResidualValue={leasingResidualValue}
        leasingSummary={leasingSummary}
        metric="netGain"
        subtitle="Net value over the selected horizon"
        title="Total Net Gain"
      />
    </div>
  );
}

function CarFinancingChartCard({
  creditSummary,
  creditAnnualTaxAdvantage,
  data,
  horizonYears,
  leasingBuyoutOption,
  leasingResidualValue,
  leasingSummary,
  metric,
  subtitle,
  title,
}: {
  creditSummary: CarFinancingSummary;
  creditAnnualTaxAdvantage: number;
  data: CarChartPoint[];
  horizonYears: number;
  leasingBuyoutOption: boolean;
  leasingResidualValue: number;
  leasingSummary: CarFinancingSummary;
  metric: CarChartMetric;
  subtitle: string;
  title: string;
}) {
  const leasingKey = metric === 'monthlyPayment' ? 'leasingMonthlyPayment' : 'leasingNetGain';
  const creditKey = metric === 'monthlyPayment' ? 'creditMonthlyPayment' : 'creditNetGain';
  const extraKeys = metric === 'monthlyPayment'
    ? (['leasingMonthlyInterestCost', 'creditMonthlyInterestCost'] as const)
    : ([] as const);
  const values = data.flatMap((point) => [
    point[leasingKey],
    point[creditKey],
    ...extraKeys.map((key) => point[key]),
  ]);
  const ticks = metric === 'monthlyPayment' ? buildValueTicks(Math.max(...values, 1)) : buildSignedValueTicks(values);
  const minValue = ticks[0] ?? 0;
  const maxValue = ticks.at(-1) ?? 1;
  const maxYear = Math.max(horizonYears, 1);
  const gradientId = `car-${metric}-gradient`;

  return (
    <article className="glass-panel min-w-0 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-950">{title}</h2>
          <p className="mt-1 text-xs font-medium text-slate-600">{subtitle}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          <BorrowedBadge label="Leasing" value={leasingSummary.financedAmount} variant="leasing" />
          <BorrowedBadge label="Credit" value={creditSummary.financedAmount} variant="credit" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-bold text-slate-700">
        <ChartLegendItem color={colorClasses.blue.stroke} label="Leasing" />
        <ChartLegendItem color={colorClasses.emerald.stroke} label="Credit" />
        {metric === 'monthlyPayment' && (
          <>
            <ChartLegendItem color={leasingInterestColor} dashed label="Leasing interest" />
            <ChartLegendItem color={creditInterestColor} dashed label="Credit interest" />
          </>
        )}
      </div>

      <div className="mt-2 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 14, right: 12, bottom: 6, left: -6 }}>
            <defs>
              <linearGradient id={`${gradientId}-leasing`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={colorClasses.blue.stroke} stopOpacity={0.22} />
                <stop offset="48%" stopColor={colorClasses.blue.stroke} stopOpacity={0.1} />
                <stop offset="100%" stopColor={colorClasses.blue.stroke} stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id={`${gradientId}-credit`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={colorClasses.emerald.stroke} stopOpacity={0.2} />
                <stop offset="48%" stopColor={colorClasses.emerald.stroke} stopOpacity={0.09} />
                <stop offset="100%" stopColor={colorClasses.emerald.stroke} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(100,116,139,.18)" strokeDasharray="0" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="year"
              domain={[0, maxYear]}
              interval="preserveStartEnd"
              tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
              tickLine={false}
              ticks={buildYearTicks(maxYear)}
              type="number"
            />
            <YAxis
              axisLine={false}
              domain={[minValue, maxValue]}
              tick={{ fill: '#475569', fontSize: 10, fontWeight: 500 }}
              tickFormatter={formatAxisValue}
              tickLine={false}
              ticks={ticks}
              width={48}
            />
            <Tooltip
              content={<CarFinancingTooltip metric={metric} />}
              cursor={{ stroke: colorClasses.blue.stroke, strokeDasharray: '3 5', strokeOpacity: 0.45, strokeWidth: 1.5 }}
              isAnimationActive={false}
              wrapperStyle={{ outline: 'none', pointerEvents: 'none' }}
            />
            <Area
              activeDot={{ r: 5, fill: colorClasses.blue.stroke, stroke: 'white', strokeWidth: 2 }}
              dataKey={leasingKey}
              dot={false}
              fill={`url(#${gradientId}-leasing)`}
              isAnimationActive={false}
              name="Leasing"
              stroke={colorClasses.blue.stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              type={metric === 'monthlyPayment' ? 'stepAfter' : 'monotone'}
            />
            <Area
              activeDot={{ r: 5, fill: colorClasses.emerald.stroke, stroke: 'white', strokeWidth: 2 }}
              dataKey={creditKey}
              dot={false}
              fill={`url(#${gradientId}-credit)`}
              isAnimationActive={false}
              name="Credit"
              stroke={colorClasses.emerald.stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              type={metric === 'monthlyPayment' ? 'stepAfter' : 'monotone'}
            />
            {metric === 'monthlyPayment' && (
              <>
                <Area
                  activeDot={{ r: 4, fill: leasingInterestColor, stroke: 'white', strokeWidth: 2 }}
                  dataKey="leasingMonthlyInterestCost"
                  dot={false}
                  fill="transparent"
                  isAnimationActive={false}
                  name="Leasing interest"
                  stroke={leasingInterestColor}
                  strokeDasharray="4 5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  type="monotone"
                />
                <Area
                  activeDot={{ r: 4, fill: creditInterestColor, stroke: 'white', strokeWidth: 2 }}
                  dataKey="creditMonthlyInterestCost"
                  dot={false}
                  fill="transparent"
                  isAnimationActive={false}
                  name="Credit interest"
                  stroke={creditInterestColor}
                  strokeDasharray="4 5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  type="monotone"
                />
                <Area
                  dataKey="leasingMonthlyPrincipalRepayment"
                  dot={false}
                  fill="transparent"
                  isAnimationActive={false}
                  stroke="transparent"
                  type="monotone"
                />
                <Area
                  dataKey="creditMonthlyPrincipalRepayment"
                  dot={false}
                  fill="transparent"
                  isAnimationActive={false}
                  stroke="transparent"
                  type="monotone"
                />
              </>
            )}
            {metric === 'netGain' && (
              <ReferenceLine stroke="rgba(71,85,105,.46)" strokeDasharray="4 5" y={0} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-center text-sm font-semibold text-slate-600">Years</p>
      {metric === 'monthlyPayment' && (
        <div className="mt-3 rounded-lg border border-slate-200/50 bg-slate-200/35 px-3 py-3 text-sm font-bold text-slate-700 shadow-inner shadow-white/40 backdrop-blur-md">
          Total money paid at the end:{' '}
          <span className="text-blue-700">
            Leasing {currency(calculateLeasingTotalMoneyPaid({ buyoutOption: leasingBuyoutOption, residualValue: leasingResidualValue, summary: leasingSummary }))} CHF
          </span>
          <span className="text-slate-500">, </span>
          <span className="text-emerald-700">
            Credit {currency(calculateCreditTotalMoneyPaid({ annualTaxAdvantage: creditAnnualTaxAdvantage, summary: creditSummary }))} CHF
          </span>
          <span className="group relative ml-1 inline-flex align-super">
            <button
              aria-describedby="credit-total-tax-savings-tooltip"
              aria-label="Credit total includes tax savings"
              className="text-pink-400 transition hover:text-pink-500 focus:outline-none"
              type="button"
            >
              *
            </button>
            <span
              id="credit-total-tax-savings-tooltip"
              role="tooltip"
              className={tooltipClasses('bottom-5 left-1/2 w-max -translate-x-1/2 whitespace-nowrap px-3 py-2')}
            >
              Including tax savings
            </span>
          </span>
        </div>
      )}
    </article>
  );
}

function calculateTotalMoneyPaid(summary: CarFinancingSummary) {
  return summary.monthlyPayment * summary.durationMonths;
}

function calculateLeasingTotalMoneyPaid({
  buyoutOption,
  residualValue,
  summary,
}: {
  buyoutOption: boolean;
  residualValue: number;
  summary: CarFinancingSummary;
}) {
  return calculateTotalMoneyPaid(summary) + (buyoutOption ? Math.max(residualValue, 0) : 0);
}

function calculateCreditTaxSavings({
  annualTaxAdvantage,
  summary,
}: {
  annualTaxAdvantage: number;
  summary: CarFinancingSummary;
}) {
  return Math.max(annualTaxAdvantage, 0) * (summary.durationMonths / 12);
}

function calculateCreditTotalMoneyPaid({
  annualTaxAdvantage,
  summary,
}: {
  annualTaxAdvantage: number;
  summary: CarFinancingSummary;
}) {
  return calculateTotalMoneyPaid(summary) - calculateCreditTaxSavings({ annualTaxAdvantage, summary });
}

function BorrowedBadge({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: keyof typeof carBorrowedBadgeClasses;
}) {
  return (
    <span className={`rounded-lg border px-2 py-1 text-sm font-semibold ${carBorrowedBadgeClasses[variant]}`}>
      {label} borrowed {currency(value)} CHF
    </span>
  );
}

function ChartLegendItem({ color, dashed = false, label }: { color: string; dashed?: boolean; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className={`h-0.5 w-6 ${dashed ? 'border-t-2 border-dashed bg-transparent' : ''}`}
        style={dashed ? { borderColor: color } : { backgroundColor: color }}
      />
      {label}
    </span>
  );
}

type CarFinancingTooltipProps = {
  active?: boolean;
  label?: number | string;
  metric: CarChartMetric;
  payload?: Array<{ dataKey?: string; value?: number }>;
};

function CarFinancingTooltip({ active, label, metric, payload }: CarFinancingTooltipProps) {
  const leasingKey = metric === 'monthlyPayment' ? 'leasingMonthlyPayment' : 'leasingNetGain';
  const creditKey = metric === 'monthlyPayment' ? 'creditMonthlyPayment' : 'creditNetGain';
  const leasingValue = payload?.find(({ dataKey }) => dataKey === leasingKey)?.value;
  const creditValue = payload?.find(({ dataKey }) => dataKey === creditKey)?.value;
  const leasingInterestValue = payload?.find(({ dataKey }) => dataKey === 'leasingMonthlyInterestCost')?.value;
  const creditInterestValue = payload?.find(({ dataKey }) => dataKey === 'creditMonthlyInterestCost')?.value;
  const leasingPrincipalRepayment = payload?.find(({ dataKey }) => dataKey === 'leasingMonthlyPrincipalRepayment')?.value;
  const creditPrincipalRepayment = payload?.find(({ dataKey }) => dataKey === 'creditMonthlyPrincipalRepayment')?.value;

  if (!active || typeof leasingValue !== 'number' || typeof creditValue !== 'number') {
    return null;
  }

  return (
    <div className={tooltipContentClasses('-translate-y-3 px-3 py-2')}>
      <p className="font-bold text-slate-950">{formatTooltipMonth(Number(label))}</p>
      <p className="mt-1 text-blue-700">Leasing: {currency(leasingValue)} CHF</p>
      <p className="text-emerald-700">Credit: {currency(creditValue)} CHF</p>
      {metric === 'monthlyPayment' && typeof leasingInterestValue === 'number' && typeof creditInterestValue === 'number' && (
        <>
          <p className="mt-1 text-rose-400">Leasing interest: {currency(leasingInterestValue)} CHF</p>
          <p className="text-red-600">Credit interest: {currency(creditInterestValue)} CHF</p>
          {typeof leasingPrincipalRepayment === 'number' && typeof creditPrincipalRepayment === 'number' && (
            <>
              <p className="mt-1 text-slate-500">Leasing principal: {currency(leasingPrincipalRepayment)} CHF</p>
              <p className="text-slate-700">Credit principal: {currency(creditPrincipalRepayment)} CHF</p>
            </>
          )}
        </>
      )}
    </div>
  );
}

function buildCarChartPoints({
  creditAnnualInterestRate,
  creditAnnualTaxAdvantage,
  creditDownPayment,
  creditExpectedResaleValue,
  creditSummary,
  creditVehiclePrice,
  horizonYears,
  leasingAnnualInterestRate,
  leasingBuyoutOption,
  leasingResidualValue,
  leasingSummary,
}: CarFinancingChartsProps): CarChartPoint[] {
  const leasingPoints = buildCarFinancingProjection({
    annualInterestRate: leasingAnnualInterestRate,
    horizonYears,
    summary: leasingSummary,
  });
  const creditPoints = buildCarFinancingProjection({
    annualInterestRate: creditAnnualInterestRate,
    horizonYears,
    summary: creditSummary,
  });
  const netGainPoints = buildCarNetGainProjection({
    creditAnnualTaxAdvantage,
    creditDownPayment,
    creditExpectedResaleValue,
    creditVehiclePrice,
    creditSummary,
    horizonYears,
    leasingBuyoutOption,
    leasingResidualValue,
    leasingSummary,
  });

  return leasingPoints.map((leasingPoint, index) => {
    const creditPoint = creditPoints[index] ?? leasingPoint;
    const netGainPoint = netGainPoints[index] ?? { creditNetGain: 0, leasingNetGain: 0 };

    return {
      creditMonthlyInterestCost: Math.round(creditPoint.monthlyInterestCost),
      creditMonthlyPayment: Math.round(creditPoint.monthlyPayment),
      creditMonthlyPrincipalRepayment: Math.round(creditPoint.monthlyPrincipalRepayment),
      creditNetGain: Math.round(netGainPoint.creditNetGain),
      leasingCumulativeInterestCost: Math.round(leasingPoint.cumulativeInterestCost),
      leasingMonthlyInterestCost: Math.round(leasingPoint.monthlyInterestCost),
      leasingMonthlyPayment: Math.round(leasingPoint.monthlyPayment),
      leasingMonthlyPrincipalRepayment: Math.round(leasingPoint.monthlyPrincipalRepayment),
      leasingNetGain: Math.round(netGainPoint.leasingNetGain),
      month: Math.round(leasingPoint.year * 12),
      year: leasingPoint.year,
    };
  });
}

function buildValueTicks(maxValue: number) {
  const roughStep = maxValue / 5;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  const niceNormalizedStep = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = niceNormalizedStep * magnitude;
  const niceMax = Math.max(step, Math.ceil(maxValue / step) * step);

  return Array.from({ length: 6 }, (_, index) => (niceMax / 5) * index);
}

function buildYearTicks(maxYear: number) {
  const step = Math.max(1, Math.ceil(maxYear / 6));
  const ticks = Array.from({ length: Math.floor(maxYear / step) + 1 }, (_, index) => index * step);

  return ticks.at(-1) === maxYear ? ticks : [...ticks, maxYear];
}

function buildSignedValueTicks(values: number[]) {
  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values, 0);
  const rawLimit = Math.max(Math.abs(minValue), Math.abs(maxValue), 1);
  const roughStep = (rawLimit * 2) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  const niceNormalizedStep = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = niceNormalizedStep * magnitude;
  const niceLimit = Math.max(step, Math.ceil(rawLimit / step) * step);

  return [-niceLimit, -niceLimit / 2, 0, niceLimit / 2, niceLimit];
}

function formatAxisValue(value: number) {
  if (value === 0) {
    return '0';
  }

  const sign = value < 0 ? '-' : '';
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 1000000) {
    return `${sign}${Number((absoluteValue / 1000000).toFixed(absoluteValue >= 10000000 ? 0 : 1))}M`;
  }

  if (absoluteValue >= 1000) {
    return `${sign}${Number((absoluteValue / 1000).toFixed(absoluteValue >= 100000 ? 0 : 1))}K`;
  }

  return `${sign}${Math.round(absoluteValue)}`;
}

function formatTooltipMonth(value: number) {
  if (!Number.isFinite(value)) {
    return 'Year 0, Month 0';
  }

  const totalMonths = Math.max(Math.round(value * 12), 0);
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  return `Year ${years}, Month ${months}`;
}
