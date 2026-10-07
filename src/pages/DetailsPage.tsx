import { type CSSProperties } from 'react';
import { getPercent } from '../calculations/percent';
import { colorClasses } from '../constants/colors';
import { type calculateDashboard, type AssetKind, type FinancialAsset, type IncomePlan } from '../finance';
import { AssetCard } from '../components/AssetCard';
import { Header } from '../components/Header';
import { IncomeCard } from '../components/IncomeCard';
import { InsightsCard } from '../components/InsightsCard';
import { ProjectionCard } from '../components/ProjectionCard';
import { SummaryCard } from '../components/SummaryCard';

const MAX_PROJECTION_YEARS = 80;

type DetailsPageProps = {
  dashboard: ReturnType<typeof calculateDashboard>;
  importStatus: string;
  importStatusTone: 'error' | 'success';
  isExporting: boolean;
  isImporting: boolean;
  projectionYears: number;
  onAssetChange: (
    id: AssetKind,
    field: keyof Pick<FinancialAsset, 'amount' | 'monthlyContribution' | 'annualReturn'>,
    value: number,
  ) => void;
  onExportJsonBackup: () => void;
  onExportPdf: () => void;
  onImportJsonBackup: (file: File) => Promise<void> | void;
  onIncomeChange: (field: keyof Pick<IncomePlan, 'monthlyNetIncome'>, value: number) => void;
  onProjectionYearsChange: (value: number) => void;
};

export function DetailsPage({
  dashboard,
  importStatus,
  importStatusTone,
  isExporting,
  isImporting,
  projectionYears,
  onAssetChange,
  onExportJsonBackup,
  onExportPdf,
  onImportJsonBackup,
  onIncomeChange,
  onProjectionYearsChange,
}: DetailsPageProps) {
  return (
    <>
      <Header
        title="Details"
        subtitle="State of your financial situation"
        importStatus={importStatus}
        importStatusTone={importStatusTone}
        isExporting={isExporting}
        isImporting={isImporting}
        onExportJsonBackup={onExportJsonBackup}
        onExportPdf={onExportPdf}
        onImportJsonBackup={onImportJsonBackup}
      />
      <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2 2xl:grid-cols-4">
        {dashboard.assets.map((asset) => (
          <AssetCard key={asset.id} asset={asset} onChange={onAssetChange} />
        ))}
      </div>
      <div className="mt-3 grid min-w-0 items-stretch gap-3 xl:grid-cols-4">
        <div className="h-full xl:col-span-2">
          <IncomeCard
            income={dashboard.income}
            futureBuildingPercent={dashboard.futureBuildingPercent}
            onChange={onIncomeChange}
          />
        </div>
        <div className="h-full">
          <SummaryCard
            totalWealth={dashboard.totalWealth}
            pensionWealth={dashboard.pensionWealth}
            liquidWealth={dashboard.liquidWealth}
            projectionYears={projectionYears}
          />
        </div>
        <div className="h-full">
          <InsightsCard insightAmounts={dashboard.insightAmounts} projectionYears={projectionYears} />
        </div>
      </div>
      <YearsSlider value={projectionYears} onChange={onProjectionYearsChange} />
      <div className="mt-3 grid min-w-0 gap-3 xl:grid-cols-3">
        <ProjectionCard
          title="Total Wealth Over Time"
          amount={dashboard.totalWealth}
          subtitle="All accounts combined"
          points={dashboard.totalProjection}
          comparisonPoints={dashboard.zeroReturnTotalProjection}
          palette={colorClasses.blue}
        />
        <ProjectionCard
          title="Pension Wealth"
          note="2nd + 3rd Pillar"
          amount={dashboard.pensionWealth}
          subtitle="Future pension capital"
          points={dashboard.pensionProjection}
          comparisonPoints={dashboard.zeroReturnPensionProjection}
          palette={colorClasses.violet}
        />
        <ProjectionCard
          title="Savings + Investments"
          amount={dashboard.liquidWealth}
          subtitle="Liquid and accessible wealth"
          points={dashboard.savingsInvestmentProjection}
          comparisonPoints={dashboard.zeroReturnSavingsInvestmentProjection}
          palette={colorClasses.emerald}
        />
      </div>
    </>
  );
}

function YearsSlider({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const percent = getPercent(value, MAX_PROJECTION_YEARS);

  return (
    <section className="glass-panel mt-3 px-5 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-32 items-baseline justify-between gap-3 sm:block">
          <p className="text-sm font-bold text-slate-900">Years</p>
          <p className="mt-1 text-sm text-slate-600">
            <span className="font-extrabold text-slate-950">{value}</span> years
          </p>
        </div>
        <div className="flex flex-1 items-center gap-4">
          <span className="text-sm font-bold text-slate-500">0</span>
          <input
            aria-label="Projection years"
            className="years-slider"
            max={MAX_PROJECTION_YEARS}
            min={0}
            step={1}
            style={{ '--slider-progress': `${percent}%` } as CSSProperties}
            type="range"
            value={value}
            onChange={(event) => onChange(Number(event.currentTarget.value))}
          />
          <span className="text-sm font-bold text-slate-500">{MAX_PROJECTION_YEARS}</span>
        </div>
      </div>
    </section>
  );
}
