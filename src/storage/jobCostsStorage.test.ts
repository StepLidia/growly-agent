import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDefaultJobCosts, migrateJobCosts, readJobCosts, saveJobCosts } from './jobCostsStorage';

afterEach(() => vi.unstubAllGlobals());

describe('shared job costs storage', () => {
  it('provides ten shared work expenses with independent blank values for four jobs', () => {
    const data = createDefaultJobCosts();
    expect(data.jobs.map((job) => job.name)).toEqual(['Job A', 'Job B', 'Job C', 'Job D']);
    expect(data.expenses).toHaveLength(10);
    expect(data.expenses[0].name).toBe('Commuting');
    for (const expense of data.expenses) {
      expect(Object.keys(expense.costs)).toEqual(data.jobs.map((job) => job.id));
      expect(Object.values(expense.costs)).toEqual(Array(4).fill({ hours: '', money: '' }));
    }
    data.expenses[0].costs['job-0'].money = '25';
    expect(data.expenses[0].costs['job-1'].money).toBe('');
  });

  it('aligns matching legacy names and retains duplicates, custom names and unnamed values', () => {
    const legacy = createDefaultJobCosts().jobs.map((job) => ({ ...job, expenses: [] as { id: string; name: string; hours: string; money: string }[] }));
    legacy[0].name = 'Office';
    legacy[0].expenses = [
      { id: 'a', name: 'Commuting', hours: '3.5', money: '40' },
      { id: 'b', name: 'Commuting', hours: '1', money: '10' },
      { id: 'c', name: '', hours: '2', money: '' },
      { id: 'd', name: 'License renewal', hours: '', money: '5' },
      { id: 'e', name: '', hours: '', money: '' },
    ];
    legacy[1].expenses = [{ id: 'f', name: ' commuting ', hours: '6', money: '80' }];
    const data = migrateJobCosts(legacy);
    expect(data.jobs[0].name).toBe('Office');
    const commuting = data.expenses.filter((expense) => expense.name === 'Commuting');
    expect(commuting).toHaveLength(2);
    expect(commuting[0].costs['job-0']).toEqual({ hours: '3.5', money: '40' });
    expect(commuting[0].costs['job-1']).toEqual({ hours: '6', money: '80' });
    expect(commuting[1].costs['job-0']).toEqual({ hours: '1', money: '10' });
    expect(data.expenses.find((expense) => expense.name === 'Unnamed expense')?.costs['job-0'].hours).toBe('2');
    expect(data.expenses.find((expense) => expense.name === 'License renewal')?.costs['job-0'].money).toBe('5');
    expect(data.expenses).toHaveLength(13);
  });

  it('restores the shared data without reintroducing removed default rows', () => {
    const stored = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
    });
    const data = createDefaultJobCosts();
    data.expenses = [];
    expect(saveJobCosts(data)).toBe(true);
    expect(readJobCosts()).toEqual(data);
  });

  it('migrates v1 storage and keeps the original saved entries', () => {
    const legacy = createDefaultJobCosts().jobs.map((job) => ({ ...job, expenses: [] }));
    const stored = new Map([['growly-job-costs-v1', JSON.stringify(legacy)]]);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
    });
    const migrated = readJobCosts();
    expect(migrated.expenses).toHaveLength(10);
    saveJobCosts(migrated);
    expect(stored.get('growly-job-costs-v1')).toBe(JSON.stringify(legacy));
    expect(readJobCosts()).toEqual(migrated);
  });

  it('rejects saved rows with missing job inputs and handles unavailable storage', () => {
    const data = createDefaultJobCosts();
    delete data.expenses[0].costs['job-0'];
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(data) });
    expect(readJobCosts().expenses[0].costs['job-0']).toEqual({ hours: '', money: '' });
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('Unavailable'); },
      setItem: () => { throw new Error('Unavailable'); },
    });
    expect(readJobCosts().expenses).toHaveLength(10);
    expect(saveJobCosts(createDefaultJobCosts())).toBe(false);
  });
});
