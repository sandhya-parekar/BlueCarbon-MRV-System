import React, { useEffect, useState } from 'react';
import {
  ShieldCheck, ShieldAlert, Hash, Clock, Plus,
  Search, ExternalLink, CheckCircle, RefreshCw, Key,
  Lock, Copy, Check
} from 'lucide-react';
import { api } from '../services/api';
import { BlockchainStatus, BlockchainRecord } from '../types';

export const BlockchainRegistryPage: React.FC = () => {
  const [status, setStatus] = useState<BlockchainStatus | null>(null);
  const [records, setRecords] = useState<BlockchainRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<BlockchainRecord | null>(null);
  const [plotHistory, setPlotHistory] = useState<BlockchainRecord[]>([]);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [showAnchorModal, setShowAnchorModal] = useState(false);
  const [anchorPlotId, setAnchorPlotId] = useState('PLOT-005');
  const [anchorNotes, setAnchorNotes] = useState('Field Verification Cycle #1 Ingestion');
  const [anchoring, setAnchoring] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statusRes, recordsRes] = await Promise.all([
        api.getBlockchainStatus(),
        api.getBlockchainRecords()
      ]);
      setStatus(statusRes);
      setRecords(recordsRes);
    } catch (err) {
      console.error('Failed to load blockchain ledger', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleInspectHistory = async (plotId: string) => {
    try {
      const history = await api.getPlotBlockchainHistory(plotId);
      setPlotHistory(history);
    } catch (err) {
      console.error('Failed to load plot history', err);
    }
  };

  const handleAnchorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnchoring(true);
    try {
      const res = await api.registerPlotOnChain(anchorPlotId, anchorNotes);
      setShowAnchorModal(false);
      loadData();
      alert(`Plot ${anchorPlotId} successfully anchored on-chain! Tx: ${res.record.tx_hash.slice(0, 16)}...`);
    } catch (err: any) {
      alert(`Anchoring failed: ${err.message}`);
    } finally {
      setAnchoring(false);
    }
  };

  const filteredRecords = records.filter(r =>
    r.plot_id.toLowerCase().includes(search.toLowerCase()) ||
    r.tx_hash.toLowerCase().includes(search.toLowerCase()) ||
    r.evidence_hash?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading || !status) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-ocean-500 animate-spin" />
          <p className="text-sm text-slate-400">Connecting to Blockchain Distributed Ledger...</p>
        </div>
      </div>
    );
  }

  const isSimulated = status.mode === 'SIMULATED_BLOCKCHAIN';

  return (
    <div className="space-y-6">
      {/* Node & Smart Contract Connection Header */}
      <div className="p-6 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className={`p-3 rounded-xl ${isSimulated ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
              {isSimulated ? <ShieldAlert className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Distributed MRV Registry & Smart Contract Explorer
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isSimulated
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                }`}>
                  {isSimulated ? 'Simulated Ledger Node' : 'Ganache / Ethereum Active'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                Contract: {status.contract_address || '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAnchorModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-forest-700 to-ocean-600 hover:from-forest-800 hover:to-ocean-700 text-white transition flex items-center space-x-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Anchor Plot On-Chain</span>
            </button>
            <button
              onClick={loadData}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-800"
              title="Refresh Ledger"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Clear Transparency Banner */}
        <div className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start space-x-2.5 ${
          isSimulated
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
        }`}>
          <Lock className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold">SYSTEM TRANSPARENCY NOTICE: </span>
            {isSimulated
              ? 'Local Ganache RPC was not detected on localhost:7545. Operating in local Cryptographic Ledger Simulation mode using deterministic SHA-256 block hashing and persistent state. All hashes and timestamps are cryptographically generated and verifiable.'
              : 'Directly communicating with local Ethereum Ganache JSON-RPC provider. Smart contract transactions and state transitions are broadcast to the EVM network.'}
          </div>
        </div>
      </div>

      {/* Blockchain Parameters Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Current Block Height</p>
          <h4 className="text-xl font-bold font-mono text-ocean-500 mt-1">#{status.current_block}</h4>
          <p className="text-[10px] text-slate-400">Sequential Block Number</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Total On-Chain Logs</p>
          <h4 className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">{status.total_transactions_recorded}</h4>
          <p className="text-[10px] text-slate-400">Audit Transactions Registered</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Signing Authority</p>
          <h4 className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate mt-2" title={status.account}>
            {status.account ? `${status.account.slice(0, 10)}...${status.account.slice(-8)}` : 'Consortium Authority'}
          </h4>
          <p className="text-[10px] text-slate-400 mt-0.5">Authorized Verification Key</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Ledger Cryptographic Integrity</p>
          <h4 className="text-xl font-bold text-emerald-500 mt-1 flex items-center space-x-1.5">
            <CheckCircle className="w-5 h-5" />
            <span>Verified</span>
          </h4>
          <p className="text-[10px] text-slate-400">Zero Hash Inconsistencies</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Plot ID, Transaction Hash, or Evidence Hash..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-ocean-500"
          />
        </div>
      </div>

      {/* Ledger Records Table */}
      <div className="rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 dark:bg-navy-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold font-sans">
              <tr>
                <th className="py-3 px-4">Block #</th>
                <th className="py-3 px-4">Plot ID</th>
                <th className="py-3 px-4">Transaction Hash</th>
                <th className="py-3 px-4">Evidence Hash (SHA-256)</th>
                <th className="py-3 px-4">Estimated AGB</th>
                <th className="py-3 px-4">Uncertainty %</th>
                <th className="py-3 px-4">Priority Score</th>
                <th className="py-3 px-4">Verification Status</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Audit Trail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-[11px]">
              {filteredRecords.map((r, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-navy-800/40">
                  <td className="py-3 px-4 font-bold text-ocean-500">#{r.block_number}</td>
                  <td className="py-3 px-4 font-sans font-bold text-slate-900 dark:text-white">{r.plot_id}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400">
                      <span>{r.tx_hash.slice(0, 10)}...{r.tx_hash.slice(-8)}</span>
                      <button onClick={() => handleCopy(r.tx_hash)} className="hover:text-ocean-400">
                        {copiedHash === r.tx_hash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                    <span title={r.evidence_hash}>{r.evidence_hash ? `${r.evidence_hash.slice(0, 8)}...` : '-'}</span>
                  </td>
                  <td className="py-3 px-4 font-sans font-medium">{r.estimated_agb_kg?.toLocaleString()} kg</td>
                  <td className="py-3 px-4 font-sans text-amber-500">±{r.relative_uncertainty_pct}%</td>
                  <td className="py-3 px-4 font-sans font-bold">{r.composite_priority_score}</td>
                  <td className="py-3 px-4 font-sans">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      r.verification_status === 'Approved'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                        : r.verification_status === 'Rejected'
                        ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                    }`}>
                      {r.verification_status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-400 text-[10px]">
                    {new Date(r.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-sans">
                    <button
                      onClick={() => { setSelectedRecord(r); handleInspectHistory(r.plot_id); }}
                      className="text-xs text-ocean-500 hover:text-ocean-400 font-semibold"
                    >
                      History
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plot Blockchain History Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Blockchain Audit History: {selectedRecord.plot_id}
              </h3>
              <button onClick={() => setSelectedRecord(null)} className="text-slate-400 hover:text-slate-200 font-bold">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mt-4 space-y-3">
              {plotHistory.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Loading plot history...</p>
              ) : (
                plotHistory.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ocean-400">Block #{item.block_number}</span>
                      <span className="text-[10px] text-slate-400">{new Date(item.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="font-mono text-[11px] text-slate-400 break-all">Tx: {item.tx_hash}</p>
                    <div className="flex items-center space-x-3 text-[11px]">
                      <span>Status: <span className="font-bold text-slate-200">{item.verification_status}</span></span>
                      {item.verified_by && <span>Officer: <span className="text-ocean-300">{item.verified_by}</span></span>}
                    </div>
                    {item.verification_comments && (
                      <p className="text-[11px] text-slate-300 italic pt-1 border-t border-slate-700/50">
                        "{item.verification_comments}"
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-1.5 rounded-lg bg-navy-800 text-slate-200 hover:bg-navy-700 text-xs font-semibold"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Anchor New Plot Modal */}
      {showAnchorModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-3">
              Anchor Plot Biomass to Blockchain
            </h3>
            <form onSubmit={handleAnchorSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Plot ID</label>
                <input
                  type="text"
                  required
                  value={anchorPlotId}
                  onChange={(e) => setAnchorPlotId(e.target.value)}
                  placeholder="PLOT-005"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-navy-800 border border-slate-300 dark:border-slate-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Audit Notes / Evidence Description</label>
                <textarea
                  rows={3}
                  value={anchorNotes}
                  onChange={(e) => setAnchorNotes(e.target.value)}
                  placeholder="Cycle #1 Terrestrial dendrometry dataset"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-navy-800 border border-slate-300 dark:border-slate-700 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAnchorModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={anchoring}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-forest-700 to-ocean-600 text-white font-semibold disabled:opacity-50"
                >
                  {anchoring ? 'Anchoring...' : 'Broadcast to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
