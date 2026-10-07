import { type calculateDashboard } from '../finance';
import { OverviewPage } from './OverviewPage';
import type { DashboardPlan } from '../storage/dashboardPlans';

type LandingPageProps = {
  dashboard: ReturnType<typeof calculateDashboard>;
  projectionYears: number;
  planId: string;
  initialPlan: DashboardPlan;
};

export function LandingPage({ dashboard, projectionYears, planId, initialPlan }: LandingPageProps) {
  return (
    <OverviewPage
      backgroundImagePath="/images/background-official.webp"
      dashboard={dashboard}
      projectionYears={projectionYears}
      planId={planId}
      initialPlan={initialPlan}
      showDecorativeImages={false}
    />
  );
}
