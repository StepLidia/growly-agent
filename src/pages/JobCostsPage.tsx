import { Fragment, useEffect, useId, useState } from 'react';
import { BriefcaseBusiness, Info, Plus, Trash2 } from 'lucide-react';
import { buttonClasses } from '../constants/buttonStyles';
import { tooltipClasses } from '../constants/tooltipStyles';
import { createJobExpense, readJobCosts, saveJobCosts, type Job, type JobExpense, type JobTerms, type WeeklyJobCost } from '../storage/jobCostsStorage';

const jobNameFieldClasses = 'glass-input glass-input-job-name min-h-14 w-full min-w-0 py-2! text-md';
const numberInputClasses = 'glass-input w-full min-w-0 py-1! text-right text-sm font-black text-slate-950 outline-none';
const separatorClasses = 'border-l border-slate-400/80';
const jobIconColors = [
  'bg-blue-500/10 text-blue-600',
  'bg-violet-500/10 text-violet-600',
  'bg-emerald-500/10 text-emerald-600',
  'bg-amber-500/10 text-amber-600',
];

export function JobCostsPage() {
  const [data, setData] = useState(readJobCosts);
  const [isSaved, setIsSaved] = useState(true);

  useEffect(() => {
    setIsSaved(saveJobCosts(data));
  }, [data]);

  function updateExpense(nextExpense: JobExpense) {
    setData((current) => ({
      ...current,
      expenses: current.expenses.map((expense) => expense.id === nextExpense.id ? nextExpense : expense),
    }));
  }

  function updateJobName(id: string, name: string) {
    setData((current) => ({ ...current, jobs: current.jobs.map((job) => job.id === id ? { ...job, name } : job) }));
  }

  function removeExpense(id: string) {
    setData((current) => ({ ...current, expenses: current.expenses.filter((expense) => expense.id !== id) }));
  }

  function updateJobTerm(id: string, field: keyof JobTerms, value: string) {
    if (value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0)) return;
    setData((current) => ({
      ...current,
      jobs: current.jobs.map((job) => job.id === id ? { ...job, [field]: value } : job),
    }));
  }

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-3xl font-semibold tracking-normal text-slate-950">Job costs</h1>
        <p className="mt-2 text-sm text-slate-700">Compare weekly expenses and time commitments across different jobs. Find out your real net hourly wage.</p>
      </header>

      <div className="min-w-0 overflow-x-auto">
        <div className="min-w-5xl">
          <div className="mx-px mb-3 flex px-4">
            <div aria-hidden="true" className="w-64 shrink-0" />
            <div className="grid min-w-0 flex-1 grid-cols-4">
              {data.jobs.map((job, index) => (
                <div key={job.id} className="min-w-0 px-3">
                  <label className={jobNameFieldClasses}>
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${jobIconColors[index]}`}>
                      <BriefcaseBusiness aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <input
                      aria-label={`Job ${index + 1} name`}
                      className="w-full min-w-0 bg-transparent font-black text-slate-950 outline-none"
                      placeholder={`Job ${index + 1}`}
                      value={job.name}
                      onChange={(event) => updateJobName(job.id, event.target.value)}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
          <JobTermsCard jobs={data.jobs} onChange={updateJobTerm} />
          <article aria-label="Weekly job cost comparison" className="glass-panel min-w-0 rounded-2xl p-4">
            <table className="w-full table-fixed border-collapse text-left text-sm">
              <caption className="sr-only">Shared work expenses with weekly hours and CHF for each job</caption>
              <colgroup>
                <col className="w-64" />
                {data.jobs.map((job) => <col key={job.id} span={2} />)}
              </colgroup>
              <thead>
                <tr className="text-slate-700">
                  <th scope="col" className="pb-4 pr-4 align-top font-bold">
                    <span className="inline-flex items-center gap-2">
                      Name of expense
                      <ExpenseDefinitionHint />
                    </span>
                  </th>
                  {data.jobs.map((job) => (
                    <Fragment key={job.id}>
                      <th scope="col" className={`${separatorClasses} px-3 pb-4 font-bold`}>Time<span className="block font-normal">hours/week</span></th>
                      <th scope="col" className="px-3 pb-4 font-bold">Money<span className="block font-normal">CHF/week</span></th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.expenses.map((expense, index) => (
                  <JobExpenseRow key={expense.id} expense={expense} jobs={data.jobs} position={index + 1} onChange={updateExpense} onRemove={() => removeExpense(expense.id)} />
                ))}
                <tr>
                  <td className="pr-4 pt-2">
                    <button
                      type="button"
                      className={buttonClasses({ className: 'w-full' })}
                      onClick={() => setData((current) => ({ ...current, expenses: [...current.expenses, createJobExpense(current.jobs)] }))}
                    >
                      <Plus aria-hidden="true" className="h-4 w-4" /> Add expense
                    </button>
                  </td>
                  {data.jobs.map((job) => <td key={job.id} colSpan={2} className={separatorClasses} />)}
                </tr>
              </tbody>
            </table>
          </article>
        </div>
      </div>
      {!isSaved && (
        <p role="status" className="text-sm text-amber-800">Your changes could not be saved in this browser. Keep this page open to retain them.</p>
      )}
    </section>
  );
}

const jobTermRows: { field: keyof JobTerms; label: string }[] = [
  { field: 'netSalary', label: 'Net salary after taxes CHF/year' },
  { field: 'vacationWeeks', label: 'Vacation weeks' },
  { field: 'hoursPerWeek', label: 'Hours per week' },
];

function JobTermsCard({ jobs, onChange }: {
  jobs: Job[];
  onChange: (id: string, field: keyof JobTerms, value: string) => void;
}) {
  return (
    <article aria-label="Job salary and working hours" className="glass-panel mb-3 min-w-0 rounded-2xl p-4">
      <table className="w-full table-fixed border-collapse text-left text-sm">
        <caption className="sr-only">Annual net salary, vacation weeks and weekly working hours for each job</caption>
        <colgroup>
          <col className="w-64" />
          {jobs.map((job) => <col key={job.id} />)}
        </colgroup>
        <tbody>
          {jobTermRows.map(({ field, label }, rowIndex) => (
            <tr key={field}>
              <th scope="row" className={`pr-4 font-bold text-slate-950 ${rowIndex < 2 ? 'pb-1' : ''}`}>{label}</th>
              {jobs.map((job, index) => (
                <td key={job.id} className={`${separatorClasses} px-3 ${rowIndex < 2 ? 'pb-1' : ''}`}>
                  <input
                    aria-label={`${job.name || `Job ${index + 1}`}, ${label}`}
                    className={numberInputClasses}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={job[field]}
                    onChange={(event) => onChange(job.id, field, event.target.value)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

function ExpenseDefinitionHint() {
  const tooltipId = useId();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className="group relative" data-tooltip-open={isOpen} onMouseLeave={() => setIsOpen(false)}>
      <button
        type="button"
        aria-label="About job expenses"
        aria-describedby={tooltipId}
        className="grid h-5 w-5 place-items-center rounded-full text-slate-500 transition hover:bg-white/50 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-500"
        onClick={() => setIsOpen((current) => !current)}
        onBlur={() => setIsOpen(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setIsOpen(false);
            event.currentTarget.blur();
          }
        }}
      >
        <Info aria-hidden="true" className="h-4 w-4" />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className={tooltipClasses('left-0 top-7 w-64 p-3 text-xs! leading-5 group-hover:opacity-100 group-focus-within:opacity-100')}
      >
        Expenses that wouldn't normally occur in your life without this job
      </span>
    </span>
  );
}

function JobExpenseRow({ expense, jobs, position, onChange, onRemove }: {
  expense: JobExpense;
  jobs: Job[];
  position: number;
  onChange: (expense: JobExpense) => void;
  onRemove: () => void;
}) {
  const label = expense.name || `Expense ${position}`;

  function updateCost(jobId: string, cost: WeeklyJobCost) {
    onChange({ ...expense, costs: { ...expense.costs, [jobId]: cost } });
  }

  return (
    <tr>
      <th scope="row" className="pb-1 pr-4 font-normal">
        <div className="flex items-center gap-2">
          <input
            aria-label={`Expense ${position} name`}
            className="w-full min-w-0 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20"
            placeholder="Expense"
            value={expense.name}
            onChange={(event) => onChange({ ...expense, name: event.target.value })}
          />
          <button
            type="button"
            aria-label={`Remove ${label}`}
            title={`Remove ${label}`}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-red-500/10 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-blue-500"
            onClick={onRemove}
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </th>
      {jobs.map((job, index) => (
        <JobCostCells
          key={job.id}
          cost={expense.costs[job.id]}
          label={`${job.name || `Job ${index + 1}`}, ${label}`}
          onChange={(cost) => updateCost(job.id, cost)}
        />
      ))}
    </tr>
  );
}

function JobCostCells({ cost, label, onChange }: {
  cost: WeeklyJobCost;
  label: string;
  onChange: (cost: WeeklyJobCost) => void;
}) {
  function updateWeeklyValue(field: keyof WeeklyJobCost, value: string) {
    if (value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0)) {
      onChange({ ...cost, [field]: value });
    }
  }

  return (
    <>
      <td className={`${separatorClasses} px-3 pb-1`}>
        <input aria-label={`${label}, hours per week`} className={numberInputClasses} type="number" inputMode="decimal" min="0" step="any" placeholder="0" value={cost.hours} onChange={(event) => updateWeeklyValue('hours', event.target.value)} />
      </td>
      <td className="px-3 pb-1">
        <input aria-label={`${label}, CHF per week`} className={numberInputClasses} type="number" inputMode="decimal" min="0" step="any" placeholder="0" value={cost.money} onChange={(event) => updateWeeklyValue('money', event.target.value)} />
      </td>
    </>
  );
}
