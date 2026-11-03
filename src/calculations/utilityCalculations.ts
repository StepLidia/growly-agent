export const utilityCounters = [
  { id: 'heater', label: 'Heater', unit: 'kWh', color: '#EA580C' },
  { id: 'coldWater', label: 'Cold water', unit: 'm³', color: '#2563EB' },
  { id: 'hotWater', label: 'Hot water', unit: 'm³', color: '#EE758B' },
] as const;

export type UtilityCounter = typeof utilityCounters[number]['id'];
export type UtilityReadings = Partial<Record<UtilityCounter, number>>;
export type UtilityMonths = Record<string, UtilityReadings>;
export type UtilityAggregation = 'month' | 'year';
export type UtilityPeriod = {
  key: string;
  label: string;
  shortLabel: string;
} & Record<UtilityCounter, number | null>;

export function buildUtilityMonth(year: number, monthIndex: number) {
  const date = new Date(year, monthIndex, 1);
  return {
    key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    shortLabel: date.toLocaleDateString('en-US', { month: 'short' }),
  };
}

export function getUtilityConsumption(current: number | undefined, previous: number | undefined) {
  if (current === undefined || previous === undefined || !Number.isFinite(current) || !Number.isFinite(previous)
    || current < 0 || previous < 0 || current < previous) return null;
  return current - previous;
}

export function buildUtilityPeriods(months: UtilityMonths, endMonth: string, aggregation: UtilityAggregation): UtilityPeriod[] {
  const [year, month] = endMonth.split('-').map(Number);
  const count = aggregation === 'month' ? 12 : 6;

  return Array.from({ length: count }, (_, index) => {
    const offset = index - count + 1;
    const period = aggregation === 'month' ? buildUtilityMonth(year, month - 1 + offset) : null;
    const periodYear = year + offset;
    const monthCount = aggregation === 'month' ? 1 : periodYear === year ? month : 12;
    const values: Record<UtilityCounter, number | null> = { heater: null, coldWater: null, hotWater: null };

    for (let monthIndex = 0; monthIndex < monthCount; monthIndex += 1) {
      const current = period ?? buildUtilityMonth(periodYear, monthIndex);
      const [currentYear, currentMonth] = current.key.split('-').map(Number);
      const previous = buildUtilityMonth(currentYear, currentMonth - 2);
      for (const { id } of utilityCounters) {
        const consumption = getUtilityConsumption(months[current.key]?.[id], months[previous.key]?.[id]);
        if (consumption !== null) values[id] = (values[id] ?? 0) + consumption;
      }
    }

    return {
      key: period?.key ?? String(periodYear),
      label: period?.label ?? `${periodYear} (Jan–${buildUtilityMonth(periodYear, monthCount - 1).shortLabel})`,
      shortLabel: period ? `${period.shortLabel} ${period.key.slice(2, 4)}` : `${periodYear}${monthCount < 12 ? ' YTD' : ''}`,
      ...values,
    };
  });
}
