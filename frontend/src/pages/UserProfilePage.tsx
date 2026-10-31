import React from 'react';
import { UserCheck, Shield, Building, Mail, Key, Clock, Award, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const UserProfilePage: React.FC = () => {
  const { user, token } = useAuth();

  const getRolePrivileges = (role?: string) => {
    switch (role) {
      case 'Admin':
        return [
          'Full administrative system privileges and database initialization',
          'Deploy and manage Solidity smart contracts on local Ganache / Ethereum network',
          'Manage all system users and authorized verification officers',
          'Execute sample dataset resetting and master configuration updates'
        ];
      case 'Verification Officer':
        return [
          'Independent review of Tier-1 and Tier-2 prioritized mangrove plots',
          'Issue binding verification decisions: Approve, Reject, or Request Additional Field Measurements',
          'Cryptographically sign audit records directly to the blockchain distributed ledger',
          'Export formal verification certificates and ReportLab audit summaries'
        ];
      case 'Researcher':
      default:
        return [
          'Upload mangrove field dendrometry CSV datasets',
          'Manual registration of individual tree measurements and species parameters',
          'Run Chave et al. (2014) pantropical allometric aboveground biomass (AGB) calculations',
          'Execute 2,000-repetition bootstrap resampling and wood-density sensitivity analyses'
        ];
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Profile Header Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-5">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-forest-700 via-ocean-600 to-teal-400 text-white flex items-center justify-center font-bold text-3xl shadow-lg shadow-ocean-950/40">
          {user?.name.charAt(0) || 'U'}
        </div>
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user?.name}</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-block ${
              user?.role === 'Admin'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : user?.role === 'Verification Officer'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {user?.role}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-center sm:justify-start space-x-1.5">
            <Mail className="w-3.5 h-3.5" />
            <span>{user?.email}</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center justify-center sm:justify-start space-x-1.5">
            <Building className="w-3.5 h-3.5" />
            <span>{user?.organization || 'Global Blue Carbon Consortium'}</span>
          </p>
        </div>
      </div>

      {/* Role Capabilities & Authorizations */}
      <div className="p-6 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-forest-500/10 text-forest-500">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Role Privileges & Authorizations</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Permissions granted based on assigned system role</p>
          </div>
        </div>

        <div className="space-y-2.5 pt-2">
          {getRolePrivileges(user?.role).map((priv, idx) => (
            <div key={idx} className="flex items-start space-x-2.5 text-xs text-slate-600 dark:text-slate-300">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <span>{priv}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Security Token Details */}
      <div className="p-6 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-ocean-500/10 text-ocean-500">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Session Token</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">JSON Web Token (HS256) currently authenticated</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-950 font-mono text-[11px] text-slate-400 break-all border border-slate-200 dark:border-slate-800">
          {token || 'No active JWT token found'}
        </div>
      </div>
    </div>
  );
};
