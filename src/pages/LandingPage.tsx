import { type calculateDashboard } from '../finance';
import { OverviewPage } from './OverviewPage';

type LandingPageProps = {
  dashboard: ReturnType<typeof calculateDashboard>;
  projectionYears: number;
};

export function LandingPage({ dashboard, projectionYears }: LandingPageProps) {
  return (
    <OverviewPage
      backgroundImagePath="/images/background-official.webp"
      dashboard={dashboard}
      projectionYears={projectionYears}
      showDecorativeImages={false}
    />
  );
}
