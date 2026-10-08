export type JobExpense = {
  id: string;
  name: string;
  hours: string;
  money: string;
};

export type JobCosts = {
  id: string;
  name: string;
  expenses: JobExpense[];
};

const JOB_COSTS_STORAGE_KEY = 'growly-job-costs-v1';
const JOB_NAMES = ['Job A', 'Job B', 'Job C', 'Job D'];

export function createJobExpense(): JobExpense {
  return { id: crypto.randomUUID(), name: '', hours: '', money: '' };
}

function createDefaultJobs(): JobCosts[] {
  return JOB_NAMES.map((name, index) => ({
    id: `job-${index}`,
    name,
    expenses: [createJobExpense(), createJobExpense(), createJobExpense()],
  }));
}

export function readJobCosts(): JobCosts[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(JOB_COSTS_STORAGE_KEY) ?? 'null');
    if (Array.isArray(saved) && saved.length === 4 && saved.every(isJobCosts)
      && new Set(saved.map((job) => job.id)).size === 4) {
      return saved;
    }
  } catch {
    // Use empty jobs when storage is unavailable or saved data is invalid.
  }
  return createDefaultJobs();
}

export function saveJobCosts(jobs: JobCosts[]): boolean {
  try {
    localStorage.setItem(JOB_COSTS_STORAGE_KEY, JSON.stringify(jobs));
    return true;
  } catch {
    return false;
  }
}

function isWeeklyValue(value: unknown): value is string {
  return typeof value === 'string' && (value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0));
}

function isJobCosts(value: unknown): value is JobCosts {
  if (!value || typeof value !== 'object') return false;
  const job = value as Partial<JobCosts>;
  return typeof job.id === 'string' && typeof job.name === 'string'
    && Array.isArray(job.expenses) && job.expenses.every((expense: unknown) => {
      if (!expense || typeof expense !== 'object') return false;
      const row = expense as Partial<JobExpense>;
      return typeof row.id === 'string' && typeof row.name === 'string'
        && isWeeklyValue(row.hours) && isWeeklyValue(row.money);
    }) && new Set(job.expenses.map((expense) => expense.id)).size === job.expenses.length;
}
