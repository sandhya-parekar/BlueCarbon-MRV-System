import React, { useEffect, useState } from 'react';
import {
  ClipboardCheck, CheckCircle2, XCircle, AlertTriangle,
  Search, Filter, Shield, MessageSquare, ArrowRight,
  Clock, RefreshCw, FileText, X
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const VerificationManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  
  // Decision Modal
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [decisionStatus, setDecisionStatus] = useState<string>('Approved');
  const [decisionComments, setDecisionComments] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await api.getVerificationTasks({
        status_filter: statusFilter || undefined,
        priority_filter: priorityFilter || undefined,
      });
      setTasks(data);
    } catch (err) {
      console.error('Failed to load verification tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [priorityFilter, statusFilter]);

  const handleOpenDecision = (task: any, defaultStatus: string = 'Approved') => {
    setSelectedTask(task);
    setDecisionStatus(defaultStatus);
    setDecisionComments(
      defaultStatus === 'Approved'
        ? 'Field tree measurements, DBH distributions, and bootstrap CI bounds verified consistent with Chave et al. (2014) standard.'
        : defaultStatus === 'Additional Measurements Requested'
        ? 'High relative uncertainty (>18%) observed. Mandate secondary UAV-LiDAR cross-validation transect.'
        : 'Discrepancy detected in species-specific wood density coefficients.'
    );
  };

  const handleSubmitDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    setSubmitting(true);
    try {
      const res = await api.submitVerificationDecision(
        selectedTask.plot_id,
        decisionStatus,
        decisionComments
      );
      setSelectedTask(null);
      setToast(`Verification decision recorded on blockchain! Tx Hash: ${res.audit_receipt.tx_hash.slice(0, 16)}...`);
      loadTasks();
    } catch (err: any) {
      alert(`Decision submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTasks = tasks.filter((t) =>
    t.plot_id.toLowerCase().includes(search.toLowerCase()) ||
    t.region.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Officer Workflow Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Independent Verification Officer Auditing Console
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Review high-uncertainty mangrove plots, inspect supporting allometric evidence, and immutably record audit determinations
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadTasks}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-white hover:bg-navy-800"
            title="Refresh Tasks"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {toast && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toast}</span>
          </div>
          <button onClick={() => setToast(null)} className="p-1 hover:opacity-75">✕</button>
        </div>
      )}

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

        <div className="w-full sm:w-48">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-ocean-500"
          >
            <option value="">All Priorities</option>
            <option value="High Priority">High Priority (Tier-1)</option>
            <option value="Medium Priority">Medium Priority (Tier-2)</option>
            <option value="Low Priority">Low Priority (Tier-3)</option>
          </select>
        </div>

        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-ocean-500"
          >
            <option value="">All Verification Statuses</option>
            <option value="Pending">Pending Audit</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Additional Measurements Requested">Measurements Requested</option>
          </select>
        </div>
      </div>

      {/* Verification Tasks Table */}
      <div className="rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-navy-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-4">Priority Rank</th>
                <th className="py-3 px-4">Plot ID</th>
                <th className="py-3 px-4">Region</th>
                <th className="py-3 px-4">Estimated AGB</th>
                <th className="py-3 px-4">Uncertainty %</th>
                <th className="py-3 px-4">Priority Score</th>
                <th className="py-3 px-4">Priority Level</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4">Recommended Action</th>
                <th className="py-3 px-4">Audit Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredTasks.map((t) => {
                const isHigh = t.priority_level === 'High Priority';
                const status = t.verification_status || 'Pending';
                return (
                  <tr key={t.plot_id} className={`hover:bg-slate-50 dark:hover:bg-navy-800/40 ${isHigh ? 'bg-rose-500/5' : ''}`}>
                    <td className="py-3 px-4 font-bold text-slate-500">#{t.priority_rank}</td>
                    <td className="py-3 px-4 font-mono font-bold text-ocean-600 dark:text-ocean-400">{t.plot_id}</td>
                    <td className="py-3 px-4">{t.region}</td>
                    <td className="py-3 px-4 font-semibold">{t.estimated_agb_kg?.toLocaleString()} kg</td>
                    <td className="py-3 px-4 text-amber-500 font-medium">±{t.relative_uncertainty_pct}%</td>
                    <td className="py-3 px-4 font-bold font-mono">{t.composite_priority_score}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isHigh
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      }`}>
                        {t.priority_level}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        status === 'Approved'
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                          : status === 'Rejected'
                          ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                          : status === 'Additional Measurements Requested'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                          : 'bg-slate-200 dark:bg-navy-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        {status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] max-w-xs text-slate-500 dark:text-slate-400">
                      {t.recommended_action?.split(':')[0]}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleOpenDecision(t, 'Approved')}
                          className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded"
                          title="Approve Plot Verification"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDecision(t, 'Additional Measurements Requested')}
                          className="p-1 text-amber-500 hover:bg-amber-500/10 rounded"
                          title="Request Additional Measurements"
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDecision(t, 'Rejected')}
                          className="p-1 text-rose-500 hover:bg-rose-500/10 rounded"
                          title="Reject Verification"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification Decision Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Record Verification Determination
                </h3>
                <p className="text-xs text-slate-400">Plot: {selectedTask.plot_id} ({selectedTask.region})</p>
              </div>
              <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-slate-200 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitDecision} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5 font-semibold">Audit Decision Status</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDecisionStatus('Approved')}
                    className={`py-2 px-3 rounded-lg border font-semibold text-center transition ${
                      decisionStatus === 'Approved'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : 'border-slate-700 text-slate-400'
                    }`}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecisionStatus('Additional Measurements Requested')}
                    className={`py-2 px-3 rounded-lg border font-semibold text-center transition ${
                      decisionStatus === 'Additional Measurements Requested'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                        : 'border-slate-700 text-slate-400'
                    }`}
                  >
                    Request Measurements
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecisionStatus('Rejected')}
                    className={`py-2 px-3 rounded-lg border font-semibold text-center transition ${
                      decisionStatus === 'Rejected'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                        : 'border-slate-700 text-slate-400'
                    }`}
                  >
                    Reject
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Verification Officer Comments</label>
                <textarea
                  rows={4}
                  required
                  value={decisionComments}
                  onChange={(e) => setDecisionComments(e.target.value)}
                  placeholder="State technical justification, error tolerance, and field observation notes..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-navy-800 border border-slate-300 dark:border-slate-700 focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 flex items-center space-x-2">
                <Shield className="w-4 h-4 text-ocean-400 shrink-0" />
                <span>This decision will be cryptographically signed by {user?.email} and recorded to the blockchain audit log.</span>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-forest-700 to-ocean-600 text-white font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Signing on Blockchain...' : 'Commit & Sign Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
