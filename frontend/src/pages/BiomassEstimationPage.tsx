import React, { useEffect, useState } from 'react';
import {
  Scale, Info, AlertCircle, ArrowUpDown, ChevronRight,
  TrendingUp, Compass, Trees, CheckCircle
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, Cell, PieChart, Pie, Legend
} from 'recharts';
import { api } from '../services/api';
import { BiomassSummary } from '../types';

export const BiomassEstimationPage: React.FC = () => {
  const [summary, setSummary] = useState<BiomassSummary | null>(null);
  const [plots, setPlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlot, setSelectedPlot] = useState<any | null>(null);
  const [loadingPlotTrees, setLoadingPlotTrees] = useState(false);

  // Filters
  const [regionFilter, setRegionFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('total_agb_kg');
  const [ascending, setAscending] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, plotsRes] = await Promise.all([
        api.getBiomassSummary(),
        api.getBiomassPlots({
          region: regionFilter || undefined,
          plot_type: typeFilter || undefined,
          sort_by: sortBy,
          ascending
        })
      ]);
      setSummary(sumRes);
      setPlots(plotsRes);
    } catch (err) {
      console.error('Failed to load biomass data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [regionFilter, typeFilter, sortBy, ascending]);

  const handleSelectPlot = async (plotId: string) => {
    setLoadingPlotTrees(true);
    try {
      const data = await api.getSinglePlot(plotId);
      setSelectedPlot(data);
    } catch (err) {
      console.error('Failed to load plot details', err);
    } finally {
      setLoadingPlotTrees(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mathematical Standard Card & Scientific Distinction Notice */}
      <div className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-forest-500/10 text-forest-600 dark:text-forest-400">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Chave et al. (2014) Pantropical Allometric Model
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                AGB = 0.0673 × (&rho; × D² × H)⁰˙⁹⁷⁶
              </p>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-navy-800/80 border border-slate-700 text-xs text-slate-300 font-mono">
            &rho; in g/cm³ &bull; D in cm &bull; H in metres &rarr; AGB in kg
          </div>
        </div>

        {/* IMPORTANT SCIENTIFIC DISCLAIMER MANDATE */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start space-x-3 text-xs text-amber-800 dark:text-amber-200">
          <Info className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
          <div className="leading-relaxed">
            <span className="font-bold">ECOLOGICAL BOUNDARY DEFINITION:</span> All figures below strictly represent{' '}
            <span className="underline font-bold">Aboveground Biomass (AGB)</span>. They do{' '}
            <span className="underline font-bold">NOT</span> represent Total Ecosystem Carbon Stock. Comprehensive mangrove carbon crediting requires separate quantification of Belowground Biomass (BGB) and Soil Organic Carbon (SOC), which are deliberately isolated from this dendrometric AGB verification framework.
          </div>
        </div>
      </div>

      {/* Aggregate Biomass KPI Metrics */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Total Inventory AGB</p>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {summary.grand_total_agb_tonnes.toLocaleString()} Mg
            </h4>
            <p className="text-[10px] text-slate-400">{summary.grand_total_agb_kg.toLocaleString()} kg total mass</p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Mean Plot AGB</p>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {summary.mean_plot_agb_kg.toLocaleString()} kg
            </h4>
            <p className="text-[10px] text-slate-400">Equivalent to ~{(summary.mean_plot_agb_kg / 100).toFixed(1)} Mg/ha</p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Median Plot AGB</p>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {summary.median_plot_agb_kg.toLocaleString()} kg
            </h4>
            <p className="text-[10px] text-slate-400">Robust to extreme canopy outliers</p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Permanent Plots (PSP)</p>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-1">{summary.total_plots} Plots</h4>
            <p className="text-[10px] text-slate-400">{summary.total_trees} Trees Allometrically Verified</p>
          </div>
        </div>
      )}

      {/* Regional & Plot Type Charts Grid */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Regional AGB Chart */}
          <div className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Aboveground Biomass by Region</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Stock aggregation across primary mangrove deltas (Mg AGB)</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.regional_breakdown} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <XAxis dataKey="region" tick={{ fontSize: 9 }} angle={-15} textAnchor="end" stroke="#64748b" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#64748b" />
                  <Tooltip
                    formatter={(val: any) => [`${Number(val).toLocaleString()} Mg AGB`, 'Total Biomass']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="total_agb_tonnes" radius={[4, 4, 0, 0]}>
                    {summary.regional_breakdown.map((_, index) => (
                      <Cell key={`bar-${index}`} fill={['#047857', '#0d9488', '#0284c7', '#6366f1', '#10b981'][index % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Plot Type Biomass Chart */}
          <div className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Biomass by Mangrove Hydrological Type</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Comparison across Riverine, Basin, Fringe, Overwash, Scrub</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.plot_type_breakdown} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <XAxis dataKey="plot_type" tick={{ fontSize: 10 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#64748b" />
                  <Tooltip
                    formatter={(val: any) => [`${Number(val).toLocaleString()} Mg AGB`, 'Total Biomass']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="total_agb_tonnes" radius={[4, 4, 0, 0]}>
                    {summary.plot_type_breakdown.map((_, index) => (
                      <Cell key={`type-${index}`} fill={['#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b'][index % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Plot-level Table */}
      <div className="rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Plot-Level AGB Estimations</h3>
            <span className="text-[11px] text-slate-400">({plots.length} Plots)</span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-slate-700"
            >
              <option value="">All Regions</option>
              <option value="Sundarbans Delta">Sundarbans Delta</option>
              <option value="Bhitarkanika Sanctuary">Bhitarkanika</option>
              <option value="Pichavaram Estuary">Pichavaram</option>
              <option value="Andaman Archipelago">Andaman</option>
              <option value="Gulf of Kutch Marine Park">Gulf of Kutch</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-slate-700"
            >
              <option value="">All Plot Types</option>
              <option value="Riverine">Riverine</option>
              <option value="Fringe">Fringe</option>
              <option value="Basin">Basin</option>
              <option value="Overwash">Overwash</option>
              <option value="Scrub">Scrub</option>
            </select>

            <button
              onClick={() => setAscending(!ascending)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-navy-800 flex items-center space-x-1"
              title="Toggle Sort Direction"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-navy-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-4">Plot ID</th>
                <th className="py-3 px-4">Region</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Tree Count</th>
                <th className="py-3 px-4">Plot AGB (kg)</th>
                <th className="py-3 px-4">AGB Density (Mg/ha)</th>
                <th className="py-3 px-4">Mean Tree AGB</th>
                <th className="py-3 px-4">Median Tree AGB</th>
                <th className="py-3 px-4">Priority Level</th>
                <th className="py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {plots.map((p) => (
                <tr key={p.plot_id} className="hover:bg-slate-50 dark:hover:bg-navy-800/40">
                  <td className="py-2.5 px-4 font-mono font-bold text-ocean-600 dark:text-ocean-400">{p.plot_id}</td>
                  <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white">{p.region}</td>
                  <td className="py-2.5 px-4">{p.plot_type}</td>
                  <td className="py-2.5 px-4">{p.tree_count}</td>
                  <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                    {p.estimated_agb_kg?.toLocaleString()} kg
                  </td>
                  <td className="py-2.5 px-4 font-mono">{p.agb_density_mg_ha || (p.estimated_agb_kg / 100).toFixed(1)}</td>
                  <td className="py-2.5 px-4">{(p.estimated_agb_kg / p.tree_count).toFixed(1)} kg</td>
                  <td className="py-2.5 px-4 font-mono">{p.bootstrap_median_agb_kg ? (p.bootstrap_median_agb_kg / p.tree_count).toFixed(1) : '-'} kg</td>
                  <td className="py-2.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      p.priority_level === 'High Priority'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                        : p.priority_level === 'Medium Priority'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {p.priority_level || 'Pending'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    <button
                      onClick={() => handleSelectPlot(p.plot_id)}
                      className="text-xs text-ocean-500 hover:text-ocean-400 font-semibold"
                    >
                      View Trees
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Plot Tree Details Modal */}
      {selectedPlot && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center space-x-2">
                  <span>{selectedPlot.plot_id} Tree Measurements Breakdown</span>
                  <span className="text-xs text-slate-400">({selectedPlot.region} • {selectedPlot.plot_type})</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Total Plot AGB: {selectedPlot.estimated_agb_kg?.toLocaleString()} kg ({selectedPlot.trees?.length} trees)
                </p>
              </div>
              <button onClick={() => setSelectedPlot(null)} className="text-slate-400 hover:text-slate-200 text-sm font-bold">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mt-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-navy-800 border-b border-slate-200 dark:border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-2 px-3">Tree ID</th>
                    <th className="py-2 px-3">Species</th>
                    <th className="py-2 px-3">DBH (cm)</th>
                    <th className="py-2 px-3">Height (m)</th>
                    <th className="py-2 px-3">Wood Density (&rho;)</th>
                    <th className="py-2 px-3">Tree AGB (kg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {selectedPlot.trees?.map((t: any) => (
                    <tr key={t.tree_id}>
                      <td className="py-2 px-3 font-mono font-medium">{t.tree_id}</td>
                      <td className="py-2 px-3 italic">{t.species}</td>
                      <td className="py-2 px-3">{t.dbh_cm?.toFixed(1)}</td>
                      <td className="py-2 px-3">{t.height_m?.toFixed(1)}</td>
                      <td className="py-2 px-3 font-mono">{t.wood_density_g_cm3?.toFixed(3)}</td>
                      <td className="py-2 px-3 font-semibold text-emerald-500">{t.agb_kg?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedPlot(null)}
                className="px-4 py-1.5 rounded-lg bg-navy-800 text-slate-200 hover:bg-navy-700 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
