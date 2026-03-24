import { Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { WorkflowsPage } from "./pages/WorkflowsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { AgentsPage } from "./pages/AgentsPage";
import { TasksPage } from "./pages/TasksPage";
import { MemoriesPage } from "./pages/MemoriesPage";
import { DrivePage } from "./pages/DrivePage";
import { SOPsPage } from "./pages/SOPsPage";
import { ContentPage } from "./pages/ContentPage";
import { WorkbooksPage } from "./pages/WorkbooksPage";
import { DiscordLogsPage } from "./pages/DiscordLogsPage";
import { RocksPage } from "./pages/eos/RocksPage";
import { ScorecardPage } from "./pages/eos/ScorecardPage";
import { IssuesPage } from "./pages/eos/IssuesPage";
import { MeetingsPage } from "./pages/eos/MeetingsPage";
import { PeoplePage } from "./pages/eos/PeoplePage";
import { HeadlinesPage } from "./pages/eos/HeadlinesPage";
import { SeoDashboardPage } from "./pages/seo/SeoDashboardPage";
import { KeywordTrackerPage } from "./pages/seo/KeywordTrackerPage";
import { ContentGapsPage } from "./pages/seo/ContentGapsPage";
import { TechnicalAuditPage } from "./pages/seo/TechnicalAuditPage";
import { SerpAnalysisPage } from "./pages/seo/SerpAnalysisPage";
import { KeywordResearchPage } from "./pages/seo/KeywordResearchPage";
import { ClientsListPage } from "./pages/clients/ClientsListPage";
import { ClientDetailPage } from "./pages/clients/ClientDetailPage";
import { AgencyTeamPage } from "./pages/clients/AgencyTeamPage";
import { WeeklyCheckInPage } from "./pages/clients/WeeklyCheckInPage";
import { TrafficLightSettingsPage } from "./pages/clients/TrafficLightSettingsPage";
import { EnrichmentPage } from "./pages/sales/EnrichmentPage";
import { SharedBrandStoryPage } from "./pages/SharedBrandStoryPage";
import { MarketingGuidesPage } from "./pages/MarketingGuidesPage";
import { MarketingGuideEditorPage } from "./pages/MarketingGuideEditorPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { PublicOnboardingPage } from "./pages/PublicOnboardingPage";

export default function App() {
  return (
    <Routes>
      {/* Public pages (no auth, no sidebar) */}
      <Route path="/brand-story/:token" element={<SharedBrandStoryPage />} />
      <Route path="/onboarding/intake" element={<PublicOnboardingPage />} />

      <Route element={<DashboardLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/clients" element={<ClientsListPage />} />
        <Route path="/clients/:slug" element={<ClientDetailPage />} />
        <Route path="/clients/:slug/:section" element={<ClientDetailPage />} />
        {/* Campaigns & Deliverables are now in the client detail page */}
        <Route path="/team" element={<AgencyTeamPage />} />
        <Route path="/weekly-check-in" element={<WeeklyCheckInPage />} />
        <Route path="/settings/traffic-light" element={<TrafficLightSettingsPage />} />
        <Route path="/seo" element={<SeoDashboardPage />} />
        <Route path="/seo/keywords" element={<KeywordTrackerPage />} />
        <Route path="/seo/gaps" element={<ContentGapsPage />} />
        <Route path="/seo/audit" element={<TechnicalAuditPage />} />
        <Route path="/seo/serp" element={<SerpAnalysisPage />} />
        <Route path="/seo/research" element={<KeywordResearchPage />} />
        <Route path="/content" element={<ContentPage />} />
        <Route path="/workbooks" element={<WorkbooksPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/memories" element={<MemoriesPage />} />
        <Route path="/workflows" element={<WorkflowsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/drive" element={<DrivePage />} />
        <Route path="/sops" element={<SOPsPage />} />
        <Route path="/discord" element={<DiscordLogsPage />} />
        <Route path="/eos/rocks" element={<RocksPage />} />
        <Route path="/eos/scorecard" element={<ScorecardPage />} />
        <Route path="/eos/issues" element={<IssuesPage />} />
        <Route path="/eos/meetings" element={<MeetingsPage />} />
        <Route path="/eos/people" element={<PeoplePage />} />
        <Route path="/eos/headlines" element={<HeadlinesPage />} />
        <Route path="/guides" element={<MarketingGuidesPage />} />
        <Route path="/guides/:id" element={<MarketingGuideEditorPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/sales/enrichment" element={<EnrichmentPage />} />
      </Route>
    </Routes>
  );
}
