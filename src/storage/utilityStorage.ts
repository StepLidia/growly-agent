import { utilityCounters, type UtilityMonths } from '../calculations/utilityCalculations';

const UTILITIES_STORAGE_KEY = 'growly-utilities-v1';

export function readUtilities(): UtilityMonths {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(UTILITIES_STORAGE_KEY) ?? '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const months: UtilityMonths = {};
    for (const [key, readings] of Object.entries(parsed)) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key) || !readings || typeof readings !== 'object' || Array.isArray(readings)) continue;
      months[key] = {};
      for (const { id } of utilityCounters) {
        const value: unknown = (readings as Record<string, unknown>)[id];
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0) months[key][id] = value;
      }
    }
    return months;
  } catch {
    return {};
  }
}

export function saveUtilities(months: UtilityMonths) {
  try {
    localStorage.setItem(UTILITIES_STORAGE_KEY, JSON.stringify(months));
    return true;
  } catch {
    return false;
  }
}
