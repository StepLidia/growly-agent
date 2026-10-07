import { describe, expect, it } from 'vitest';
import { assets } from '../finance';
import {
  PROGRESS_MONTHLY_RECORD_STORAGE_KEY,
  PROGRESS_SETTINGS_STORAGE_KEY,
  readProgressStorage,
  saveProgressMonthlyRecords,
  saveProgressSettings,
} from './progressStorage';
import { createLocalStorageBackup, importLocalStorageBackup } from './localStorageBackup';

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}

const january = { monthLabel: 'January 2026', recordedAt: new Date(2026, 0, 1).toISOString() };
const february = { monthLabel: 'February 2026', recordedAt: new Date(2026, 1, 1).toISOString() };

describe('progress storage', () => {
  it('keeps tracking usable when browser storage is restricted', () => {
    const storage = {
      getItem: () => { throw new Error('Storage unavailable'); },
      setItem: () => { throw new Error('Storage unavailable'); },
    };
    const { settings, monthlyRecords } = readProgressStorage(storage, 'plan-a', assets);

    expect(settings.planStarts).toEqual({});
    expect(settings.initialBalances.savings).toBe(25000);
    expect(monthlyRecords).toEqual({});
    expect(() => saveProgressSettings(storage, settings)).not.toThrow();
    expect(() => saveProgressMonthlyRecords(storage, {})).not.toThrow();
  });

  it('migrates the legacy start to Plan A and preserves its balances as shared history', () => {
    const storage = createStorage();
    const balances = { savings: 12000, investments: 8000, pillar2: 0, pillar3: 0 };
    storage.setItem('growly-progress-baseline-v1', JSON.stringify({ ...january, balances, totalWealth: 20000 }));

    const { settings, monthlyRecords } = readProgressStorage(storage, 'plan-a', assets);

    expect(settings.planStarts).toEqual({ 'plan-a': january });
    expect(settings.planStarts['plan-b']).toBeUndefined();
    expect(settings.initialBalances).toEqual(balances);
    expect(monthlyRecords['2026-01'].balances).toEqual(balances);
    expect(settings.planStarts['plan-a']).not.toHaveProperty('balances');
    expect(storage.getItem(PROGRESS_SETTINGS_STORAGE_KEY)).not.toBeNull();
  });

  it('keeps recorded monthly balances authoritative when the legacy baseline differs', () => {
    const storage = createStorage();
    storage.setItem('growly-progress-baseline-v1', JSON.stringify({ ...january, balances: { savings: 1 }, totalWealth: 1 }));
    saveProgressMonthlyRecords(storage, { '2026-01': { ...january, balances: { savings: 100 } } });

    expect(readProgressStorage(storage, 'plan-a', assets).monthlyRecords['2026-01'].balances.savings).toBe(100);
  });

  it('restores different start dates per plan without changing shared records', () => {
    const storage = createStorage();
    const original = readProgressStorage(storage, 'plan-a', assets);
    const records = { '2026-01': { ...january, balances: { savings: 123 } } };
    const settings = { ...original.settings, planStarts: { 'plan-a': january, 'plan-b': february } };
    saveProgressSettings(storage, settings);
    saveProgressMonthlyRecords(storage, records);

    const restored = readProgressStorage(storage, 'plan-a', assets.map((asset) => ({ ...asset, amount: 0 })));
    expect(restored.settings).toEqual(settings);
    expect(restored.monthlyRecords).toEqual(records);
  });

  it('runs migration only once so deleted balances are not resurrected on reload', () => {
    const storage = createStorage();
    storage.setItem('growly-progress-baseline-v1', JSON.stringify({ ...january, balances: { savings: 100 }, totalWealth: 100 }));
    readProgressStorage(storage, 'plan-a', assets);
    saveProgressMonthlyRecords(storage, {});

    expect(readProgressStorage(storage, 'plan-a', assets).monthlyRecords).toEqual({});
  });

  it('supports the legacy single monthly record format and skips invalid records', () => {
    const storage = createStorage();
    storage.setItem(PROGRESS_MONTHLY_RECORD_STORAGE_KEY, JSON.stringify({ ...january, balances: { savings: 0 } }));
    expect(readProgressStorage(storage, 'plan-a', assets).monthlyRecords['2026-01'].balances.savings).toBe(0);
    storage.setItem(PROGRESS_MONTHLY_RECORD_STORAGE_KEY, JSON.stringify({ bad: { recordedAt: 'invalid' } }));
    expect(readProgressStorage(storage, 'plan-a', assets).monthlyRecords).toEqual({});
  });

  it('backs up and imports plan starts and shared balances together', () => {
    const storage = createStorage();
    const original = readProgressStorage(storage, 'plan-a', assets);
    saveProgressSettings(storage, { ...original.settings, planStarts: { 'plan-a': january, 'plan-b': february } });
    saveProgressMonthlyRecords(storage, { '2026-01': { ...january, balances: { savings: 456 } } });
    const expected = readProgressStorage(storage, 'plan-a', assets);
    const backup = createLocalStorageBackup(storage);
    const destination = createStorage();

    importLocalStorageBackup(destination, JSON.stringify(backup));
    expect(readProgressStorage(destination, 'plan-a', assets)).toEqual(expected);
  });
});
