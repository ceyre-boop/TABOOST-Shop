import { useState } from 'react';
import { Sidebar } from './components/layout/sidebar';
import { Topbar } from './components/layout/topbar';
import { TickerTape } from './components/layout/ticker-tape';
import { DashboardPage } from './components/pages/dashboard-page';
import { CreatorsPage } from './components/pages/creators-page';
import { DiamondsPage } from './components/pages/diamonds-page';
import { LiveStreamsPage } from './components/pages/live-streams-page';
import { ManagersPage } from './components/pages/managers-page';
import { LeaderboardPage } from './components/pages/leaderboard-page';
import { CreatorHealthPage } from './components/pages/creator-health-page';
import { MilestonesPage } from './components/pages/milestones-page';
import { ReportsPage } from './components/pages/reports-page';
import { AlertsPage } from './components/pages/alerts-page';
import { SettingsPage } from './components/pages/settings-page';
import { CreatorProfilePage } from './components/pages/creator-profile-page';
import { ArchetypesPage } from './components/pages/archetypes-page';
import { EfficiencyFrontierPage } from './components/pages/efficiency-frontier-page';
import { CohortAnalysisPage } from './components/pages/cohort-analysis-page';
import { ChurnRiskPage } from './components/pages/churn-risk-page';
import { VolatilityPage } from './components/pages/volatility-page';
import { ConcentrationPage } from './components/pages/concentration-page';
import { HoursTrapPage } from './components/pages/hours-trap-page';
import { RewardRatioPage } from './components/pages/reward-ratio-page';
import { SensitivityPage } from './components/pages/sensitivity-page';
import { GenrePortfolioPage } from './components/pages/genre-portfolio-page';
import { ConsistencyPage } from './components/pages/consistency-page';
import type { Creator } from './types';

export type PageId =
  | 'dashboard' | 'creators' | 'diamonds' | 'streams'
  | 'managers' | 'leaderboard' | 'health' | 'milestones'
  | 'reports' | 'alerts' | 'settings'
  | 'archetypes' | 'efficiency' | 'cohort' | 'churn'
  | 'volatility' | 'concentration' | 'hours-trap' | 'reward-ratio'
  | 'sensitivity' | 'genre' | 'consistency'
  | 'creator-profile';

export const PAGE_TITLES: Record<PageId, string> = {
  dashboard: 'DASHBOARD', creators: 'ALL CREATORS', diamonds: 'DIAMONDS',
  streams: 'LIVE STREAMS', managers: 'MANAGERS', leaderboard: 'LEADERBOARD',
  health: 'CREATOR HEALTH', milestones: 'MILESTONES', reports: 'REPORTS',
  alerts: 'ALERTS', settings: 'SETTINGS', archetypes: 'CREATOR ARCHETYPES',
  efficiency: 'EFFICIENCY FRONTIER', cohort: 'COHORT ANALYSIS',
  churn: 'CHURN PROBABILITY', volatility: 'VOLATILITY MAP',
  concentration: 'PORTFOLIO CONCENTRATION', 'hours-trap': 'HOURS TRAP',
  'reward-ratio': 'REWARD RATIO', sensitivity: 'SENSITIVITY ANALYSIS',
  genre: 'GENRE PORTFOLIO', consistency: 'CONSISTENCY PREMIUM',
  'creator-profile': 'CREATOR PROFILE',
};

function App() {
  const [page, setPage] = useState<PageId>('dashboard');
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [search, setSearch] = useState('');

  function navigateTo(p: PageId) { setPage(p); }

  function openCreator(c: Creator) {
    setSelectedCreator(c);
    setPage('creator-profile');
  }

  return (
    <div className="flex h-screen bg-[#080808] overflow-hidden ambient-bg">
      <Sidebar currentPage={page} onNavigate={navigateTo} search={search} onSearch={setSearch} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar pageTitle={PAGE_TITLES[page]} onNavigate={navigateTo} />
        <TickerTape />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 scrollbar-thin">
          {page === 'dashboard' && <DashboardPage onCreatorClick={openCreator} />}
          {page === 'creators' && <CreatorsPage search={search} onCreatorClick={openCreator} />}
          {page === 'diamonds' && <DiamondsPage onCreatorClick={openCreator} />}
          {page === 'streams' && <LiveStreamsPage onCreatorClick={openCreator} />}
          {page === 'managers' && <ManagersPage onCreatorClick={openCreator} />}
          {page === 'leaderboard' && <LeaderboardPage onCreatorClick={openCreator} />}
          {page === 'health' && <CreatorHealthPage onCreatorClick={openCreator} />}
          {page === 'milestones' && <MilestonesPage onCreatorClick={openCreator} />}
          {page === 'reports' && <ReportsPage />}
          {page === 'alerts' && <AlertsPage />}
          {page === 'settings' && <SettingsPage />}
          {page === 'creator-profile' && selectedCreator && <CreatorProfilePage creator={selectedCreator} onBack={() => setPage('dashboard')} />}
          {page === 'archetypes' && <ArchetypesPage onCreatorClick={openCreator} />}
          {page === 'efficiency' && <EfficiencyFrontierPage onCreatorClick={openCreator} />}
          {page === 'cohort' && <CohortAnalysisPage />}
          {page === 'churn' && <ChurnRiskPage onCreatorClick={openCreator} />}
          {page === 'volatility' && <VolatilityPage onCreatorClick={openCreator} />}
          {page === 'concentration' && <ConcentrationPage />}
          {page === 'hours-trap' && <HoursTrapPage onCreatorClick={openCreator} />}
          {page === 'reward-ratio' && <RewardRatioPage onCreatorClick={openCreator} />}
          {page === 'sensitivity' && <SensitivityPage />}
          {page === 'genre' && <GenrePortfolioPage />}
          {page === 'consistency' && <ConsistencyPage onCreatorClick={openCreator} />}
        </main>
      </div>
    </div>
  );
}

export default App;
