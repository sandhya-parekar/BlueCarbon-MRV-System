import React, { useEffect, useState } from 'react';
import {
  Award, Sliders, Filter, ArrowUpDown, ShieldAlert,
  Search, CheckCircle2, ChevronRight, Download, RefreshCw, X, Info
} from 'lucide-react';
import { api } from '../services/api';
import { PrioritizationSummary, PrioritizationPlot } from '../types';

export const PrioritizationPage: React.FC = () => {
  const [summary, setSummary] = useState<PrioritizationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  // Weights State (Default Equal: 33.3% each)
  const [weights, setWeights] = useState({
    w_uncertainty: 0.3333,
    w_data_quality: 0.3333,
    w_biomass_impact: 0.3333
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getPrioritizationSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load prioritization summary', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRecalculateWeights = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecalculating(true);
    try {
      await api.recalculatePrioritization(weights);
      setShowWeightModal(false);
      loadData();
    } catch (err: any) {
      alert(`Error updating weights: ${err.message}`);
    } finally {
      setRecalculating(false);
    }
  };

  const filteredPlots = (summary?.plots || []).filter((p) => {
    const matchSearch = p.plot_id.toLowerCase().includes(search.toLowerCase()) ||
                        p.region.toLowerCase().includes(search.toLowerCase());
    const matchPriority = !priorityFilter || p.priority_level.toLowerCase() === priorityFilter.toLowerCase();
    return matchSearch && matchPriority;
  });

  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-ocean-500 animate-spin" />
          <p className="text-sm text-slate-400">Computing Multi-Indicator Percentile Prioritization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Research Framework Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-navy-900 via-forest-950 to-navy-900 border border-slate-800 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-ocean-500/20 text-ocean-300 border border-ocean-500/40">
                Core Research Contribution
              </span>
              <span className="text-xs text-slate-400">• Tri-Indicator Percentile Ranking Optimization</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Uncertainty-Aware Verification Prioritization Engine
            </h1>
            <p className="text-xs text-slate-300 max-w-3xl mt-1 leading-relaxed">
              Synthesizes (1) Bootstrap Relative Uncertainty %, (2) Dendrometric Data Quality Anomaly Metric,
              and (3) Total AGB Biomass Impact into standardized percentile scores [0-100].
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowWeightModal(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-ocean-600 to-teal-500 hover:from-ocean-500 hover:to-teal-400 text-white transition flex items-center space-x-2 shadow-lg shadow-ocean-950/50"
            >
              <Sliders className="w-4 h-4" />
              <span>Tune Indicator Weights</span>
            </button>
          </div>
        </div>

        {/* Formulation Formula Pill */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-4 text-xs font-mono text-ocean-200">
          <div className="px-3 py-1.5 rounded-lg bg-navy-950/70 border border-slate-700/60">
            Priority Score = (Uncertainty_pct_rank + DataQuality_pct_rank + BiomassImpact_pct_rank) / 3
          </div>
          <span className="text-[11px] text-slate-400 font-sans">Equal baseline weighting (33.3% each)</span>
        </div>
      </div>

      {/* Priority Classification KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* High Priority */}
        <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-rose-500/30 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
            {summary.high_priority_count}
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider font-bold text-rose-600 dark:text-rose-400">High Priority Plots</span>
            <p className="text-xs text-slate-500 dark:text-slate-400">Score &ge; 66.0 (Tier-1 Mandated Audit)</p>
          </div>
        </div>

        {/* Medium Priority */}
        <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-amber-500/30 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            {summary.medium_priority_count}
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400">Medium Priority Plots</span>
            <p className="text-xs text-slate-500 dark:text-slate-400">Score 33.0 - 66.0 (Tier-2 UAV/SAR Cross-Check)</p>
          </div>
        </div>

        {/* Low Priority */}
        <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-emerald-500/30 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
            {summary.low_priority_count}
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400">Low Priority Plots</span>
            <p className="text-xs text-slate-500 dark:text-slate-400">Score &lt; 33.0 (Tier-3 Standard Desk Audit)</p>
          </div>
        </div>

        {/* Mean Priority Score */}
        <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-ocean-500/10 text-ocean-400 flex items-center justify-center font-bold">
            {summary.mean_priority_score}
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-700 dark:text-slate-300">Mean Composite Score</span>
            <p className="text-xs text-slate-500 dark:text-slate-400">Normalized Scale [0 - 100]</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Plot ID or Region..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-ocean-500"
          />
        </div>

        <div className="w-full sm:w-56">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-ocean-500 font-medium"
          >
            <option value="">All Priority Classes (118 Plots)</option>
            <option value="High Priority">High Priority Only ({summary.high_priority_count})</option>
            <option value="Medium Priority">Medium Priority Only ({summary.medium_priority_count})</option>
            <option value="Low Priority">Low Priority Only ({summary.low_priority_count})</option>
          </select>
        </div>
      </div>

      {/* Prioritization Master Table */}
      <div className="rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-navy-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Plot ID</th>
                <th className="py-3 px-4">Region</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">AGB (kg)</th>
                <th className="py-3 px-4">Uncertainty %</th>
                <th className="py-3 px-4">Unc Score</th>
                <th className="py-3 px-4">DQ Score</th>
                <th className="py-3 px-4">Biomass Score</th>
                <th className="py-3 px-4">Composite Score</th>
                <th className="py-3 px-4">Priority Level</th>
                <th className="py-3 px-4">Recommended Verification Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredPlots.map((p) => {
                const isHigh = p.priority_level === 'High Priority';
                const isMed = p.priority_level === 'Medium Priority';
                return (
                  <tr key={p.plot_id} className={`hover:bg-slate-50 dark:hover:bg-navy-800/40 ${isHigh ? 'bg-rose-500/5' : ''}`}>
                    <td className="py-3 px-4 font-bold text-slate-500 dark:text-slate-400">#{p.priority_rank}</td>
                    <td className="py-3 px-4 font-mono font-bold text-ocean-600 dark:text-ocean-400">{p.plot_id}</td>
                    <td className="py-3 px-4 font-medium">{p.region}</td>
                    <td className="py-3 px-4">{p.plot_type}</td>
                    <td className="py-3 px-4 font-semibold">{p.estimated_agb_kg?.toLocaleString()} kg</td>
                    <td className="py-3 px-4 text-amber-500 font-medium">±{p.relative_uncertainty_pct}%</td>
                    <td className="py-3 px-4 font-mono">{p.uncertainty_score?.toFixed(1)}</td>
                    <td className="py-3 px-4 font-mono">{p.data_quality_score?.toFixed(1)}</td>
                    <td className="py-3 px-4 font-mono">{p.biomass_impact_score?.toFixed(1)}</td>
                    <td className="py-3 px-4 font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {p.composite_priority_score?.toFixed(1)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        isHigh
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          : isMed
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {p.priority_level}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] max-w-xs text-slate-600 dark:text-slate-300">
                      {p.recommended_action}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Indicator Weights Tuning Modal */}
      {showWeightModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-ocean-400" />
                <span>Adjust Indicator Weights</span>
              </h3>
              <button onClick={() => setShowWeightModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecalculateWeights} className="space-y-4 mt-4 text-xs">
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Relative Uncertainty Weight</span>
                  <span className="font-mono text-ocean-400">{(weights.w_uncertainty * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={weights.w_uncertainty}
                  onChange={(e) => setWeights({ ...weights, w_uncertainty: parseFloat(e.target.value) })}
                  className="w-full accent-ocean-500"
                />
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Data Quality Concern Weight</span>
                  <span className="font-mono text-forest-400">{(weights.w_data_quality * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={weights.w_data_quality}
                  onChange={(e) => setWeights({ ...weights, w_data_quality: parseFloat(e.target.value) })}
                  className="w-full accent-forest-500"
                />
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Estimated Biomass Impact Weight</span>
                  <span className="font-mono text-amber-400">{(weights.w_biomass_impact * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={weights.w_biomass_impact}
                  onChange={(e) => setWeights({ ...weights, w_biomass_impact: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-400">
                Weight sum: <span className="font-bold text-slate-200">{(weights.w_uncertainty + weights.w_data_quality + weights.w_biomass_impact).toFixed(2)}</span>
                {' '}(Normalized across composite formulation).
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowWeightModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recalculating}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-forest-700 to-ocean-600 text-white font-semibold disabled:opacity-50"
                >
                  {recalculating ? 'Recomputing...' : 'Apply & Re-Rank'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
