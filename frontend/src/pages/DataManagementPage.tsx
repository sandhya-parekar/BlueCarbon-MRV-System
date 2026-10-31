import React, { useEffect, useState, useRef } from 'react';
import {
  Upload, Plus, Search, Filter, CheckCircle2,
  AlertCircle, RefreshCw, Sparkles, Download, Trees,
  FileSpreadsheet, X
} from 'lucide-react';
import { api } from '../services/api';
import { TreeMeasurement, DatasetStats } from '../types';
import { useAuth } from '../context/AuthContext';

export const DataManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [trees, setTrees] = useState<TreeMeasurement[]>([]);
  const [stats, setStats] = useState<DatasetStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [limit] = useState(25);

  // Filters & Search
  const [searchPlot, setSearchPlot] = useState('');
  const [filterSpecies, setFilterSpecies] = useState('');
  const [filterRegion, setFilterRegion] = useState('');

  // Modals & UI States
  const [showAddModal, setShowAddModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Tree Form State
  const [newTree, setNewTree] = useState({
    tree_id: '',
    plot_id: 'PLOT-001',
    species: 'Rhizophora mangle',
    dbh_cm: 22.5,
    height_m: 11.0,
    wood_density_g_cm3: 0.74,
    region: 'Sundarbans Delta',
    plot_type: 'Fringe',
    latitude: 21.94,
    longitude: 88.89
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [treeRes, statsRes] = await Promise.all([
        api.getTrees({
          plot_id: searchPlot || undefined,
          species: filterSpecies || undefined,
          region: filterRegion || undefined,
          skip: page * limit,
          limit
        }),
        api.getDatasetStats()
      ]);
      setTrees(treeRes.trees);
      setTotal(treeRes.total);
      setStats(statsRes);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to load tree data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, searchPlot, filterSpecies, filterRegion]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setNotification(null);
    try {
      const res = await api.uploadCsv(file);
      setNotification({ type: 'success', message: res.message || 'CSV file successfully uploaded and ingested!' });
      setPage(0);
      loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to process CSV file.' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCleanAndValidate = async () => {
    setCleaning(true);
    try {
      const res = await api.cleanAndValidateDataset();
      setNotification({
        type: 'success',
        message: `Dataset cleaned: ${res.missing_values_count} missing fields imputed, ${res.duplicate_rows_count} duplicates removed.`
      });
      loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Validation failed.' });
    } finally {
      setCleaning(false);
    }
  };

  const handleResetSample = async () => {
    if (!confirm('Reset dataset to the standard 118-plot MCA research sample?')) return;
    try {
      await api.resetSampleDataset();
      setNotification({ type: 'success', message: 'Standard 118-plot mangrove dataset initialized.' });
      loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to reset sample' });
    }
  };

  const handleAddTreeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addTreeMeasurement(newTree);
      setNotification({ type: 'success', message: `Tree ${newTree.tree_id} registered with computed AGB.` });
      setShowAddModal(false);
      loadData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-ocean-500" />
            <span>Mangrove Field Measurements Database</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Individual tree dendrometry: Diameter at Breast Height (DBH), Total Height (H), Species Wood Density (&rho;)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-navy-800 hover:bg-navy-700 text-white border border-slate-700 transition flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
          >
            <Upload className="w-4 h-4 text-ocean-400" />
            <span>{uploading ? 'Parsing CSV...' : 'Upload CSV'}</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-forest-700 to-ocean-600 text-white hover:from-forest-800 hover:to-ocean-700 transition flex items-center space-x-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Manual Entry</span>
          </button>

          <button
            onClick={handleCleanAndValidate}
            disabled={cleaning}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition flex items-center space-x-1.5"
            title="Impute missing and clean duplicate tree records"
          >
            <Sparkles className={`w-4 h-4 ${cleaning ? 'animate-spin' : ''}`} />
            <span>{cleaning ? 'Validating...' : 'Validate & Clean'}</span>
          </button>

          <button
            onClick={handleResetSample}
            className="px-3 py-2 rounded-xl text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-navy-800 transition"
            title="Reset to 118-plot benchmark dataset"
          >
            Reset Sample
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
          notification.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
        }`}>
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Dataset Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Total Measured Trees</p>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-1">{stats.total_trees.toLocaleString()}</h4>
            <p className="text-[10px] text-slate-400">{stats.total_plots} Permanent Sample Plots (PSP)</p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Mean Tree DBH</p>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-1">{stats.mean_dbh_cm} cm</h4>
            <p className="text-[10px] text-slate-400">Mean Height: {stats.mean_height_m} m</p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Mean Wood Density (&rho;)</p>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-1">{stats.mean_wood_density} g/cm³</h4>
            <p className="text-[10px] text-slate-400">{Object.keys(stats.species_distribution).length} Mangrove Species</p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Quality Flags / Anomalies</p>
            <h4 className={`text-xl font-bold mt-1 ${stats.data_quality_issues_detected > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
              {stats.data_quality_issues_detected} Issues
            </h4>
            <p className="text-[10px] text-slate-400">Used for Prioritization Penalty</p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchPlot}
            onChange={(e) => { setSearchPlot(e.target.value); setPage(0); }}
            placeholder="Search Plot ID (e.g. PLOT-001)..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-ocean-500"
          />
        </div>

        <div className="w-full sm:w-48">
          <select
            value={filterSpecies}
            onChange={(e) => { setFilterSpecies(e.target.value); setPage(0); }}
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-ocean-500"
          >
            <option value="">All Mangrove Species</option>
            <option value="Rhizophora mangle">Rhizophora mangle</option>
            <option value="Avicennia marina">Avicennia marina</option>
            <option value="Sonneratia alba">Sonneratia alba</option>
            <option value="Bruguiera gymnorhiza">Bruguiera gymnorhiza</option>
            <option value="Ceriops tagal">Ceriops tagal</option>
            <option value="Xylocarpus granatum">Xylocarpus granatum</option>
          </select>
        </div>

        <div className="w-full sm:w-48">
          <select
            value={filterRegion}
            onChange={(e) => { setFilterRegion(e.target.value); setPage(0); }}
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-ocean-500"
          >
            <option value="">All Regions</option>
            <option value="Sundarbans Delta">Sundarbans Delta</option>
            <option value="Bhitarkanika Sanctuary">Bhitarkanika Sanctuary</option>
            <option value="Pichavaram Estuary">Pichavaram Estuary</option>
            <option value="Andaman Archipelago">Andaman Archipelago</option>
            <option value="Gulf of Kutch Marine Park">Gulf of Kutch</option>
          </select>
        </div>
      </div>

      {/* Tree Records Table */}
      <div className="rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-navy-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-4">Tree ID</th>
                <th className="py-3 px-4">Plot ID</th>
                <th className="py-3 px-4">Species</th>
                <th className="py-3 px-4">DBH (cm)</th>
                <th className="py-3 px-4">Height (m)</th>
                <th className="py-3 px-4">Wood Density (&rho;)</th>
                <th className="py-3 px-4">AGB (kg)</th>
                <th className="py-3 px-4">Region</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Quality Flag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-ocean-500" />
                    <span>Loading tree records...</span>
                  </td>
                </tr>
              ) : trees.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    No tree records found matching query.
                  </td>
                </tr>
              ) : (
                trees.map((t) => (
                  <tr key={t.tree_id} className="hover:bg-slate-50 dark:hover:bg-navy-800/40">
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-900 dark:text-white">{t.tree_id}</td>
                    <td className="py-2.5 px-4 font-semibold text-ocean-600 dark:text-ocean-400">{t.plot_id}</td>
                    <td className="py-2.5 px-4 italic">{t.species}</td>
                    <td className="py-2.5 px-4">{t.dbh_cm?.toFixed(1)}</td>
                    <td className="py-2.5 px-4">{t.height_m?.toFixed(1)}</td>
                    <td className="py-2.5 px-4 font-mono">{t.wood_density_g_cm3?.toFixed(3)}</td>
                    <td className="py-2.5 px-4 font-semibold text-emerald-600 dark:text-emerald-400">{t.agb_kg?.toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">{t.region}</td>
                    <td className="py-2.5 px-4">{t.plot_type}</td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        t.measurement_quality_flag === 'VALID'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      }`}>
                        {t.measurement_quality_flag}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Showing {trees.length > 0 ? page * limit + 1 : 0} to {Math.min((page + 1) * limit, total)} of {total} trees</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-navy-800"
            >
              Previous
            </button>
            <span className="font-semibold text-slate-900 dark:text-white">Page {page + 1} of {Math.ceil(total / limit) || 1}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) * limit >= total}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-navy-800"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Manual Tree Measurement Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Add Tree Measurement</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTreeSubmit} className="space-y-3 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Tree ID</label>
                  <input
                    type="text"
                    required
                    value={newTree.tree_id}
                    onChange={(e) => setNewTree({ ...newTree, tree_id: e.target.value })}
                    placeholder="T-3001"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-navy-800 border border-slate-300 dark:border-slate-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Plot ID</label>
                  <input
                    type="text"
                    required
                    value={newTree.plot_id}
                    onChange={(e) => setNewTree({ ...newTree, plot_id: e.target.value })}
                    placeholder="PLOT-001"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-navy-800 border border-slate-300 dark:border-slate-700 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Species</label>
                <select
                  value={newTree.species}
                  onChange={(e) => setNewTree({ ...newTree, species: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-navy-800 border border-slate-300 dark:border-slate-700 focus:outline-none"
                >
                  <option value="Rhizophora mangle">Rhizophora mangle (Red Mangrove)</option>
                  <option value="Avicennia marina">Avicennia marina (Grey Mangrove)</option>
                  <option value="Sonneratia alba">Sonneratia alba (Mangrove Apple)</option>
                  <option value="Bruguiera gymnorhiza">Bruguiera gymnorhiza (Black Mangrove)</option>
                  <option value="Ceriops tagal">Ceriops tagal (Yellow Mangrove)</option>
                  <option value="Xylocarpus granatum">Xylocarpus granatum (Cannonball Mangrove)</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">DBH (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newTree.dbh_cm}
                    onChange={(e) => setNewTree({ ...newTree, dbh_cm: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-navy-800 border border-slate-300 dark:border-slate-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Height (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newTree.height_m}
                    onChange={(e) => setNewTree({ ...newTree, height_m: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-navy-800 border border-slate-300 dark:border-slate-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Density (&rho; g/cm³)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newTree.wood_density_g_cm3}
                    onChange={(e) => setNewTree({ ...newTree, wood_density_g_cm3: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-navy-800 border border-slate-300 dark:border-slate-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Region</label>
                  <select
                    value={newTree.region}
                    onChange={(e) => setNewTree({ ...newTree, region: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-navy-800 border border-slate-300 dark:border-slate-700 focus:outline-none"
                  >
                    <option value="Sundarbans Delta">Sundarbans Delta</option>
                    <option value="Bhitarkanika Sanctuary">Bhitarkanika Sanctuary</option>
                    <option value="Pichavaram Estuary">Pichavaram Estuary</option>
                    <option value="Andaman Archipelago">Andaman Archipelago</option>
                    <option value="Gulf of Kutch Marine Park">Gulf of Kutch</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Plot Type</label>
                  <select
                    value={newTree.plot_type}
                    onChange={(e) => setNewTree({ ...newTree, plot_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-navy-800 border border-slate-300 dark:border-slate-700 focus:outline-none"
                  >
                    <option value="Riverine">Riverine</option>
                    <option value="Fringe">Fringe</option>
                    <option value="Basin">Basin</option>
                    <option value="Overwash">Overwash</option>
                    <option value="Scrub">Scrub</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-forest-700 to-ocean-600 text-white font-semibold"
                >
                  Save Measurement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
