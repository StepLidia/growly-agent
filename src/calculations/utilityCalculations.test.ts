import { describe, expect, it } from 'vitest';
import { buildUtilityMonth, buildUtilityPeriods, getUtilityConsumption, type UtilityMonths } from './utilityCalculations';

describe('utility consumption', () => {
  it('calculates consumption, including unchanged and decimal readings', () => {
    expect(getUtilityConsumption(1200, 1000)).toBe(200);
    expect(getUtilityConsumption(100, 100)).toBe(0);
    expect(getUtilityConsumption(10.5, 10.25)).toBe(0.25);
    expect(getUtilityConsumption(5, 0)).toBe(5);
  });

  it('leaves gaps for missing, invalid, and reset readings', () => {
    expect(getUtilityConsumption(undefined, 1)).toBeNull();
    expect(getUtilityConsumption(1, undefined)).toBeNull();
    expect(getUtilityConsumption(50, 100)).toBeNull();
    expect(getUtilityConsumption(Infinity, 1)).toBeNull();
    expect(getUtilityConsumption(1, NaN)).toBeNull();
    expect(getUtilityConsumption(0, -1)).toBeNull();
  });

  it('normalizes month offsets across years', () => {
    expect(buildUtilityMonth(2026, -1)).toEqual({ key: '2025-12', label: 'December 2025', shortLabel: 'Dec' });
    expect(buildUtilityMonth(2026, 12).key).toBe('2027-01');
  });

  it('builds twelve monthly differences across a year boundary without bridging missing months', () => {
    const months: UtilityMonths = {
      '2025-12': { heater: 100, coldWater: 0, hotWater: 10 },
      '2026-01': { heater: 150, coldWater: 5, hotWater: 8 },
      '2026-03': { heater: 250 },
    };
    const periods = buildUtilityPeriods(months, '2026-03', 'month');
    expect(periods).toHaveLength(12);
    expect(periods[0].key).toBe('2025-04');
    expect(periods.find(({ key }) => key === '2026-01')).toMatchObject({ heater: 50, coldWater: 5, hotWater: null });
    expect(periods.at(-1)).toMatchObject({ heater: null, coldWater: null, hotWater: null });
  });

  it('totals known monthly consumption per year, with the selected year ending at the selected month', () => {
    const months: UtilityMonths = {
      '2024-12': { heater: 100, coldWater: 10 },
      '2025-01': { heater: 200, coldWater: 10 },
      '2025-11': { heater: 300 },
      '2025-12': { heater: 450 },
      '2026-01': { heater: 500 },
      '2026-02': { heater: 600 },
      '2026-03': { heater: 900 },
    };
    const periods = buildUtilityPeriods(months, '2026-02', 'year');
    expect(periods).toHaveLength(6);
    expect(periods[0]).toMatchObject({ key: '2021', heater: null });
    expect(periods.at(-2)).toMatchObject({ key: '2025', heater: 250, coldWater: 0 });
    expect(periods.at(-1)).toMatchObject({ key: '2026', shortLabel: '2026 YTD', heater: 150, coldWater: null });
    expect(buildUtilityPeriods(months, '2026-12', 'year').at(-1)?.shortLabel).toBe('2026');
  });
});
