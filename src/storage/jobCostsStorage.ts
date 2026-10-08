export type Job = { id: string; name: string };
export type WeeklyJobCost = { hours: string; money: string };
export type JobExpense = {
  id: string;
  name: string;
  costs: Record<string, WeeklyJobCost>;
};
export type JobCostsData = { jobs: Job[]; expenses: JobExpense[] };

type LegacyJob = Job & { expenses: (WeeklyJobCost & { id: string; name: string })[] };

const JOB_COSTS_STORAGE_KEY = 'growly-job-costs-v2';
const LEGACY_STORAGE_KEY = 'growly-job-costs-v1';
const DEFAULT_EXPENSE_NAMES = [
  'Commuting',
  'Work meals',
  'Work clothes',
  'Work footwear',
  'Accessories for work',
  'Work tools and equipment',
  'Professional training',
  'Professional memberships',
  'Childcare during work',
  'Unreimbursed business travel',
];

export function createJobExpense(jobs: Job[], name = ''): JobExpense {
  return {
    id: crypto.randomUUID(),
    name,
    costs: Object.fromEntries(jobs.map((job) => [job.id, { hours: '', money: '' }])),
  };
}

export function createDefaultJobCosts(): JobCostsData {
  const jobs = ['Job A', 'Job B', 'Job C', 'Job D'].map((name, index) => ({ id: `job-${index}`, name }));
  return { jobs, expenses: DEFAULT_EXPENSE_NAMES.map((name) => createJobExpense(jobs, name)) };
}

export function readJobCosts(): JobCostsData {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(JOB_COSTS_STORAGE_KEY) ?? 'null');
    if (isJobCostsData(saved)) return saved;

    const legacy: unknown = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) ?? 'null');
    if (Array.isArray(legacy) && legacy.length === 4 && legacy.every(isLegacyJob)
      && new Set(legacy.map((job) => job.id)).size === 4) {
      return migrateJobCosts(legacy);
    }
  } catch {
    // Start with defaults when browser storage is unavailable or invalid.
  }
  return createDefaultJobCosts();
}

export function saveJobCosts(data: JobCostsData): boolean {
  try {
    localStorage.setItem(JOB_COSTS_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function migrateJobCosts(legacy: LegacyJob[]): JobCostsData {
  const jobs = legacy.map(({ id, name }) => ({ id, name }));
  const expenses = DEFAULT_EXPENSE_NAMES.map((name) => createJobExpense(jobs, name));

  for (const job of legacy) {
    const assignedRows = new Set<string>();
    for (const expense of job.expenses) {
      if (!expense.name.trim() && !expense.hours && !expense.money) continue;
      const name = expense.name.trim() || 'Unnamed expense';
      let row = expenses.find((candidate) => candidate.name.trim().toLowerCase() === name.toLowerCase()
        && !assignedRows.has(candidate.id));
      if (!row) {
        row = createJobExpense(jobs, name);
        expenses.push(row);
      }
      row.costs[job.id] = { hours: expense.hours, money: expense.money };
      assignedRows.add(row.id);
    }
  }
  return { jobs, expenses };
}

function isWeeklyValue(value: unknown): value is string {
  return typeof value === 'string' && (value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0));
}

function isWeeklyJobCost(value: unknown): value is WeeklyJobCost {
  if (!value || typeof value !== 'object') return false;
  const cost = value as Partial<WeeklyJobCost>;
  return isWeeklyValue(cost.hours) && isWeeklyValue(cost.money);
}

function isJob(value: unknown): value is Job {
  if (!value || typeof value !== 'object') return false;
  const job = value as Partial<Job>;
  return typeof job.id === 'string' && typeof job.name === 'string';
}

function isLegacyJob(value: unknown): value is LegacyJob {
  if (!isJob(value)) return false;
  const job = value as Partial<LegacyJob>;
  return Array.isArray(job.expenses) && job.expenses.every((expense) => isJob(expense) && isWeeklyJobCost(expense));
}

function isJobCostsData(value: unknown): value is JobCostsData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<JobCostsData>;
  if (!Array.isArray(data.jobs) || data.jobs.length !== 4 || !data.jobs.every(isJob)
    || new Set(data.jobs.map((job) => job.id)).size !== 4 || !Array.isArray(data.expenses)) return false;
  const jobs = data.jobs;
  return data.expenses.every((expense: unknown) => {
    if (!isJob(expense)) return false;
    const row = expense as Partial<JobExpense>;
    return Boolean(row.costs && typeof row.costs === 'object'
      && jobs.every((job) => Object.prototype.hasOwnProperty.call(row.costs, job.id) && isWeeklyJobCost(row.costs![job.id])));
  }) && new Set(data.expenses.map((expense) => expense.id)).size === data.expenses.length;
}
