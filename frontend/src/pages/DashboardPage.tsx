import React, { useEffect, useState } from 'react';
import {
  Trees, Scale, AlertTriangle, ShieldCheck,
  TrendingUp, CheckCircle, Database, ChevronRight,
  Layers, RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, Cell, PieChart, Pie, Legend
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DashboardAnalytics, BlockchainRecord } from '../types';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [blockchainLogs, setBlockchainLogs] = useState<BlockchainRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [analytics, records] = await Promise.all([
        api.getAnalyticsDashboard(),
        api.getBlockchainRecords()
      ]);
      setData(analytics);
      setBlockchainLogs(records.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-ocean-500 animate-spin" />
          <p className="text-sm text-slate-400">Loading Blue Carbon MRV Analytics...</p>
        </div>
      </div>
    );
  }

  const kpi = data.kpi;

  return (
    <div className="space-y-6">
      {/* Role-Specific Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-forest-900 via-navy-900 to-ocean-950 p-6 border border-slate-700/50 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-forest-500/20 text-emerald-300 border border-forest-500/30">
                {user?.role || 'Guest Researcher'} Portal
              </span>
              <span className="text-xs text-slate-400">• {user?.organization || 'Global Blue Carbon Consortium'}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome back, {user?.name || 'Researcher'}
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl mt-1">
              Uncertainty-Aware Mangrove MRV System leveraging pantropical allometric equations (Chave et al. 2014),
              non-parametric bootstrap resampling (N=2,000), and tamper-evident blockchain registry.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onNavigate('prioritization')}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-ocean-600 hover:bg-ocean-500 text-white transition flex items-center space-x-1.5 shadow-md shadow-ocean-900/30"
            >
              <span>View Priority Engine</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleRefresh}
              className="p-2 rounded-xl bg-navy-800/80 hover:bg-navy-800 border border-slate-700 text-slate-300 transition"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Plots */}
        <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3.5">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Trees className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mangrove Plots</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{kpi.total_plots}</h3>
            <p className="text-[10px] text-slate-400">{kpi.total_trees.toLocaleString()} trees cataloged</p>
          </div>
        </div>

        {/* Total AGB */}
        <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3.5">
          <div className="p-3 rounded-lg bg-ocean-500/10 text-ocean-600 dark:text-ocean-400">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total AGB Biomass</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{kpi.total_agb_tonnes.toLocaleString()} Mg</h3>
            <p className="text-[10px] text-slate-400">Avg {kpi.average_agb_kg.toLocaleString()} kg / plot</p>
          </div>
        </div>

        {/* High Priority Plots */}
        <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3.5 cursor-pointer hover:border-rose-500/40 transition" onClick={() => onNavigate('prioritization')}>
          <div className="p-3 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">High Priority Plots</p>
            <h3 className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">{kpi.high_priority_plots}</h3>
            <p className="text-[10px] text-rose-500 font-medium">Requires on-site field audit</p>
          </div>
        </div>

        {/* Mean Relative Uncertainty */}
        <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3.5 cursor-pointer hover:border-amber-500/40 transition" onClick={() => onNavigate('uncertainty')}>
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mean Uncertainty</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">±{kpi.average_relative_uncertainty_pct}%</h3>
            <p className="text-[10px] text-slate-400">95% Bootstrap CI Half-Width</p>
          </div>
        </div>
      </div>

      {/* Secondary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-gradient-to-br from-white to-slate-50 dark:from-navy-900 dark:to-navy-800 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Verification Status</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{kpi.verification_completion_pct}% Audited</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-white to-slate-50 dark:from-navy-900 dark:to-navy-800 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Blockchain Ledger</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{kpi.blockchain_transactions_count} Transactions</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-ocean-500/10 flex items-center justify-center text-ocean-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-white to-slate-50 dark:from-navy-900 dark:to-navy-800 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Prioritization Ratio</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              {kpi.high_priority_plots} High / {kpi.medium_priority_plots} Med / {kpi.low_priority_plots} Low
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Regional Biomass Chart (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Aboveground Biomass (AGB) by Region</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pantropical allometric stock across 5 mangrove deltas</p>
            </div>
            <span className="text-[11px] text-ocean-500 font-medium">Chave et al. (2014)</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.regional_biomass} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <XAxis dataKey="region" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" stroke="#64748b" />
                <YAxis tick={{ fontSize: 10 }} stroke="#64748b" />
                <Tooltip
                  formatter={(val: any) => [`${Number(val).toLocaleString()} Mg AGB`, 'Total Biomass']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="total_agb_tonnes" fill="#0d9488" radius={[4, 4, 0, 0]}>
                  {data.regional_biomass.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={['#047857', '#0d9488', '#0284c7', '#6366f1', '#10b981'][index % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Distribution Donut (1 col) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Verification Priority Breakdown</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Tri-indicator percentile score distribution</p>
          </div>

          <div className="h-56 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.priority_distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {data.priority_distribution.map((entry, index) => (
                    <Cell key={`slice-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Audit Efficiency:</span>
            <span className="font-semibold text-ocean-400">+41.1% vs Random Sampling</span>
          </div>
        </div>
      </div>

      {/* Recent Blockchain Audit Activity */}
      <div className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Blockchain Registry Records</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Tamper-evident hash ledger of plot estimations and verification logs</p>
          </div>
          <button
            onClick={() => onNavigate('blockchain')}
            className="text-xs text-ocean-500 hover:text-ocean-400 font-semibold flex items-center space-x-1"
          >
            <span>Open Blockchain Explorer</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                <th className="pb-2.5">Block #</th>
                <th className="pb-2.5">Plot ID</th>
                <th className="pb-2.5">Transaction Hash</th>
                <th className="pb-2.5">AGB (kg)</th>
                <th className="pb-2.5">Uncertainty</th>
                <th className="pb-2.5">Status</th>
                <th className="pb-2.5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
              {blockchainLogs.map((log, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-navy-800/40">
                  <td className="py-2.5 font-bold text-ocean-500">#{log.block_number}</td>
                  <td className="py-2.5 font-sans font-semibold text-slate-900 dark:text-white">{log.plot_id}</td>
                  <td className="py-2.5 text-slate-500 dark:text-slate-400 truncate max-w-[140px]" title={log.tx_hash}>
                    {log.tx_hash.slice(0, 10)}...{log.tx_hash.slice(-8)}
                  </td>
                  <td className="py-2.5 font-sans">{log.estimated_agb_kg?.toLocaleString()} kg</td>
                  <td className="py-2.5 font-sans">±{log.relative_uncertainty_pct}%</td>
                  <td className="py-2.5 font-sans">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      log.verification_status === 'Approved'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                    }`}>
                      {log.verification_status}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-400 text-[10px] font-sans">
                    {new Date(log.timestamp).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
