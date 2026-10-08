type JobSalaryInputs = {
  annualNetSalary: number;
  vacationWeeks: number;
  hoursPerWeek: number;
};

export function calculateJobHourlySalary({ annualNetSalary, vacationWeeks, hoursPerWeek }: JobSalaryInputs): number | null {
  if (!isValidJobSalary({ annualNetSalary, vacationWeeks, hoursPerWeek })) {
    return null;
  }

  const annualWorkingHours = (52 - vacationWeeks) * hoursPerWeek;
  const hourlySalary = annualNetSalary / annualWorkingHours;
  return Number.isFinite(hourlySalary) ? hourlySalary : null;
}

type JobExpenseInputs = { hoursPerWeek: number; moneyPerWeek: number };

export function calculateJobHourlySalaryAfterExpenses({
  annualNetSalary,
  vacationWeeks,
  hoursPerWeek,
  expenses,
}: JobSalaryInputs & { expenses: JobExpenseInputs[] }): number | null {
  if (!isValidJobSalary({ annualNetSalary, vacationWeeks, hoursPerWeek })
    || expenses.some((expense) => !Number.isFinite(expense.hoursPerWeek) || expense.hoursPerWeek < 0
      || !Number.isFinite(expense.moneyPerWeek) || expense.moneyPerWeek < 0)) {
    return null;
  }

  const workingWeeks = 52 - vacationWeeks;
  const expenseHoursPerWeek = expenses.reduce((sum, expense) => sum + expense.hoursPerWeek, 0);
  const expenseMoneyPerWeek = expenses.reduce((sum, expense) => sum + expense.moneyPerWeek, 0);
  const remainingAnnualSalary = annualNetSalary - expenseMoneyPerWeek * workingWeeks;
  const totalAnnualHours = (hoursPerWeek + expenseHoursPerWeek) * workingWeeks;
  if (!Number.isFinite(remainingAnnualSalary) || !Number.isFinite(totalAnnualHours)) return null;

  const hourlySalary = remainingAnnualSalary / totalAnnualHours;
  return Number.isFinite(hourlySalary) ? hourlySalary : null;
}

function isValidJobSalary({ annualNetSalary, vacationWeeks, hoursPerWeek }: JobSalaryInputs): boolean {
  return [annualNetSalary, vacationWeeks, hoursPerWeek].every(Number.isFinite)
    && annualNetSalary >= 0 && vacationWeeks >= 0 && vacationWeeks < 52 && hoursPerWeek > 0;
}
