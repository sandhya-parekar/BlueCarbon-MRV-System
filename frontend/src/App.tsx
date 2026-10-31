import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DataManagementPage } from './pages/DataManagementPage';
import { BiomassEstimationPage } from './pages/BiomassEstimationPage';
import { UncertaintyAssessmentPage } from './pages/UncertaintyAssessmentPage';
import { PrioritizationPage } from './pages/PrioritizationPage';
import { ComparativeAnalysisPage } from './pages/ComparativeAnalysisPage';
import { BlockchainRegistryPage } from './pages/BlockchainRegistryPage';
import { VerificationManagementPage } from './pages/VerificationManagementPage';
import { ReportsAnalyticsPage } from './pages/ReportsAnalyticsPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { api } from './services/api';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [activePage, setActivePage] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [blockchainMode, setBlockchainMode] = useState<string>('SIMULATED_BLOCKCHAIN');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const status = await api.getBlockchainStatus();
        setBlockchainMode(status.mode);
      } catch (e) {
        console.warn('Blockchain status check error', e);
      }
    };
    fetchStatus();
  }, [activePage]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-200">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-ocean-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Initializing Blue Carbon MRV System...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onSuccess={() => setActivePage('dashboard')} />;
  }

  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage onNavigate={setActivePage} />;
      case 'data':
        return <DataManagementPage />;
      case 'biomass':
        return <BiomassEstimationPage />;
      case 'uncertainty':
        return <UncertaintyAssessmentPage />;
      case 'prioritization':
        return <PrioritizationPage />;
      case 'comparative':
        return <ComparativeAnalysisPage />;
      case 'blockchain':
        return <BlockchainRegistryPage />;
      case 'verification':
        return <VerificationManagementPage />;
      case 'reports':
        return <ReportsAnalyticsPage />;
      case 'profile':
        return <UserProfilePage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-950 text-slate-900 dark:text-slate-100 flex transition-colors">
      {/* Sidebar Navigation */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        <Header
          activePage={activePage}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          blockchainMode={blockchainMode}
          onRefresh={() => {
            // Trigger refresh
            window.location.reload();
          }}
        />

        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
          {renderActivePage()}
        </main>

        <footer className="py-4 px-8 border-t border-slate-200 dark:border-slate-800/80 text-center text-xs text-slate-500 dark:text-slate-400">
          MCA Semester III Research Project &bull; An Uncertainty-Aware Verification Prioritization Framework for Blockchain-Based Blue Carbon MRV Systems &bull; 2026
        </footer>
      </div>
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
