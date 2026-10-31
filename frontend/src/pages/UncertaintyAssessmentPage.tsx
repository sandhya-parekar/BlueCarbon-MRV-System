import React, { useEffect, useState } from 'react';
import {
  HelpCircle, TrendingUp, Sliders, ArrowRight,
  RefreshCw, CheckCircle2, ChevronRight, BarChart2, X
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, Cell, AreaChart, Area, CartesianGrid, LineChart, Line
} from 'recharts';
import { api } from '../services/api';
import { UncertaintyAssessment, UncertaintyPlot } from '../types';

export const UncertaintyAssessmentPage: React.FC = () => {
  const [assessment, setAssessment] = useState<UncertaintyAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlotId, setSelectedPlotId] = useState<string>('PLOT-001');
  const [plotDetails, setPlotDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const data = await api.getUncertaintySummary();
      setAssessment(data);
      if (data.plots.length > 0) {
        setSelectedPlotId(data.plots[0].plot_id);
      }
    } catch (err) {
      console.error('Failed to load uncertainty assessment', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPlotDetails = async (plotId: string) => {
    setLoadingDetails(true);
    try {
      const details = await api.getPlotUncertainty(plotId);
      setPlotDetails(details);
    } catch (err) {
      console.error('Failed to load plot uncertainty details', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    if (selectedPlotId) {
      loadPlotDetails(selectedPlotId);
    }
  }, [selectedPlotId]);

  if (loading || !assessment) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-ocean-500 animate-spin" />
          <p className="text-sm text-slate-400">Executing 2,000 Bootstrap Resampling Iterations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Non-Parametric Bootstrap Uncertainty Assessment
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                2,000 bootstrap resampling runs with replacement • 95% Confidence Intervals [2.5%, 97.5%]
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-navy-800 border border-slate-700 text-slate-300">
              Mean Uncertainty: <span className="font-bold text-amber-400">±{assessment.overall_mean_relative_uncertainty_pct}%</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-navy-800 border border-slate-700 text-slate-300">
              Analyzed Plots: <span className="font-bold text-ocean-400">{assessment.plots_analyzed}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Uncertainty Distribution Overview KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Mean Relative Uncertainty</p>
          <h4 className="text-xl font-bold text-amber-500 mt-1">±{assessment.overall_mean_relative_uncertainty_pct}%</h4>
          <p className="text-[10px] text-slate-400">Half-Width (CI 95%) / Estimated AGB</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Median Uncertainty</p>
          <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-1">±{assessment.overall_median_relative_uncertainty_pct}%</h4>
          <p className="text-[10px] text-slate-400">Robust Central Dispersion</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Minimum Observed Uncertainty</p>
          <h4 className="text-xl font-bold text-emerald-500 mt-1">±{assessment.min_uncertainty_pct}%</h4>
          <p className="text-[10px] text-slate-400">High Homogeneity Plots</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Maximum Observed Uncertainty</p>
          <h4 className="text-xl font-bold text-rose-500 mt-1">±{assessment.max_uncertainty_pct}%</h4>
          <p className="text-[10px] text-slate-400">High Variance / Low Tree Sample</p>
        </div>
      </div>

      {/* Interactive Deep-Dive: Specific Plot Bootstrap & Wood Density Sensitivity */}
      {plotDetails && (
        <div className="p-6 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-ocean-500 uppercase tracking-wider">Plot Deep Dive</span>
                <span className="text-slate-400">•</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">2,000 Iteration Empirical Resampling</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {plotDetails.plot_id} Allometric Uncertainty & Sensitivity
              </h3>
            </div>

            <div className="flex items-center space-x-3">
              <label className="text-xs text-slate-500 dark:text-slate-400">Select Plot:</label>
              <select
                value={selectedPlotId}
                onChange={(e) => setSelectedPlotId(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-navy-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:border-ocean-500"
              >
                {assessment.plots.slice(0, 50).map((p) => (
                  <option key={p.plot_id} value={p.plot_id}>
                    {p.plot_id} ({p.region.split(' ')[0]} - ±{p.relative_uncertainty_pct}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Plot Confidence Interval Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-navy-800/60 border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold">Estimated AGB</span>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{plotDetails.point_estimate_agb_kg?.toLocaleString()} kg</p>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold">95% Lower Limit</span>
              <p className="text-sm font-bold text-emerald-500 mt-0.5">{plotDetails.lower_ci_95_kg?.toLocaleString()} kg</p>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold">95% Upper Limit</span>
              <p className="text-sm font-bold text-rose-500 mt-0.5">{plotDetails.upper_ci_95_kg?.toLocaleString()} kg</p>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold">CI Span Width</span>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {(plotDetails.upper_ci_95_kg - plotDetails.lower_ci_95_kg)?.toFixed(1)} kg
              </p>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold">Relative Uncertainty</span>
              <p className="text-sm font-bold text-amber-500 mt-0.5">±{plotDetails.relative_uncertainty_pct}%</p>
            </div>
          </div>

          {/* Two Visualizations: Bootstrap Distribution & Wood Density Sensitivity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 1. Bootstrap Distribution Curve */}
            <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-navy-950/40 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Empirical Bootstrap AGB Distribution (N=2,000)
                </h4>
                <span className="text-[10px] font-mono text-ocean-400">95% CI Highlighted</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
                Monte Carlo resampling distribution showing parameter variance
              </p>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={plotDetails.distribution_curve} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="bin_center" tick={{ fontSize: 9 }} stroke="#64748b" />
                    <YAxis tick={{ fontSize: 9 }} stroke="#64748b" />
                    <Tooltip
                      formatter={(val: any) => [`${val} iterations`, 'Frequency']}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                    />
                    <Area type="monotone" dataKey="frequency" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.25} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Wood-Density Sensitivity Scenarios */}
            <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-navy-950/40 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Wood Density (&rho;) Sensitivity Perturbations
                </h4>
                <span className="text-[10px] font-mono text-ocean-400">-20% to +20%</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
                Response of AGB to species wood density uncertainty scenarios
              </p>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={plotDetails.sensitivity_scenarios} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="scenario" tick={{ fontSize: 10 }} stroke="#64748b" />
                    <YAxis tick={{ fontSize: 9 }} stroke="#64748b" />
                    <Tooltip
                      formatter={(val: any) => [`${Number(val).toLocaleString()} kg`, 'Adjusted AGB']}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                    />
                    <Bar dataKey="adjusted_agb_kg" radius={[4, 4, 0, 0]}>
                      {plotDetails.sensitivity_scenarios?.map((s: any, idx: number) => (
                        <Cell
                          key={idx}
                          fill={s.scenario.includes('-') ? '#f59e0b' : (s.scenario.includes('Baseline') ? '#0d9488' : '#3b82f6')}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Uncertainty Bounds Table Across All Plots */}
      <div className="rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Plot-by-Plot 95% Confidence Bounds & Relative Uncertainty
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sorted by highest relative uncertainty to identify candidate high-variance plots
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">118 Plots Evaluated</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-navy-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-4">Plot ID</th>
                <th className="py-3 px-4">Region</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Trees</th>
                <th className="py-3 px-4">Estimated AGB (kg)</th>
                <th className="py-3 px-4">95% CI Lower</th>
                <th className="py-3 px-4">95% CI Upper</th>
                <th className="py-3 px-4">CI Half-Width</th>
                <th className="py-3 px-4">Relative Uncertainty</th>
                <th className="py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {assessment.plots
                .slice()
                .sort((a, b) => b.relative_uncertainty_pct - a.relative_uncertainty_pct)
                .slice(0, 30)
                .map((p) => (
                  <tr key={p.plot_id} className="hover:bg-slate-50 dark:hover:bg-navy-800/40">
                    <td className="py-2.5 px-4 font-mono font-bold text-ocean-600 dark:text-ocean-400">{p.plot_id}</td>
                    <td className="py-2.5 px-4">{p.region}</td>
                    <td className="py-2.5 px-4">{p.plot_type}</td>
                    <td className="py-2.5 px-4">{p.tree_count}</td>
                    <td className="py-2.5 px-4 font-semibold">{p.estimated_agb_kg?.toLocaleString()} kg</td>
                    <td className="py-2.5 px-4 text-emerald-500">{p.lower_ci_95_kg?.toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-rose-500">{p.upper_ci_95_kg?.toLocaleString()}</td>
                    <td className="py-2.5 px-4 font-mono">±{p.ci_half_width_kg?.toFixed(1)} kg</td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.relative_uncertainty_pct > 18
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          : p.relative_uncertainty_pct > 12
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        ±{p.relative_uncertainty_pct}%
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <button
                        onClick={() => setSelectedPlotId(p.plot_id)}
                        className="text-xs text-ocean-500 hover:text-ocean-400 font-semibold"
                      >
                        Inspect CI
                      </button>
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
