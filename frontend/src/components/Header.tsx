import React, { useEffect, useState } from 'react';
import { Menu, ShieldAlert, ShieldCheck, Database, FileDown, RefreshCw, Bell, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { isCommunityUserRole } from '../types';

interface HeaderProps {
  activePage: string;
  onToggleSidebar: () => void;
  blockchainMode: string;
  onRefresh?: () => void;
  onNavigate?: (page: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activePage,
  onToggleSidebar,
  blockchainMode,
  onRefresh,
  onNavigate
}) => {
  const { user } = useAuth();
  const [unreadNotifs, setUnreadNotifs] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    const checkNotifs = async () => {
      try {
        const res = await api.getNotifications(true);
        setUnreadNotifs(res.unread_count);
      } catch (e) {
        // ignore
      }
    };
    checkNotifs();
    const interval = setInterval(checkNotifs, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const getPageTitle = (page: string) => {
    switch (page) {
      case 'dashboard': return 'Executive MRV Dashboard';
      case 'community-dashboard': return 'Community Planter Dashboard';
      case 'communication': return 'Communication Centre & Ask an Expert';
      case 'data': return 'Environmental Data Management';
      case 'biomass': return 'Aboveground Biomass (AGB) Estimation';
      case 'uncertainty': return 'Bootstrap Uncertainty Assessment';
      case 'prioritization': return 'Verification Prioritization Engine';
      case 'comparative': return 'Comparative Strategy Simulation';
      case 'blockchain': return 'Blockchain-Based MRV Registry';
      case 'verification': return 'Verification Task Management';
      case 'reports': return 'Analytics & Report Generation';
      case 'planner': return 'Plant Growth & Blue Carbon Planner';
      case 'profile': return 'User Profile & Authorization';
      case 'settings': return 'System Settings & Connectivity';
      default: return 'Blue Carbon MRV System';
    }
  };

  const handleDownloadPdf = async () => {
    try {
      await api.downloadPdfReport();
    } catch (err: any) {
      alert(`PDF Download Error: ${err.message}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-navy-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-4 lg:px-8 flex items-center justify-between transition-colors">
      <div className="flex items-center space-x-4">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
            {getPageTitle(activePage)}
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {isCommunityUserRole(user?.role)
              ? `Planter Portal • ${user?.name} (${user?.user_type || 'Farmer'})`
              : 'Chave et al. (2014) Mangrove Pantropical Allometric Standard'}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Blockchain Status Badge */}
        <div className={`hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-medium border ${
          blockchainMode === 'ETHEREUM_GANACHE'
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
        }`}>
          {blockchainMode === 'ETHEREUM_GANACHE' ? (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
          )}
          <span>{blockchainMode === 'ETHEREUM_GANACHE' ? 'Ethereum Ganache Node' : 'Simulated Ledger (SHA-256)'}</span>
        </div>

        {/* Database Connected Badge */}
        <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-forest-900/10 dark:bg-forest-950/40 text-forest-700 dark:text-forest-300 border border-forest-500/20">
          <Database className="w-3.5 h-3.5 text-forest-500" />
          <span>MongoDB Active</span>
        </div>

        {/* Notification Bell */}
        {onNavigate && (
          <button
            onClick={() => onNavigate('communication')}
            className="relative p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors"
            title="Communication Centre & Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifs > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-navy-950" />
            )}
          </button>
        )}

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        {/* Quick PDF Export (for staff) */}
        {!isCommunityUserRole(user?.role) && (
          <button
            onClick={handleDownloadPdf}
            className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gradient-to-r from-forest-700 to-ocean-600 text-white hover:from-forest-800 hover:to-ocean-700 transition shadow-sm"
            title="Download Executive PDF Audit Report"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export PDF</span>
          </button>
        )}
      </div>
    </header>
  );
};
