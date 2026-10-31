import React, { useState } from 'react';
import { Waves, Shield, KeyRound, User, Mail, Building, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  onSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Researcher');
  const [organization, setOrganization] = useState('Blue Carbon Research Institute');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isRegister) {
        await register(name, email, password, role, organization);
      } else {
        await login(email, password);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    setSubmitting(true);
    try {
      await login(demoEmail, demoPass);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-navy-950 via-navy-900 to-forest-950 text-slate-100">
      <div className="w-full max-w-4xl grid md:grid-cols-5 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-navy-900/90 backdrop-blur-xl">
        
        {/* Left Research Banner */}
        <div className="md:col-span-2 p-8 bg-gradient-to-b from-forest-900/90 via-navy-900 to-ocean-950/90 border-r border-slate-800 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full bg-ocean-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-56 h-56 rounded-full bg-forest-500/10 blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-forest-600 to-ocean-500 flex items-center justify-center shadow-lg shadow-forest-900/50">
                <Waves className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">BlueCarbon MRV</h1>
                <p className="text-xs text-ocean-300 font-medium">Research Portal v1.0</p>
              </div>
            </div>

            <div className="space-y-4 my-8">
              <div className="p-3.5 rounded-xl bg-navy-800/60 border border-slate-700/40">
                <h4 className="text-xs font-semibold text-ocean-300 mb-1 flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Uncertainty-Aware MRV</span>
                </h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Pantropical allometric estimation using Chave et al. (2014) combined with 2,000 bootstrap iterations.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-navy-800/60 border border-slate-700/40">
                <h4 className="text-xs font-semibold text-forest-300 mb-1 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verification Prioritization</span>
                </h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Composite tri-indicator scoring: Uncertainty + Data Quality + Biomass Impact.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-navy-800/60 border border-slate-700/40">
                <h4 className="text-xs font-semibold text-teal-300 mb-1 flex items-center space-x-1.5">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Blockchain Tamper-Evidence</span>
                </h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Solidity smart contract audit records anchoring cryptographic hashes to Ethereum / Ganache.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400">
            MCA Semester III Project Demonstration
          </div>
        </div>

        {/* Right Form Card */}
        <div className="md:col-span-3 p-8 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {isRegister ? 'Create Account' : 'System Sign In'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {isRegister ? 'Register your role in the Blue Carbon MRV network' : 'Enter authorized credentials to access MRV workflows'}
              </p>
            </div>
            <button
              onClick={() => { setIsRegister(!isRegister); setError(null); }}
              className="text-xs text-ocean-400 hover:text-ocean-300 font-semibold underline underline-offset-4"
            >
              {isRegister ? 'Already registered? Login' : 'New user? Register'}
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Dr. Mangrove Researcher"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-navy-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-ocean-500 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">System Role</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-navy-800/80 border border-slate-700 text-white focus:outline-none focus:border-ocean-500 transition"
                    >
                      <option value="Researcher">Researcher</option>
                      <option value="Verification Officer">Verification Officer</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Organization</label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        placeholder="Institute"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-navy-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-ocean-500 transition"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@bluecarbon.org"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-navy-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-ocean-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-navy-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-ocean-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-forest-700 via-ocean-600 to-teal-500 hover:from-forest-800 hover:to-teal-600 focus:outline-none transition shadow-lg shadow-ocean-900/30 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{submitting ? 'Authenticating...' : (isRegister ? 'Register Account' : 'Sign In to MRV Portal')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Sign In Helper */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <p className="text-[11px] font-semibold text-slate-400 mb-2.5">
              Instant Demo Access (Click to Login):
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin@bluecarbon.org', 'Admin@123')}
                className="p-2 rounded-lg bg-navy-800/70 hover:bg-navy-800 border border-purple-500/30 text-left transition text-[11px]"
              >
                <div className="font-bold text-purple-300">Admin</div>
                <div className="text-[10px] text-slate-400 truncate">Dr. Jenkins</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('researcher@bluecarbon.org', 'Research@123')}
                className="p-2 rounded-lg bg-navy-800/70 hover:bg-navy-800 border border-emerald-500/30 text-left transition text-[11px]"
              >
                <div className="font-bold text-emerald-300">Researcher</div>
                <div className="text-[10px] text-slate-400 truncate">Prof. Mukherjee</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('officer@bluecarbon.org', 'Officer@123')}
                className="p-2 rounded-lg bg-navy-800/70 hover:bg-navy-800 border border-amber-500/30 text-left transition text-[11px]"
              >
                <div className="font-bold text-amber-300">Verifier</div>
                <div className="text-[10px] text-slate-400 truncate">Elena Rostova</div>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
