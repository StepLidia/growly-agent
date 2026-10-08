export type JobTerms = {
  netSalary: string;
  vacationWeeks: string;
  hoursPerWeek: string;
};
export type Job = { id: string; name: string } & JobTerms;
export type WeeklyJobCost = { hours: string; money: string };
export type JobExpense = {
  id: string;
  name: string;
  costs: Record<string, WeeklyJobCost>;
};
export type JobCostsData = { jobs: Job[]; expenses: JobExpense[] };

const JOB_COSTS_STORAGE_KEY = 'growly-job-costs-v1';
const DEFAULT_EXPENSE_NAMES = [
  'Commuting',
  'Work Meals',
  'Coffee & Snacks',
  'Work Clothing',
  'Grooming & Appearance',
  'Professional Equipment',
  'Training & Certifications',
  'Professional Memberships',
  'Childcare & Dependent Care',
  'Convenience Purchases',
  'Decompression & Entertainment',
  'Health & Recovery',
  'Unpaid Work Preparation',
  'Miscellaneous Expenses',
];

export function createJobExpense(jobs: Job[], name = ''): JobExpense {
  return {
    id: crypto.randomUUID(),
    name,
    costs: Object.fromEntries(jobs.map((job) => [job.id, { hours: '', money: '' }])),
  };
}

export function createDefaultJobCosts(): JobCostsData {
  const jobs = ['Job A', 'Job B', 'Job C', 'Job D'].map((name, index) => ({
    id: `job-${index}`,
    name,
    netSalary: '',
    vacationWeeks: '',
    hoursPerWeek: '',
  }));
  return { jobs, expenses: DEFAULT_EXPENSE_NAMES.map((name) => createJobExpense(jobs, name)) };
}

export function readJobCosts(): JobCostsData {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(JOB_COSTS_STORAGE_KEY) ?? 'null');
    if (isJobCostsData(saved)) return saved;
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

function isWeeklyValue(value: unknown): value is string {
  return typeof value === 'string' && (value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0));
}

function isWeeklyJobCost(value: unknown): value is WeeklyJobCost {
  if (!value || typeof value !== 'object') return false;
  const cost = value as Partial<WeeklyJobCost>;
  return isWeeklyValue(cost.hours) && isWeeklyValue(cost.money);
}

function isNamedItem(value: unknown): value is { id: string; name: string } {
  if (!value || typeof value !== 'object') return false;
  const job = value as Partial<Job>;
  return typeof job.id === 'string' && typeof job.name === 'string';
}

function isJob(value: unknown): value is Job {
  if (!isNamedItem(value)) return false;
  const job = value as Partial<Job>;
  return isWeeklyValue(job.netSalary) && isWeeklyValue(job.vacationWeeks) && isWeeklyValue(job.hoursPerWeek);
}

function isJobCostsData(value: unknown): value is JobCostsData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<JobCostsData>;
  if (!Array.isArray(data.jobs) || data.jobs.length !== 4 || !data.jobs.every(isJob)
    || new Set(data.jobs.map((job) => job.id)).size !== 4 || !Array.isArray(data.expenses)) return false;
  const jobs = data.jobs;
  return data.expenses.every((expense: unknown) => {
    if (!isNamedItem(expense)) return false;
    const row = expense as Partial<JobExpense>;
    return Boolean(row.costs && typeof row.costs === 'object'
      && jobs.every((job) => Object.prototype.hasOwnProperty.call(row.costs, job.id) && isWeeklyJobCost(row.costs![job.id])));
  }) && new Set(data.expenses.map((expense) => expense.id)).size === data.expenses.length;
}
