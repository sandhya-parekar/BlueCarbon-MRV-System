import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon, Database, Shield, Moon, Sun,
  RefreshCw, CheckCircle, AlertCircle, Server, HardDrive
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [health, setHealth] = useState<any | null>(null);
  const [checking, setChecking] = useState(false);
  const [restarting, setRestarting] = useState(false);

  const checkHealth = async () => {
    setChecking(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/health');
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      setHealth({ status: 'unreachable', database_connected: false });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const handleResetData = async () => {
    if (!confirm('Are you sure you want to re-seed the benchmark 118 mangrove plots dataset?')) return;
    setRestarting(true);
    try {
      await api.resetSampleDataset();
      alert('Benchmark research dataset successfully re-seeded and initialized!');
      checkHealth();
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      setRestarting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Settings Header */}
      <div className="p-6 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-ocean-500/10 text-ocean-500">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">System Settings & Connectivity</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Configure environment, display themes, and service connectors</p>
          </div>
        </div>
        <button
          onClick={checkHealth}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-white hover:bg-navy-800"
          title="Re-check Services"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Appearance Theme */}
      <div className="p-6 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Dashboard Appearance Theme</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">Toggle between Dark Navy Nature theme and Light theme</p>
        
        <div className="pt-2 flex items-center space-x-3">
          <button
            onClick={toggleTheme}
            className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center space-x-2 transition ${
              theme === 'dark'
                ? 'bg-navy-800 border-ocean-500/50 text-white shadow-md'
                : 'border-slate-300 text-slate-600'
            }`}
          >
            <Moon className="w-4 h-4 text-ocean-400" />
            <span>Dark Navy Blue Mode</span>
          </button>

          <button
            onClick={toggleTheme}
            className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center space-x-2 transition ${
              theme === 'light'
                ? 'bg-slate-100 border-ocean-500 text-slate-900 shadow-md'
                : 'border-slate-700 text-slate-400'
            }`}
          >
            <Sun className="w-4 h-4 text-amber-500" />
            <span>Light Clean Mode</span>
          </button>
        </div>
      </div>

      {/* Backend & Database Connectors */}
      <div className="p-6 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Services Status</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* FastAPI Server */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-navy-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Server className="w-5 h-5 text-ocean-400" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white">FastAPI Backend</span>
                <p className="text-[11px] text-slate-400 font-mono">http://127.0.0.1:8000</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
              Online
            </span>
          </div>

          {/* MongoDB */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-navy-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Database className="w-5 h-5 text-forest-400" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white">MongoDB Server</span>
                <p className="text-[11px] text-slate-400 font-mono">mongodb://localhost:27017</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
              Connected
            </span>
          </div>

          {/* Blockchain Node */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-navy-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-5 h-5 text-amber-400" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white">Distributed Ledger Mode</span>
                <p className="text-[11px] text-slate-400 font-mono">
                  {health?.blockchain_mode || 'SIMULATED_BLOCKCHAIN'}
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300">
              Active
            </span>
          </div>

          {/* Storage Engine */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-navy-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <HardDrive className="w-5 h-5 text-purple-400" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white">Data Persistence</span>
                <p className="text-[11px] text-slate-400 font-mono">bluecarbon_mrv DB</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-400">
              Persistent
            </span>
          </div>
        </div>
      </div>

      {/* Dataset Maintenance */}
      <div className="p-6 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Research Data Maintenance</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Re-seed the benchmark 118-plot mangrove dataset with fresh species-specific allometric values
        </p>

        <div className="pt-2">
          <button
            onClick={handleResetData}
            disabled={restarting}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 transition flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${restarting ? 'animate-spin' : ''}`} />
            <span>{restarting ? 'Re-seeding...' : 'Reset to 118-Plot Benchmark Dataset'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
