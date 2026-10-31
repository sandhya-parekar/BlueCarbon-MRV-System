import React, { useEffect, useState } from 'react';
import {
  BarChart3, FileDown, FileText, Download, CheckCircle,
  TrendingUp, Scale, Trees, ShieldCheck, RefreshCw, AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, Cell, PieChart, Pie, Legend, LineChart, Line, CartesianGrid
} from 'recharts';
import { api } from '../services/api';
import { DashboardAnalytics, ComparativeAnalysis } from '../types';

export const ReportsAnalyticsPage: React.FC = () => {
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [compData, setCompData] = useState<ComparativeAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [analytics, comparative] = await Promise.all([
        api.getAnalyticsDashboard(),
        api.getComparativeAnalysis(24, 10000)
      ]);
      setData(analytics);
      setCompData(comparative);
    } catch (err) {
      console.error('Failed to load reports and analytics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await api.downloadPdfReport();
    } catch (err: any) {
      alert(`PDF Download Error: ${err.message}`);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadCsv = async () => {
    setDownloadingCsv(true);
    try {
      await api.downloadCsvReport();
    } catch (err: any) {
      alert(`CSV Download Error: ${err.message}`);
    } finally {
      setDownloadingCsv(false);
    }
  };

  if (loading || !data || !compData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-ocean-500 animate-spin" />
          <p className="text-sm text-slate-400">Compiling Comprehensive MRV Analytics & Reports...</p>
        </div>
      </div>
    );
  }

  const kpi = data.kpi;

  // Sensitivity scenarios mock for chart
  const sensitivityData = [
    { scenario: '-20%', rho: 0.8, agbImpact: -19.5 },
    { scenario: '-10%', rho: 0.9, agbImpact: -9.8 },
    { scenario: 'Baseline', rho: 1.0, agbImpact: 0.0 },
    { scenario: '+10%', rho: 1.1, agbImpact: 9.8 },
    { scenario: '+20%', rho: 1.2, agbImpact: 19.5 }
  ];

  return (
    <div className="space-y-6">
      {/* Header with PDF & CSV Download Buttons */}
      <div className="p-6 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-forest-500/10 text-forest-500">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Executive MRV Analytics & Audit Reporting
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Download formal verification reports and evaluate multi-faceted inventory metrics
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleDownloadCsv}
            disabled={downloadingCsv}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-navy-800 hover:bg-slate-200 dark:hover:bg-navy-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition flex items-center space-x-2"
          >
            <Download className="w-4 h-4 text-ocean-400" />
            <span>{downloadingCsv ? 'Exporting...' : 'Export CSV Dataset'}</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-forest-700 to-ocean-600 hover:from-forest-800 hover:to-ocean-700 text-white transition flex items-center space-x-2 shadow-md shadow-ocean-950/40"
          >
            <FileDown className="w-4 h-4" />
            <span>{downloadingPdf ? 'Generating PDF...' : 'Download Official PDF Report'}</span>
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Total Plots</p>
          <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-1">{kpi.total_plots}</h4>
          <p className="text-[10px] text-slate-400">{kpi.total_trees.toLocaleString()} Trees</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Total AGB Stock</p>
          <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-1">{kpi.total_agb_tonnes.toLocaleString()} Mg</h4>
          <p className="text-[10px] text-slate-400">Avg {kpi.average_agb_kg.toLocaleString()} kg / plot</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Mean Uncertainty (95% CI)</p>
          <h4 className="text-xl font-bold text-amber-500 mt-1">±{kpi.average_relative_uncertainty_pct}%</h4>
          <p className="text-[10px] text-slate-400">2,000 Bootstrap Runs</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Audit Completion</p>
          <h4 className="text-xl font-bold text-emerald-500 mt-1">{kpi.verification_completion_pct}%</h4>
          <p className="text-[10px] text-slate-400">{kpi.blockchain_transactions_count} Blockchain Logs</p>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Biomass by Region */}
        <div className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Aboveground Biomass by Region</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Stock density across 5 mangrove ecosystems</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.regional_biomass} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <XAxis dataKey="region" tick={{ fontSize: 9 }} angle={-15} textAnchor="end" stroke="#64748b" />
                <YAxis tick={{ fontSize: 10 }} stroke="#64748b" />
                <Tooltip
                  formatter={(val: any) => [`${Number(val).toLocaleString()} Mg AGB`, 'Total Biomass']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="total_agb_tonnes" radius={[4, 4, 0, 0]}>
                  {data.regional_biomass.map((_, index) => (
                    <Cell key={index} fill={['#047857', '#0d9488', '#0284c7', '#6366f1', '#10b981'][index % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Priority Distribution */}
        <div className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Verification Priority Distribution</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Plots categorized into High, Medium, and Low tiers</p>
          </div>
          <div className="h-56 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.priority_distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {data.priority_distribution.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs text-slate-400">
            <span>High: <b className="text-rose-400">{kpi.high_priority_plots}</b></span>
            <span>Medium: <b className="text-amber-400">{kpi.medium_priority_plots}</b></span>
            <span>Low: <b className="text-emerald-400">{kpi.low_priority_plots}</b></span>
          </div>
        </div>

        {/* Chart 3: Verification Strategy Comparison */}
        <div className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Verification Sampling Strategy Comparison
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            High-Priority Plot Capture Efficiency (%) under 24-Plot Budget
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={compData.strategies.map(s => ({
                  name: s.strategy_name.split('(')[0].trim(),
                  efficiency: s.capture_efficiency_pct
                }))}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 10 }} stroke="#64748b" unit="%" />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Capture Efficiency']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="efficiency" radius={[4, 4, 0, 0]}>
                  {compData.strategies.map((_, index) => (
                    <Cell key={index} fill={['#10b981', '#0284c7', '#f59e0b', '#64748b'][index % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Wood-Density Sensitivity Analysis */}
        <div className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Wood Density Sensitivity Response Curve
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Percentage AGB deviation under &plusmn;20% density parameter uncertainty
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sensitivityData} margin={{ top: 10, right: 15, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="scenario" tick={{ fontSize: 10 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 10 }} stroke="#64748b" unit="%" />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'AGB Deviation']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Line type="monotone" dataKey="agbImpact" stroke="#0d9488" strokeWidth={3} dot={{ r: 5, fill: '#14b8a6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};
