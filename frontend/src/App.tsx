import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useFamily } from './hooks/useFamily';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { FamilyPage } from './pages/FamilyPage';
import { LabsPage } from './pages/LabsPage';
import { SymptomsPage } from './pages/SymptomsPage';
import { ProtocolsPage } from './pages/ProtocolsPage';
import { DietPage } from './pages/DietPage';
import { TrendsPage } from './pages/TrendsPage';
import { ChatPage } from './pages/ChatPage';
import { KnowledgePage } from './pages/KnowledgePage';
import { BiomarkersPage } from './pages/BiomarkersPage';
import { FoodsPage } from './pages/FoodsPage';

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const { members, activeMember, setActiveMember, loading: familyLoading } = useFamily();

  if (authLoading || familyLoading) {
    return (
      <div className="flex items-center justify-center h-dvh bg-dark-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<Layout user={user} members={members} activeMember={activeMember} setActiveMember={setActiveMember} />}>
        <Route index element={<DashboardPage />} />
        <Route path="family" element={<FamilyPage />} />
        <Route path="labs" element={<LabsPage />} />
        <Route path="symptoms" element={<SymptomsPage />} />
        <Route path="protocols" element={<ProtocolsPage />} />
        <Route path="diet" element={<DietPage />} />
        <Route path="biomarkers" element={<BiomarkersPage />} />
        <Route path="foods" element={<FoodsPage />} />
        <Route path="trends" element={<TrendsPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="knowledge" element={<KnowledgePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
