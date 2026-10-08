import { useEffect, useState } from 'react';
import { BriefcaseBusiness, Plus, Trash2 } from 'lucide-react';
import { buttonClasses } from '../constants/buttonStyles';
import { createJobExpense, readJobCosts, saveJobCosts, type JobCosts, type JobExpense } from '../storage/jobCostsStorage';

const inputClasses = 'min-h-10 w-full min-w-0 rounded-lg border border-slate-300/60 bg-white/70 px-2 py-2 text-sm text-slate-950 outline-none transition focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20';

export function JobCostsPage() {
  const [jobs, setJobs] = useState(readJobCosts);
  const [isSaved, setIsSaved] = useState(true);

  useEffect(() => {
    setIsSaved(saveJobCosts(jobs));
  }, [jobs]);

  function updateJob(nextJob: JobCosts) {
    setJobs((current) => current.map((job) => job.id === nextJob.id ? nextJob : job));
  }

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-3xl font-semibold tracking-normal text-slate-950">Job costs</h1>
        <p className="mt-2 text-sm text-slate-700">Compare weekly expenses and time commitments across different jobs. Find out your real net hourly wage.</p>
      </header>

      <div className="grid items-start gap-5 md:grid-cols-2 2xl:grid-cols-4">
        {jobs.map((job, index) => (
          <JobCostsCard key={job.id} job={job} position={index + 1} onChange={updateJob} />
        ))}
      </div>
      {!isSaved && (
        <p role="status" className="text-sm text-amber-800">Your changes could not be saved in this browser. Keep this page open to retain them.</p>
      )}
    </section>
  );
}

function JobCostsCard({ job, position, onChange }: {
  job: JobCosts;
  position: number;
  onChange: (job: JobCosts) => void;
}) {
  function updateExpense(nextExpense: JobExpense) {
    onChange({ ...job, expenses: job.expenses.map((expense) => expense.id === nextExpense.id ? nextExpense : expense) });
  }

  return (
    <article aria-label={job.name || `Job ${position}`} className="glass-panel min-w-0 rounded-2xl p-4">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-600">
          <BriefcaseBusiness aria-hidden="true" className="h-5 w-5" />
        </div>
        <h2 className="min-w-0 flex-1">
          <input
            aria-label={`Job ${position} name`}
            className={`${inputClasses} font-black`}
            placeholder={`Job ${position}`}
            value={job.name}
            onChange={(event) => onChange({ ...job, name: event.target.value })}
          />
        </h2>
      </div>

      <table className="w-full table-fixed text-left text-sm">
        <caption className="sr-only">Weekly expenses for {job.name || `Job ${position}`}</caption>
        <thead>
          <tr className="text-slate-700">
            <th scope="col" className="w-2/5 pb-3 pr-2 align-top font-black">Name of expense</th>
            <th scope="col" className="pb-3 pr-2 align-top font-black">Time<span className="block font-normal">hours/week</span></th>
            <th scope="col" className="pb-3 align-top font-black">Money<span className="block font-normal">CHF/week</span></th>
          </tr>
        </thead>
        <tbody>
          {job.expenses.map((expense, index) => (
            <JobExpenseRow
              key={expense.id}
              expense={expense}
              label={`${job.name || `Job ${position}`}, expense ${index + 1}`}
              onChange={updateExpense}
              onRemove={() => onChange({ ...job, expenses: job.expenses.filter((row) => row.id !== expense.id) })}
            />
          ))}
        </tbody>
      </table>
      {job.expenses.length === 0 && <p className="mb-3 text-sm text-slate-600">Add an expense to get started.</p>}
      <button
        type="button"
        className={buttonClasses({ className: 'mt-2 w-full' })}
        onClick={() => onChange({ ...job, expenses: [...job.expenses, createJobExpense()] })}
      >
        <Plus aria-hidden="true" className="h-4 w-4" /> Add expense
      </button>
    </article>
  );
}

function JobExpenseRow({ expense, label, onChange, onRemove }: {
  expense: JobExpense;
  label: string;
  onChange: (expense: JobExpense) => void;
  onRemove: () => void;
}) {
  function updateWeeklyValue(field: 'hours' | 'money', value: string) {
    if (value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0)) {
      onChange({ ...expense, [field]: value });
    }
  }

  return (
    <tr>
      <td className="pb-3 pr-2 align-top">
        <input
          aria-label={`${label}, name`}
          className={inputClasses}
          placeholder="Expense"
          value={expense.name}
          onChange={(event) => onChange({ ...expense, name: event.target.value })}
        />
        <button
          type="button"
          aria-label={`Remove ${label}`}
          className="mt-1 inline-flex min-h-8 items-center gap-1 rounded text-sm text-slate-500 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-blue-500"
          onClick={onRemove}
        >
          <Trash2 aria-hidden="true" className="h-3 w-3" /> Remove
        </button>
      </td>
      <td className="pb-3 pr-2 align-top">
        <input aria-label={`${label}, hours per week`} className={inputClasses} type="number" inputMode="decimal" min="0" step="any" placeholder="0" value={expense.hours} onChange={(event) => updateWeeklyValue('hours', event.target.value)} />
      </td>
      <td className="pb-3 align-top">
        <input aria-label={`${label}, CHF per week`} className={inputClasses} type="number" inputMode="decimal" min="0" step="any" placeholder="0" value={expense.money} onChange={(event) => updateWeeklyValue('money', event.target.value)} />
      </td>
    </tr>
  );
}
