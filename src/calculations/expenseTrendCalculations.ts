import { getPercent } from './percent';

export type ExpenseTrendAggregationMode = 'month' | 'year';

export type ExpenseTrendCategory = {
  id: string;
  label: string;
  color: string;
  value: number;
};

export type ExpenseTrendMonth = {
  key: string;
  label: string;
  shortLabel: string;
};

export type ExpenseTrendPeriod = {
  key: string;
  label: string;
  shortLabel: string;
  endMonth: ExpenseTrendMonth;
  categories: ExpenseTrendCategory[];
  cashFlow: number;
  income: number;
  savingsRate: number;
  totalExpenses: number;
  averageExpense: number;
  includedMonthCount: number;
  changeAmount: number | null;
  highestCategory: ExpenseTrendCategory | null;
};

type BuildExpenseTrendPeriodsOptions = {
  aggregationMode: ExpenseTrendAggregationMode;
  endMonth: ExpenseTrendMonth;
  periodCount: number;
  readExpenses: (monthKey: string) => ExpenseTrendCategory[];
  readMonthlyIncome: (monthKey: string) => number;
  currentCategories?: ExpenseTrendCategory[];
  currentMonthlyIncome?: number;
  currentDate?: Date;
  endYearMonthCount?: number;
};

type ExpensePeriodDescriptor = {
  key: string;
  label: string;
  shortLabel: string;
  endMonth: ExpenseTrendMonth;
  monthKeys: string[];
};

export function buildExpenseTrendPeriods({
  aggregationMode,
  endMonth,
  periodCount,
  readExpenses,
  readMonthlyIncome,
  currentCategories,
  currentMonthlyIncome,
  currentDate = new Date(),
  endYearMonthCount,
}: BuildExpenseTrendPeriodsOptions): ExpenseTrendPeriod[] {
  const descriptors = buildPeriodDescriptors(aggregationMode, endMonth, periodCount, currentDate, endYearMonthCount);

  return descriptors.map((descriptor) => {
    const categories = aggregateCategories(
      descriptor.monthKeys.flatMap((monthKey) =>
        monthKey === endMonth.key && currentCategories ? currentCategories : readExpenses(monthKey),
      ),
    );
    const income = descriptor.monthKeys.reduce(
      (sum, monthKey) =>
        sum +
        (monthKey === endMonth.key && typeof currentMonthlyIncome === 'number'
          ? currentMonthlyIncome
          : readMonthlyIncome(monthKey)),
      0,
    );
    const totalExpenses = getCategoryTotal(categories);
    const cashFlow = income - totalExpenses;
    const previousDescriptor = buildPreviousPeriodDescriptor(aggregationMode, descriptor);
    const previousTotal = getCategoryTotal(
      aggregateCategories(
        previousDescriptor.monthKeys.flatMap((monthKey) =>
          monthKey === endMonth.key && currentCategories ? currentCategories : readExpenses(monthKey),
        ),
      ),
    );
    const highestCategory = [...categories].sort((first, second) => second.value - first.value)[0] ?? null;

    return {
      key: descriptor.key,
      label: descriptor.label,
      shortLabel: descriptor.shortLabel,
      endMonth: descriptor.endMonth,
      categories,
      cashFlow,
      income,
      savingsRate: getPercent(cashFlow, income),
      totalExpenses,
      averageExpense:
        aggregationMode === 'year'
          ? totalExpenses / descriptor.monthKeys.length
          : totalExpenses / getDaysInExpenseMonth(descriptor.endMonth),
      includedMonthCount: descriptor.monthKeys.length,
      changeAmount: previousTotal > 0 ? totalExpenses - previousTotal : null,
      highestCategory,
    };
  });
}

export function getPreviousExpenseTrendEndMonth(
  firstPeriod: ExpenseTrendPeriod,
  aggregationMode: ExpenseTrendAggregationMode,
) {
  if (aggregationMode === 'year') {
    return buildExpenseMonth(Number(firstPeriod.key) - 1, 11);
  }

  const [year, month] = firstPeriod.endMonth.key.split('-').map(Number);

  return buildExpenseMonth(year, month - 2);
}

function buildPeriodDescriptors(
  aggregationMode: ExpenseTrendAggregationMode,
  endMonth: ExpenseTrendMonth,
  periodCount: number,
  currentDate: Date,
  endYearMonthCount?: number,
) {
  const [endYear, endMonthNumber] = endMonth.key.split('-').map(Number);

  if (aggregationMode === 'year') {
    return Array.from({ length: periodCount }, (_, index) => {
      const year = endYear - periodCount + index + 1;
      const isCurrentYear = year === currentDate.getFullYear();
      const isEndYear = year === endYear;
      const includedMonthCount = isEndYear && endYearMonthCount !== undefined
        ? clampMonthCount(endYearMonthCount)
        : isCurrentYear
          ? currentDate.getMonth() + 1
          : 12;

      return buildYearDescriptor(year, includedMonthCount, isCurrentYear);
    });
  }

  return Array.from({ length: periodCount }, (_, index) => {
    const month = buildExpenseMonth(endYear, endMonthNumber - periodCount + index);

    return {
      key: month.key,
      label: month.label,
      shortLabel: month.shortLabel,
      endMonth: month,
      monthKeys: [month.key],
    };
  });
}

function buildPreviousPeriodDescriptor(
  aggregationMode: ExpenseTrendAggregationMode,
  descriptor: ExpensePeriodDescriptor,
) {
  if (aggregationMode === 'year') {
    return buildYearDescriptor(Number(descriptor.key) - 1, descriptor.monthKeys.length);
  }

  const [year, month] = descriptor.endMonth.key.split('-').map(Number);
  const previousMonth = buildExpenseMonth(year, month - 2);

  return {
    key: previousMonth.key,
    label: previousMonth.label,
    shortLabel: previousMonth.shortLabel,
    endMonth: previousMonth,
    monthKeys: [previousMonth.key],
  };
}

function buildYearDescriptor(year: number, includedMonthCount = 12, isYtd = false): ExpensePeriodDescriptor {
  const normalizedMonthCount = clampMonthCount(includedMonthCount);

  return {
    key: String(year),
    label: isYtd ? `${year} YTD` : String(year),
    shortLabel: isYtd ? `${year} YTD` : String(year),
    endMonth: buildExpenseMonth(year, normalizedMonthCount - 1),
    monthKeys: Array.from({ length: normalizedMonthCount }, (_, monthIndex) => buildExpenseMonth(year, monthIndex).key),
  };
}

function clampMonthCount(monthCount: number) {
  return Math.min(12, Math.max(1, Math.round(monthCount)));
}

function aggregateCategories(categories: ExpenseTrendCategory[]) {
  const totals = new Map<string, ExpenseTrendCategory>();

  for (const category of categories) {
    const existingCategory = totals.get(category.id);

    totals.set(category.id, {
      id: category.id,
      label: category.label,
      color: category.color,
      value: (existingCategory?.value ?? 0) + category.value,
    });
  }

  return [...totals.values()];
}

function buildExpenseMonth(year: number, monthIndex: number): ExpenseTrendMonth {
  const date = new Date(year, monthIndex, 1);

  return {
    key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    label: date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    }),
    shortLabel: date.toLocaleDateString('en-US', {
      month: 'short',
    }),
  };
}

function getCategoryTotal(categories: ExpenseTrendCategory[]) {
  return categories.reduce((sum, category) => sum + category.value, 0);
}

function getDaysInExpenseMonth(expenseMonth: ExpenseTrendMonth) {
  const [year, month] = expenseMonth.key.split('-').map(Number);

  return new Date(year, month, 0).getDate();
}
