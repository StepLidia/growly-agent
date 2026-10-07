import type { FinancialAsset } from '../finance';

export const PROGRESS_SETTINGS_STORAGE_KEY = 'growly-progress-settings-v1';
export const PROGRESS_MONTHLY_RECORD_STORAGE_KEY = 'growly-progress-monthly-record-v1';
const LEGACY_BASELINE_STORAGE_KEY = 'growly-progress-baseline-v1';

export type ProgressStart = { monthLabel: string; recordedAt: string };
export type ProgressMonthlyRecord = ProgressStart & { balances: Record<string, number> };
export type SavedProgressMonthlyRecords = Record<string, ProgressMonthlyRecord>;
export type ProgressSettings = {
  initialBalances: Record<string, number>;
  planStarts: Record<string, ProgressStart>;
};

type ProgressStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const browserProgressStorage: ProgressStorage = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isBalances(value: unknown): value is Record<string, number> {
  return isRecord(value) && Object.values(value).every((balance) => typeof balance === 'number' && Number.isFinite(balance));
}

function isStart(value: unknown): value is ProgressStart {
  return isRecord(value) && typeof value.monthLabel === 'string' && typeof value.recordedAt === 'string'
    && Number.isFinite(new Date(value.recordedAt).getTime());
}

function isMonthlyRecord(value: unknown): value is ProgressMonthlyRecord {
  return isStart(value) && isBalances((value as ProgressMonthlyRecord).balances);
}

function monthKey(recordedAt: string) {
  const date = new Date(recordedAt);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function readJson(storage: ProgressStorage, key: string): unknown {
  try {
    const saved = storage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function saveJson(storage: ProgressStorage, key: string, value: unknown) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Keep tracking usable when browser storage is unavailable.
  }
}

export function readProgressStorage(storage: ProgressStorage, legacyPlanId: string, initialAssets: FinancialAsset[]) {
  const savedRecords = readJson(storage, PROGRESS_MONTHLY_RECORD_STORAGE_KEY);
  const monthlyRecords: SavedProgressMonthlyRecords = isMonthlyRecord(savedRecords)
    ? { [monthKey(savedRecords.recordedAt)]: savedRecords }
    : isRecord(savedRecords)
      ? Object.fromEntries(Object.entries(savedRecords).filter(([, record]) => isMonthlyRecord(record))) as SavedProgressMonthlyRecords
      : {};
  const savedSettings = readJson(storage, PROGRESS_SETTINGS_STORAGE_KEY);
  const initialBalances = Object.fromEntries(initialAssets.map(({ id, amount }) => [id, Math.max(0, amount)]));

  if (isRecord(savedSettings)) {
    const settings: ProgressSettings = {
      initialBalances: isBalances(savedSettings.initialBalances) ? savedSettings.initialBalances : initialBalances,
      planStarts: isRecord(savedSettings.planStarts)
        ? Object.fromEntries(Object.entries(savedSettings.planStarts).filter(([, start]) => isStart(start))) as Record<string, ProgressStart>
        : {},
    };
    return { settings, monthlyRecords };
  }

  const legacyBaseline = readJson(storage, LEGACY_BASELINE_STORAGE_KEY);
  const settings: ProgressSettings = { initialBalances, planStarts: {} };
  if (isMonthlyRecord(legacyBaseline)) {
    const { monthLabel, recordedAt, balances } = legacyBaseline;
    settings.initialBalances = { ...initialBalances, ...balances };
    settings.planStarts = { [legacyPlanId]: { monthLabel, recordedAt } };
    const key = monthKey(recordedAt);
    // An existing monthly record is the authoritative financial history.
    monthlyRecords[key] ??= { monthLabel, recordedAt, balances };
  }

  saveProgressSettings(storage, settings);
  saveProgressMonthlyRecords(storage, monthlyRecords);
  return { settings, monthlyRecords };
}

export function saveProgressSettings(storage: ProgressStorage, settings: ProgressSettings) {
  saveJson(storage, PROGRESS_SETTINGS_STORAGE_KEY, settings);
}

export function saveProgressMonthlyRecords(storage: ProgressStorage, records: SavedProgressMonthlyRecords) {
  saveJson(storage, PROGRESS_MONTHLY_RECORD_STORAGE_KEY, records);
}
