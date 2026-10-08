type JobSalaryInputs = {
  annualNetSalary: number;
  vacationWeeks: number;
  hoursPerWeek: number;
};

export function calculateJobHourlySalary({ annualNetSalary, vacationWeeks, hoursPerWeek }: JobSalaryInputs): number | null {
  if (![annualNetSalary, vacationWeeks, hoursPerWeek].every(Number.isFinite)
    || annualNetSalary < 0 || vacationWeeks < 0 || vacationWeeks >= 52 || hoursPerWeek <= 0) {
    return null;
  }

  const annualWorkingHours = (52 - vacationWeeks) * hoursPerWeek;
  const hourlySalary = annualNetSalary / annualWorkingHours;
  return Number.isFinite(hourlySalary) ? hourlySalary : null;
}
