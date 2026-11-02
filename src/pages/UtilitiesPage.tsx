import { useEffect, useMemo, useState } from 'react';
import { Heater, CalendarDays, ChevronDown, Droplet } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  buildUtilityMonth, buildUtilityPeriods, utilityCounters,
  type UtilityAggregation, type UtilityCounter, type UtilityPeriod,
} from '../calculations/utilityCalculations';
import { MonthPicker } from '../components/MonthPicker';
import { buttonClasses } from '../constants/buttonStyles';
import { tooltipContentClasses } from '../constants/tooltipStyles';
import { currency } from '../finance';
import { readUtilities, saveUtilities } from '../storage/utilityStorage';
import { formatCounterValue, parseCounterValue } from '../calculations/counterNumberInput';

export function UtilitiesPage() {
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return buildUtilityMonth(today.getFullYear(), today.getMonth());
  });
  const [months, setMonths] = useState(readUtilities);
  const [aggregation, setAggregation] = useState<UtilityAggregation>('month');
  const [saveFailed, setSaveFailed] = useState(false);
  const periods = useMemo(() => buildUtilityPeriods(months, month.key, aggregation), [months, month.key, aggregation]);

  useEffect(() => {
    setSaveFailed(!saveUtilities(months));
  }, [months]);

  function updateReading(counter: UtilityCounter, value: number | undefined) {
    setMonths((current) => ({
      ...current,
      [month.key]: { ...current[month.key], [counter]: value },
    }));
  }

  return (
    <>
      <UtilitiesHeader
        aggregation={aggregation}
        month={month}
        onAggregationChange={setAggregation}
        onMonthChange={setMonth}
      />
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <section className="glass-panel min-w-0 p-4">
          <h2 className="text-sm font-bold text-slate-950">Counter Readings</h2>
          <p className="mt-1 text-sm text-slate-600">{month.label} · Enter the cumulative reading from each counter at the end of the month.</p>
          <div className="mt-5 space-y-4" key={month.key}>
            {utilityCounters.map((counter) => (
              <CounterReadingInput
                key={counter.id}
                counter={counter}
                value={months[month.key]?.[counter.id]}
                onChange={(value) => updateReading(counter.id, value)}
              />
            ))}
          </div>
          <p className="mt-5 rounded-lg border border-slate-400/45 bg-slate-200/25 px-3 py-2 text-sm text-slate-700">
            Consumption is the difference from the previous month. Missing readings and counter decreases leave gaps.
            Yearly totals include only months with valid differences, through the selected month in the selected year.
          </p>
          <p className="mt-3 text-sm text-slate-600" role="status">
            {saveFailed ? 'Browser storage is unavailable. Changes cannot be saved.' : 'Readings are saved automatically in this browser.'}
          </p>
        </section>
        {utilityCounters.map((counter) => (
          <UtilityConsumptionChart key={counter.id} counter={counter} periods={periods} aggregation={aggregation} />
        ))}
      </div>
    </>
  );
}

function UtilitiesHeader({ aggregation, month, onAggregationChange, onMonthChange }: {
  aggregation: UtilityAggregation;
  month: ReturnType<typeof buildUtilityMonth>;
  onAggregationChange: (aggregation: UtilityAggregation) => void;
  onMonthChange: (month: ReturnType<typeof buildUtilityMonth>) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-normal text-slate-950">Utilities</h1>
        <p className="mt-1 text-sm text-slate-700">Track your counter readings and understand your consumption.</p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div
          aria-label="Utility consumption aggregation"
          className="relative grid min-h-10 grid-cols-2 overflow-hidden rounded-lg border border-slate-300/30 bg-white/80 shadow-lg shadow-slate-400/10"
          role="group"
        >
          <span
            aria-hidden="true"
            className={`absolute inset-y-0 left-0 w-1/2 rounded-lg bg-blue-500 shadow-lg shadow-blue-600/20 transition-transform duration-300 ease-out ${aggregation === 'year' ? 'translate-x-full' : 'translate-x-0'}`}
          />
          {(['month', 'year'] as const).map((mode) => (
            <button
              key={mode}
              className={`relative z-10 min-h-10 px-4 py-2 text-sm font-bold transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/30 ${aggregation === mode ? 'text-white' : 'text-blue-900 hover:text-blue-600'}`}
              aria-pressed={aggregation === mode}
              type="button"
              onClick={() => onAggregationChange(mode)}
            >
              {mode === 'month' ? 'Month' : 'Year'}
            </button>
          ))}
        </div>
        <div className="relative" onKeyDown={(event) => { if (event.key === 'Escape') setPickerOpen(false); }}>
          <button
            className={buttonClasses({ className: 'w-48 shrink-0 whitespace-nowrap' })}
            aria-controls="utilities-month-picker"
            aria-expanded={pickerOpen}
            type="button"
            onClick={() => setPickerOpen((open) => !open)}
          >
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span>{month.label}</span>
            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${pickerOpen ? 'rotate-180' : ''}`} />
          </button>
          {pickerOpen && (
            <MonthPicker
              buildMonth={buildUtilityMonth}
              className="right-0 top-12"
              id="utilities-month-picker"
              selectedMonth={month}
              onMonthChange={(nextMonth) => { onMonthChange(nextMonth); setPickerOpen(false); }}
            />
          )}
        </div>
      </div>
    </header>
  );
}

type CounterDefinition = typeof utilityCounters[number];

function UtilityCounterIcon({ counter }: { counter: UtilityCounter }) {
  const Icon = counter === 'heater' ? Heater : Droplet;
  const colorClasses = {
    heater: 'bg-orange-600/10 text-orange-600',
    coldWater: 'bg-blue-500/12 text-blue-600',
    hotWater: 'bg-rose-500/12 text-rose-600',
  };

  return (
    <span aria-hidden="true" className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${colorClasses[counter]}`}>
      <Icon className="h-5 w-5" />
    </span>
  );
}

function CounterReadingInput({ counter, value, onChange }: {
  counter: CounterDefinition;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  const [draft, setDraft] = useState(() => formatCounterValue(value));

  useEffect(() => {
    setDraft(formatCounterValue(value));
  }, [value]);

  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={`utility-${counter.id}`} className="flex items-center gap-2 text-sm font-bold text-slate-700">
        <UtilityCounterIcon counter={counter.id} />
        {counter.label}
      </label>
      <div className="flex min-w-0 items-center gap-2">
        <input
          id={`utility-${counter.id}`}
          className="glass-input w-32 min-w-0 py-1! text-right text-sm font-bold text-slate-950 outline-none"
          type="text"
          inputMode="decimal"
          placeholder="No reading"
          value={draft}
          onChange={(event) => {
            const nextValue = parseCounterValue(event.currentTarget.value);
            if (nextValue === null) return;
            setDraft(formatCounterValue(nextValue));
            onChange(nextValue);
          }}
        />
        <span className="w-8 text-sm font-bold text-slate-600">{counter.unit}</span>
      </div>
    </div>
  );
}

function UtilityConsumptionChart({ counter, periods, aggregation }: {
  counter: CounterDefinition;
  periods: UtilityPeriod[];
  aggregation: UtilityAggregation;
}) {
  const hasConsumption = periods.some((period) => period[counter.id] !== null);

  return (
    <section className="glass-panel min-w-0 p-4">
      <div className="flex items-center gap-3">
        <UtilityCounterIcon counter={counter.id} />
        <div>
          <h2 className="text-sm font-bold text-slate-950">{counter.label} Consumption</h2>
          <p className="mt-1 text-sm text-slate-600">{aggregation === 'month' ? 'Monthly' : 'Yearly'} consumption · {counter.unit}</p>
        </div>
      </div>
      <div className="mt-4 h-64 min-w-0">
        {hasConsumption ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={periods} margin={{ top: 12, right: 12, bottom: 8, left: 4 }} accessibilityLayer>
              <CartesianGrid stroke="#cbd5e1" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="shortLabel" tick={{ fill: '#64748b', fontSize: 14 }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis tickFormatter={(value: number) => currency(value, true)} tick={{ fill: '#64748b', fontSize: 14 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                content={({ active, payload }) => {
                  const period = payload?.[0]?.payload as UtilityPeriod | undefined;
                  if (!active || !period || period[counter.id] === null) return null;
                  return (
                    <div className={tooltipContentClasses('px-3 py-2')}>
                      <p className="text-sm font-bold">{period.label}</p>
                      <p className="mt-1 text-sm">{currency(period[counter.id]!)} {counter.unit}</p>
                    </div>
                  );
                }}
              />
              <Line type="linear" dataKey={counter.id} name={counter.label} stroke={counter.color} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 px-5 text-center text-sm text-slate-600">
            Enter readings for two consecutive months to see {counter.label.toLowerCase()} consumption.
          </div>
        )}
      </div>
    </section>
  );
}
