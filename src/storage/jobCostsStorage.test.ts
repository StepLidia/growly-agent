import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDefaultJobCosts, readJobCosts, saveJobCosts } from './jobCostsStorage';

afterEach(() => vi.unstubAllGlobals());

describe('shared job costs storage', () => {
  it('provides fourteen shared work expenses with independent blank values for four jobs', () => {
    const data = createDefaultJobCosts();
    expect(data.jobs.map((job) => job.name)).toEqual(['Job A', 'Job B', 'Job C', 'Job D']);
    expect(data.expenses.map((expense) => expense.name)).toEqual([
      'Commuting', 'Work Meals', 'Coffee & Snacks', 'Work Clothing',
      'Grooming & Appearance', 'Professional Equipment', 'Training & Certifications',
      'Professional Memberships', 'Childcare & Dependent Care', 'Convenience Purchases',
      'Decompression & Entertainment', 'Health & Recovery', 'Unpaid Work Preparation',
      'Miscellaneous Expenses',
    ]);
    for (const expense of data.expenses) {
      expect(Object.keys(expense.costs)).toEqual(data.jobs.map((job) => job.id));
      expect(Object.values(expense.costs)).toEqual(Array(4).fill({ hours: '', money: '' }));
    }
    data.expenses[0].costs['job-0'].money = '25';
    expect(data.expenses[0].costs['job-1'].money).toBe('');
  });

  it('restores the shared data without reintroducing removed default rows', () => {
    const stored = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
    });
    const data = createDefaultJobCosts();
    data.expenses = [];
    data.jobs[0].netSalary = '85000';
    data.jobs[0].vacationWeeks = '5';
    data.jobs[0].hoursPerWeek = '40';
    expect(saveJobCosts(data)).toBe(true);
    expect([...stored.keys()]).toEqual(['growly-job-costs-v1']);
    expect(readJobCosts()).toEqual(data);
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
    expect(readJobCosts().expenses).toHaveLength(14);
    expect(saveJobCosts(createDefaultJobCosts())).toBe(false);
  });
});
