import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Menu } from 'lucide-react';
import { calculateDashboard, type AssetKind, type FinancialAsset, type IncomePlan } from '../finance';
import { buttonClasses } from '../constants/buttonStyles';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { MobileSidebarDrawer, Sidebar } from './Sidebar';
import { tooltipClasses } from '../constants/tooltipStyles';
import { LandingPage } from '../pages/LandingPage';
import { OverviewPage } from '../pages/OverviewPage';
import { downloadLocalStorageBackup, importLocalStorageBackup } from '../storage/localStorageBackup';
import { createBlankDashboardPlan, readDashboardPlans, saveDashboardPlans, updateActiveDashboardPlan } from '../storage/dashboardPlans';

const CarPage = lazy(() => import('../pages/CarPage').then((module) => ({ default: module.CarPage })));
const ContactPage = lazy(() => import('../pages/ContactPage').then((module) => ({ default: module.ContactPage })));
const DetailsPage = lazy(() => import('../pages/DetailsPage').then((module) => ({ default: module.DetailsPage })));
const ExpensesPage = lazy(() => import('../pages/ExpensesPage').then((module) => ({ default: module.ExpensesPage })));
const MortgagePage = lazy(() => import('../pages/MortgagePage').then((module) => ({ default: module.MortgagePage })));
const ProgressPage = lazy(() => import('../pages/ProgressPage').then((module) => ({ default: module.ProgressPage })));

export function Dashboard() {
  const navigate = useNavigate();
  const [plansState, setPlansState] = useState(readDashboardPlans);
  const activePlan = plansState.plans.find(({ id }) => id === plansState.activePlanId) ?? plansState.plans[0];
  const { assets, income, projectionYears } = activePlan;
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [importStatusTone, setImportStatusTone] = useState<'error' | 'success'>('success');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const dashboard = useMemo(() => calculateDashboard(assets, income, projectionYears), [assets, income, projectionYears]);

  useEffect(() => {
    saveDashboardPlans(plansState);
  }, [plansState]);

  useEffect(() => {
    if (!importStatus) {
      return;
    }

    const timeoutId = window.setTimeout(() => setImportStatus(''), 5000);

    return () => window.clearTimeout(timeoutId);
  }, [importStatus]);

  useEffect(() => {
    function closeTooltip(host: HTMLElement) {
      host.closest<HTMLElement>('.glass-panel')?.removeAttribute('data-tooltip-panel-open');
      host.removeAttribute('data-tooltip-open');
    }

    function toggleTooltip(event: MouseEvent) {
      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>('[aria-describedby]')
        : null;
      const openHosts = Array.from(document.querySelectorAll<HTMLElement>('[data-tooltip-open="true"]'));

      if (target) {
        const tooltipId = target.getAttribute('aria-describedby');
        const tooltip = tooltipId ? document.getElementById(tooltipId) : null;
        const host = target.closest<HTMLElement>('.group');

        if (!tooltip || tooltip.getAttribute('role') !== 'tooltip' || !host) {
          return;
        }

        const isOpen = host.getAttribute('data-tooltip-open') === 'true';

        openHosts.forEach((openHost) => {
          if (openHost !== host) {
            closeTooltip(openHost);
          }
        });

        if (isOpen) {
          closeTooltip(host);
        } else {
          host.setAttribute('data-tooltip-open', 'true');
          host.closest<HTMLElement>('.glass-panel')?.setAttribute('data-tooltip-panel-open', 'true');
        }

        return;
      }

      openHosts.forEach(closeTooltip);
    }

    document.addEventListener('click', toggleTooltip, true);

    return () => document.removeEventListener('click', toggleTooltip, true);
  }, []);

  function updateAsset(
    id: AssetKind,
    field: keyof Pick<FinancialAsset, 'amount' | 'monthlyContribution' | 'annualReturn'>,
    value: number,
  ) {
    setPlansState((state) => updateActiveDashboardPlan(state, (plan) => ({
      ...plan,
      assets: plan.assets.map((asset) => asset.id === id ? { ...asset, [field]: value } : asset),
    })));
  }

  function updateIncome(field: keyof Pick<IncomePlan, 'monthlyNetIncome'>, value: number) {
    setPlansState((state) => updateActiveDashboardPlan(state, (plan) => ({
      ...plan, income: { ...plan.income, [field]: value },
    })));
  }

  function updateProjectionYears(value: number) {
    setPlansState((state) => updateActiveDashboardPlan(state, (plan) => ({ ...plan, projectionYears: value })));
  }

  function createPlan() {
    const id = crypto.randomUUID();
    setPlansState((state) => {
      let index = 0;
      let name = 'Plan A';
      while (state.plans.some((plan) => plan.name === name)) {
        index += 1;
        name = `Plan ${index < 26 ? String.fromCharCode(65 + index) : index + 1}`;
      }
      return { activePlanId: id, plans: [...state.plans, createBlankDashboardPlan(id, name)] };
    });
  }

  function renamePlan(id: string, name: string) {
    if (!name.trim()) {
      return;
    }
    setPlansState((state) => ({
      ...state,
      plans: state.plans.map((plan) => plan.id === id ? { ...plan, name: name.trim() } : plan),
    }));
  }

  async function handleExportPdf() {
    if (isExporting) {
      return;
    }

    setIsExporting(true);
    try {
      const { generateFinancialReportPdf } = await import('../pdf/pdfReport');

      generateFinancialReportPdf({
        assets: dashboard.assets,
        income: dashboard.income,
        insightAmounts: dashboard.insightAmounts,
        projectionYears,
        totalCurrentWealth: assets.reduce((sum, asset) => sum + asset.amount, 0),
        totalWealth: dashboard.totalWealth,
        pensionWealth: dashboard.pensionWealth,
        liquidWealth: dashboard.liquidWealth,
        totalProjection: dashboard.totalProjection,
        pensionProjection: dashboard.pensionProjection,
        savingsInvestmentProjection: dashboard.savingsInvestmentProjection,
        zeroReturnTotalProjection: dashboard.zeroReturnTotalProjection,
        zeroReturnPensionProjection: dashboard.zeroReturnPensionProjection,
        zeroReturnSavingsInvestmentProjection: dashboard.zeroReturnSavingsInvestmentProjection,
      });
    } finally {
      setIsExporting(false);
    }
  }

  function handleExportJsonBackup() {
    downloadLocalStorageBackup(window.localStorage);
  }

  async function handleImportJsonBackup(file: File) {
    setIsImporting(true);
    setImportStatus('');
    setImportStatusTone('success');

    try {
      importLocalStorageBackup(window.localStorage, await file.text());
      setPlansState(readDashboardPlans());
      setImportStatusTone('success');
      setImportStatus('Import successful. All data was restored.');
    } catch {
      setImportStatusTone('error');
      setImportStatus('Import failed. Choose a Growly JSON backup.');
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#e8eef8] text-slate-950">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(37,99,235,.24),transparent_31%),radial-gradient(circle_at_72%_7%,rgba(56,189,248,.20),transparent_29%),radial-gradient(circle_at_82%_86%,rgba(96,165,250,.18),transparent_32%),linear-gradient(135deg,#f8fbff_0%,#dce7f6_47%,#f2f5fa_100%)]" />
      <button
        aria-label="Open navigation"
        className={buttonClasses({ className: 'fixed left-4 top-4 z-30 md:hidden', size: 'icon' })}
        type="button"
        onClick={() => setIsMobileNavOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>
      <MobileSidebarDrawer
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[232px_1fr]">
        <Sidebar />
        <section className="flex min-h-screen min-w-0 flex-col px-4 pb-4 pt-20 sm:px-5 md:py-4 xl:px-6">
          <Suspense fallback={<RouteLoadingState />}>
            <Routes>
              <Route
                path="/"
                element={
                  <LandingPage
                    dashboard={dashboard}
                    projectionYears={projectionYears}
                  />
                }
              />
              <Route
                path="/overview-private-lidia"
                element={
                  <OverviewPage
                    dashboard={dashboard}
                    projectionYears={projectionYears}
                  />
                }
              />
              <Route
                path="/details"
                element={
                  <DetailsPage
                    plans={plansState.plans}
                    activePlanId={activePlan.id}
                    onPlanChange={(id) => setPlansState((state) => ({ ...state, activePlanId: id }))}
                    onCreatePlan={createPlan}
                    onRenamePlan={renamePlan}
                    dashboard={dashboard}
                    importStatus={importStatus}
                    importStatusTone={importStatusTone}
                    isExporting={isExporting}
                    isImporting={isImporting}
                    projectionYears={projectionYears}
                    onAssetChange={updateAsset}
                    onExportJsonBackup={handleExportJsonBackup}
                    onExportPdf={handleExportPdf}
                    onImportJsonBackup={handleImportJsonBackup}
                    onIncomeChange={updateIncome}
                    onProjectionYearsChange={updateProjectionYears}
                  />
                }
              />
              <Route path="/progress" element={<ProgressPage assets={assets} projectionYears={projectionYears} />} />
              <Route
                path="/expenses"
                element={
                  <ExpensesPage
                    initialTrendVisible={false}
                    monthlyIncome={dashboard.income.monthlyNetIncome}
                    onTrendVisibilityChange={(isVisible) => {
                      if (isVisible) {
                        navigate('/expenses/trends');
                      }
                    }}
                  />
                }
              />
              <Route
                path="/expenses/trends"
                element={
                  <ExpensesPage
                    initialTrendVisible
                    monthlyIncome={dashboard.income.monthlyNetIncome}
                    onTrendVisibilityChange={(isVisible) => {
                      if (!isVisible) {
                        navigate('/expenses');
                      }
                    }}
                  />
                }
              />
              <Route path="/car" element={<CarPage />} />
              <Route path="/mortgage" element={<MortgagePage dashboardAssets={assets} />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          <Footer />
        </section>
      </div>
    </main>
  );
}

function RouteLoadingState() {
  return (
    <section className="glass-panel flex min-h-48 items-center justify-center p-5 text-sm font-bold text-slate-600">
      Loading...
    </section>
  );
}

function Footer() {
  return (
    <footer className="mt-auto flex flex-wrap items-center justify-center gap-2 pt-6 pb-2 text-center text-xs font-medium text-slate-600">
      <span>&copy; </span>
      <a
        className="text-slate-700 underline decoration-slate-400/60 underline-offset-2 transition hover:text-cyan-800"
        href="https://steplidia.pages.dev"
        target="_blank"
        rel="noopener noreferrer"
      >
        Lidatron Labs
      </a>
      <span className="text-slate-400">·</span>
      <span className="group relative">
        <button
          className="text-slate-700 underline decoration-slate-400/60 underline-offset-2 transition hover:text-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-700/20"
          aria-describedby="privacy-tooltip"
          type="button"
        >
          Privacy
        </button>
        <span
          id="privacy-tooltip"
          role="tooltip"
          className={tooltipClasses('bottom-6 left-1/2 w-72 -translate-x-1/2 px-3 py-2 text-left leading-5')}
        >
          All data is stored locally in your browser and is not sent anywhere. Clearing site browser data will remove saved calculations.
        </span>
      </span>
    </footer>
  );
}
