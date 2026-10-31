import React, { useEffect, useState } from 'react';
import {
  GitCompare, Sliders, Info, TrendingUp, CheckCircle,
  BarChart3, RefreshCw, Award, AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, Cell, Legend
} from 'recharts';
import { api } from '../services/api';
import { ComparativeAnalysis } from '../types';

export const ComparativeAnalysisPage: React.FC = () => {
  const [data, setData] = useState<ComparativeAnalysis | null>(null);
  const [budget, setBudget] = useState(24);
  const [simulations, setSimulations] = useState(10000);
  const [loading, setLoading] = useState(true);
  const [runningSim, setRunningSim] = useState(false);

  const runAnalysis = async () => {
    setRunningSim(true);
    try {
      const res = await api.getComparativeAnalysis(budget, simulations);
      setData(res);
    } catch (err) {
      console.error('Comparative analysis failed', err);
    } finally {
      setLoading(false);
      setRunningSim(false);
    }
  };

  useEffect(() => {
    runAnalysis();
  }, [budget]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-ocean-500 animate-spin" />
          <p className="text-sm text-slate-400">Executing 10,000 Monte Carlo Simulation Runs...</p>
        </div>
      </div>
    );
  }

  // Chart data formatting
  const chartData = data.strategies.map((s) => ({
    name: s.strategy_name.split('(')[0].trim(),
    captureEfficiency: s.capture_efficiency_pct,
    capturedCount: s.high_priority_captured_count,
    biomassCoverage: s.biomass_coverage_pct,
  }));

  return (
    <div className="space-y-6">
      {/* Header Banner & Budget Slider Control */}
      <div className="p-6 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-xl bg-ocean-500/10 text-ocean-500">
              <GitCompare className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Comparative Verification Sampling Simulation
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Evaluation of 4 audit strategies across 10,000 Monte Carlo iterations
              </p>
            </div>
          </div>

          {/* Monitoring Budget Control Slider */}
          <div className="flex items-center space-x-4 p-3 rounded-xl bg-slate-50 dark:bg-navy-800/80 border border-slate-200 dark:border-slate-700">
            <div className="text-xs">
              <span className="text-slate-400">Audit Budget:</span>{' '}
              <span className="font-bold text-ocean-500 text-sm">{budget} Plots</span>{' '}
              <span className="text-[10px] text-slate-400">({((budget / data.total_plots_evaluated) * 100).toFixed(1)}% sampling intensity)</span>
            </div>
            <input
              type="range"
              min="10"
              max="60"
              step="2"
              value={budget}
              onChange={(e) => setBudget(parseInt(e.target.value))}
              className="w-32 accent-ocean-500"
            />
          </div>
        </div>

        {/* MANDATORY SCIENTIFIC DISCLAIMER NOTE */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-950/70 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-start space-x-2.5">
          <Info className="w-4 h-4 text-ocean-500 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold text-slate-900 dark:text-white">METHODOLOGICAL DISCLAIMER: </span>
            {data.scientific_disclaimer}
          </div>
        </div>
      </div>

      {/* Strategy Comparison Chart */}
      <div className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              High-Priority Capture Efficiency vs Other Sampling Techniques
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Percentage of the {data.total_high_priority_plots} High-Priority plots captured within a fixed budget of {budget} plots
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-bold">10,000 Monte Carlo Runs</span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 20 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#64748b" />
              <YAxis tick={{ fontSize: 10 }} stroke="#64748b" unit="%" />
              <Tooltip
                formatter={(val: any, name: any) => [`${val}%`, name === 'captureEfficiency' ? 'High-Priority Captured %' : 'Biomass Inventory Covered %']}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
              />
              <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar name="High-Priority Captured %" dataKey="captureEfficiency" fill="#0d9488" radius={[4, 4, 0, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={`bar-${index}`} fill={['#10b981', '#0284c7', '#f59e0b', '#64748b'][index % 4]} />
                ))}
              </Bar>
              <Bar name="Biomass Inventory Covered %" dataKey="biomassCoverage" fill="#6366f1" radius={[4, 4, 0, 0]} opacity={0.6} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Strategies Detailed Comparison Table */}
      <div className="rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
            4-Strategy Sampling Performance Breakdown
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Comparing multi-indicator prioritization against pure uncertainty, systematic intervals, and Monte Carlo random draws
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-navy-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-4">Sampling Strategy</th>
                <th className="py-3 px-4">Selection Technique</th>
                <th className="py-3 px-4">Plots Audited</th>
                <th className="py-3 px-4">High-Priority Captured</th>
                <th className="py-3 px-4">Capture Efficiency</th>
                <th className="py-3 px-4">Biomass Covered</th>
                <th className="py-3 px-4">Mean Uncertainty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {data.strategies.map((s, idx) => {
                const isProposed = idx === 0;
                return (
                  <tr key={idx} className={`hover:bg-slate-50 dark:hover:bg-navy-800/40 ${isProposed ? 'bg-emerald-500/5 dark:bg-emerald-500/10' : ''}`}>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                      {isProposed && <Award className="w-4 h-4 text-emerald-500 shrink-0" />}
                      <span>{s.strategy_name}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 max-w-xs">{s.selection_technique}</td>
                    <td className="py-3 px-4 font-mono font-bold">{s.plots_selected_count}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {s.high_priority_captured_count} / {s.total_high_priority_target}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        isProposed
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
                          : 'bg-slate-100 dark:bg-navy-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        {s.capture_efficiency_pct}%
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {s.cumulative_biomass_captured_kg?.toLocaleString()} kg ({s.biomass_coverage_pct}%)
                    </td>
                    <td className="py-3 px-4 font-mono text-amber-500">±{s.mean_uncertainty_of_selected}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Indicator Weight Sensitivity Analysis Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Weight Sensitivity Analysis on Selection Stability
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Evaluating how variations in indicator weights affect high-priority capture rates under {budget}-plot budget
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-navy-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Scenario</th>
                <th className="py-2.5 px-3">Uncertainty Wt</th>
                <th className="py-2.5 px-3">Data Quality Wt</th>
                <th className="py-2.5 px-3">Biomass Impact Wt</th>
                <th className="py-2.5 px-3">High-Priority Captured</th>
                <th className="py-2.5 px-3">Capture Rate %</th>
                <th className="py-2.5 px-3">Mean Priority Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {data.weight_sensitivity_analysis.map((ws, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-navy-800/40">
                  <td className="py-2.5 px-3 font-sans font-semibold text-slate-900 dark:text-white">{ws.scenario}</td>
                  <td className="py-2.5 px-3">{(ws.w_uncertainty * 100).toFixed(0)}%</td>
                  <td className="py-2.5 px-3">{(ws.w_data_quality * 100).toFixed(0)}%</td>
                  <td className="py-2.5 px-3">{(ws.w_biomass_impact * 100).toFixed(0)}%</td>
                  <td className="py-2.5 px-3 font-bold text-ocean-400">{ws.high_priority_captured} plots</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-500">{ws.capture_rate_pct}%</td>
                  <td className="py-2.5 px-3">{ws.mean_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
