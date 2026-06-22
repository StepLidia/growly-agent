import { type ReactNode } from 'react';
import { Building2, CircleHelp, Goal, Info, Landmark, ShieldCheck, TrendingUp } from 'lucide-react';
import { currency, type AssetKind, type calculateDashboard, type FinancialAsset } from '../finance';
import { colorClasses } from '../constants/colors';
import { tooltipClasses } from '../constants/tooltipStyles';
import { useEditableNumber } from '../hooks/useEditableNumber';

type Asset = ReturnType<typeof calculateDashboard>['assets'][number];

export function AssetCard({
  asset,
  onChange,
}: {
  asset: Asset;
  onChange: (
    id: AssetKind,
    field: keyof Pick<FinancialAsset, 'amount' | 'monthlyContribution' | 'annualReturn'>,
    value: number,
  ) => void;
}) {
  const Icon =
    asset.id === 'savings' ? Landmark : asset.id === 'investments' ? TrendingUp : asset.id === 'pillar2' ? ShieldCheck : Building2;
  const colors = colorClasses[asset.color];
  const isPillar2 = asset.id === 'pillar2';

  return (
    <article className="glass-panel w-full min-w-0 overflow-visible p-4 hover:z-30 focus-within:z-30">
      <div className="flex min-w-0 items-center gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-2xl border ${colors.border} ${colors.bg} ${colors.text}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-950">{asset.label}</h2>
          <p className="text-sm text-slate-600">{asset.subtitle}</p>
        </div>
      </div>
      <div className="mt-4 space-y-2.5 text-sm">
        <EditableField
          label="Current Amount"
          value={asset.amount}
          suffix="CHF"
          min={0}
          step={500}
          onChange={(value) => onChange(asset.id, 'amount', value)}
        />
        <EditableField
          label={isPillar2 ? 'Monthly saving part' : 'Monthly Contribution'}
          labelExtra={
            isPillar2 ? (
              <span className="group relative">
                <button
                  type="button"
                  className="grid h-5 w-5 place-items-center rounded-full text-slate-500 transition hover:bg-white/50 hover:text-blue-700"
                  aria-label="Show monthly saving part hint"
                  aria-describedby="monthly-saving-part-hint"
                >
                  <CircleHelp className="h-4 w-4" />
                </button>
                <span
                  id="monthly-saving-part-hint"
                  role="tooltip"
                  className={tooltipClasses('left-0 top-6 w-56 p-3 leading-5')}
                >
                  You can find this value in your most recent annual pension fund statement.
                </span>
              </span>
            ) : undefined
          }
          value={asset.monthlyContribution}
          suffix="CHF"
          min={0}
          step={100}
          onChange={(value) => onChange(asset.id, 'monthlyContribution', value)}
        />
        <EditableField
          label="Expected Yearly Rate"
          value={asset.annualReturn}
          suffix="%"
          step={0.05}
          onChange={(value) => onChange(asset.id, 'annualReturn', value)}
        />
        <ReadonlyField label="Years" value={asset.years} suffix="years" />
      </div>
      <div className="mt-4 border-t border-slate-300/45 pt-4">
        <div className="flex min-h-7 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="flex min-w-0 items-center gap-2 text-sm font-bold">
            <Goal className={`h-4 w-4 ${colors.text}`} />
            Future Value
            <span className="group relative">
              <button
                type="button"
                className="grid h-5 w-5 place-items-center rounded-full text-slate-500 transition hover:bg-white/50 hover:text-blue-700"
                aria-label="Show future value hint"
                aria-describedby="future-value-hint"
              >
                <Info className="h-4 w-4" />
              </button>
              <span
                id="future-value-hint"
                role="tooltip"
                className={tooltipClasses('left-0 top-6 w-48 p-3 leading-5')}
              >
                Using yearly compounding
              </span>
            </span>
          </div>
          <div className={`wrap-break-word text-left text-xl font-bold leading-none sm:text-right ${colors.text}`}>
            {currency(asset.futureValue)}
            <span className="ml-1 text-sm">CHF</span>
          </div>
        </div>
      </div>
    </article>
  );
}

function ReadonlyField({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return (
    <div className="grid min-w-0 grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_8rem] sm:gap-3">
      <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-slate-800">
        <span className="truncate">{label}</span>
      </span>
      <span className="glass-input grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2 text-sm font-normal text-slate-700">
        <span className="min-w-0 flex-1 text-right">{value}</span>
        <span className="whitespace-nowrap text-sm font-normal text-slate-600">{suffix}</span>
      </span>
    </div>
  );
}

function EditableField({
  label,
  labelExtra,
  value,
  suffix,
  min,
  step,
  onChange,
}: {
  label: string;
  labelExtra?: ReactNode;
  value: number;
  suffix: string;
  min?: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const isMoney = suffix === 'CHF';
  const { inputValue, onInputChange } = useEditableNumber(value, onChange, isMoney ? { format: 'money' } : undefined);

  return (
    <div className="grid min-w-0 grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_8rem] sm:gap-3">
      <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-slate-800">
        <span className="truncate">{label}</span>
        {labelExtra}
      </span>
      <span className="glass-input grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2 text-sm">
        <input
          aria-label={label}
          className="w-full min-w-0 bg-transparent text-right font-black text-slate-950 outline-none"
          inputMode={isMoney ? 'numeric' : 'decimal'}
          min={min}
          step={step}
          type={isMoney ? 'text' : 'number'}
          value={inputValue}
          onChange={(event) => onInputChange(event.currentTarget.value)}
        />
        <span className="font-semibold text-slate-600">{suffix}</span>
      </span>
    </div>
  );
}
