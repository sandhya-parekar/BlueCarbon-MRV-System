import React, { useState } from 'react';
import {
  Waves, Shield, KeyRound, User, Mail, Building, ArrowRight,
  CheckCircle2, AlertCircle, Phone, Globe, MapPin, Users,
  Sprout, Sparkles, Check, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { User as UserType } from '../types';

interface LoginPageProps {
  onSuccess: (loggedInUser: UserType) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { login, registerCommunity } = useAuth();

  // Portal mode: 'community' (Community User / Planter) vs 'staff' (MRV Staff / Admin / Science)
  const [activePortal, setActivePortal] = useState<'community' | 'staff'>('community');

  // Sub-mode for community portal: Sign In vs Create Account
  const [isRegister, setIsRegister] = useState(false);

  // Common credentials (strictly initialized empty so NO Admin credentials ever auto-populate)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Community registration fields (Requirement 4)
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [country, setCountry] = useState('India');
  const [state, setState] = useState('Gujarat');
  const [district, setDistrict] = useState('Kachchh');
  const [userType, setUserType] = useState('Farmer');
  const [organization, setOrganization] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Switch between Community and Staff portals with a clean slate
  const handleSwitchPortal = (target: 'community' | 'staff') => {
    setActivePortal(target);
    setIsRegister(false);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation for community registration
    if (activePortal === 'community' && isRegister) {
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please re-enter your password identically in both fields.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (!name.trim()) {
        setError('Full name is required.');
        return;
      }
      if (!email.trim()) {
        setError('Email address is required.');
        return;
      }
      if (!state.trim()) {
        setError('State / Region is required.');
        return;
      }
    }

    setSubmitting(true);
    try {
      let loggedInUser: UserType;
      if (activePortal === 'community' && isRegister) {
        // Register new Community User with role community_user
        loggedInUser = await registerCommunity({
          name: name.trim(),
          email: email.trim(),
          password,
          confirm_password: confirmPassword,
          mobile_number: mobileNumber.trim(),
          country: country.trim() || 'India',
          state: state.trim(),
          district: district.trim(),
          user_type: userType,
          organization: organization.trim() || 'Community Restoration Group',
        });
      } else {
        // Normal login
        loggedInUser = await login(email.trim(), password);
      }
      onSuccess(loggedInUser);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
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
      const loggedInUser = await login(demoEmail, demoPass);
      onSuccess(loggedInUser);
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-navy-950 via-navy-900 to-forest-950 text-slate-100">
      <div className="w-full max-w-5xl grid md:grid-cols-5 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-navy-900/95 backdrop-blur-xl my-6">
        
        {/* Left Informational Research Banner */}
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
                <p className="text-xs text-ocean-300 font-medium">Community & Science Portal</p>
              </div>
            </div>

            <div className="space-y-3.5 my-6">
              <div className="p-3.5 rounded-xl bg-navy-800/60 border border-slate-700/40">
                <h4 className="text-xs font-semibold text-teal-300 mb-1 flex items-center space-x-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>Community Planter Portal</span>
                </h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Dedicated self-service hub for farmers, students, NGOs, and volunteers to design restoration sites, record survival, and consult scientists.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-navy-800/60 border border-slate-700/40">
                <h4 className="text-xs font-semibold text-ocean-300 mb-1 flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Uncertainty-Aware MRV</span>
                </h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Chave et al. (2014) pantropical allometry with 2,000 bootstrap iterations and wood density sensitivity analysis.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-navy-800/60 border border-slate-700/40">
                <h4 className="text-xs font-semibold text-forest-300 mb-1 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Multi-Indicator Prioritization</span>
                </h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Prioritizes field verification visits on high-biomass, high-uncertainty plots to minimize carbon liability.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-navy-800/60 border border-slate-700/40">
                <h4 className="text-xs font-semibold text-purple-300 mb-1 flex items-center space-x-1.5">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Tamper-Evident Ledger</span>
                </h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Ethereum smart contract & cryptographic SHA-256 state hashing for audit trail verification.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400">
            MCA Semester III Project Demonstration • 4 Roles Supported
          </div>
        </div>

        {/* Right Authentication Card */}
        <div className="md:col-span-3 p-8 flex flex-col justify-center max-h-[92vh] overflow-y-auto">
          
          {/* Top Level Portal Selector Tabs: Community vs Staff */}
          <div className="mb-6 p-1.5 rounded-2xl bg-navy-950/80 border border-slate-800 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => handleSwitchPortal('community')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
                activePortal === 'community'
                  ? 'bg-gradient-to-r from-forest-600 to-teal-600 text-white shadow-md shadow-forest-900/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800/50'
              }`}
            >
              <Sprout className="w-4 h-4 text-emerald-300" />
              <span>Community User / Planter</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchPortal('staff')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
                activePortal === 'staff'
                  ? 'bg-gradient-to-r from-ocean-700 to-navy-700 text-white shadow-md shadow-ocean-900/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800/50'
              }`}
            >
              <Shield className="w-4 h-4 text-ocean-300" />
              <span>MRV Staff & Science</span>
            </button>
          </div>

          {/* Form Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {activePortal === 'community'
                  ? (isRegister ? 'Register as Community Planter' : 'Community Planter Sign In')
                  : 'Staff & Science Sign In'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {activePortal === 'community'
                  ? (isRegister
                      ? 'Create your free planter account to track trees & consult experts'
                      : 'Sign in to access your planting projects & communication centre')
                  : 'Restricted to authorized Administrators, Researchers & Verifiers'}
              </p>
            </div>

            {/* Toggle between Sign In and Register for Community Portal */}
            {activePortal === 'community' && (
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError(null);
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                }}
                className="text-xs text-teal-400 hover:text-teal-300 font-semibold underline underline-offset-4 shrink-0 ml-2"
              >
                {isRegister ? 'Already registered? Sign In' : 'New Planter? Sign Up'}
              </button>
            )}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Authentication Form */}
          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-3.5">
            
            {/* COMMUNITY USER REGISTRATION FORM (Requirement 4) */}
            {activePortal === 'community' && isRegister && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Full Name *</label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Ramesh Patel"
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-navy-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Mobile Number</label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-navy-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">User Type *</label>
                    <select
                      value={userType}
                      onChange={(e) => setUserType(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-navy-800/80 border border-slate-700 text-white focus:outline-none focus:border-teal-500 transition"
                    >
                      <option value="Farmer">Farmer</option>
                      <option value="Individual">Individual</option>
                      <option value="Student">Student</option>
                      <option value="NGO">NGO</option>
                      <option value="Volunteer">Volunteer</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Assigned Role</label>
                    <input
                      type="text"
                      disabled
                      value="community_user"
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-navy-950 border border-slate-700 text-teal-400 font-mono font-medium cursor-not-allowed"
                      title="Public registration is strictly restricted to community_user role."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Country</label>
                    <div className="relative">
                      <Globe className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full pl-7 pr-2 py-1.5 text-xs rounded-xl bg-navy-800/80 border border-slate-700 text-white focus:outline-none focus:border-teal-500 transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">State / Region *</label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="e.g. Gujarat, West Bengal"
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-navy-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">District</label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        placeholder="e.g. Kachchh, Sundarbans"
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-navy-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Organization / Group Name (Optional)</label>
                  <div className="relative">
                    <Building className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="e.g. Coastal Mangrove Farmers Union"
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-navy-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Email Field (Clean state, no default admin email) */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={activePortal === 'community' ? 'planter@community.org' : 'staff@bluecarbon.org'}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-navy-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
                />
              </div>
            </div>

            {/* Password & Confirm Password */}
            <div className={activePortal === 'community' && isRegister ? "grid grid-cols-2 gap-3" : ""}>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Password *</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-navy-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
                  />
                </div>
              </div>

              {activePortal === 'community' && isRegister && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Confirm Password *</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-navy-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-white transition shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 mt-2 ${
                activePortal === 'community'
                  ? 'bg-gradient-to-r from-forest-700 via-teal-600 to-emerald-500 hover:from-forest-800 hover:to-emerald-600 shadow-teal-900/30'
                  : 'bg-gradient-to-r from-ocean-700 via-navy-700 to-purple-600 hover:from-ocean-800 hover:to-purple-700 shadow-ocean-900/30'
              }`}
            >
              <span>
                {submitting
                  ? 'Authenticating...'
                  : activePortal === 'community'
                  ? (isRegister ? 'Register as Community Planter' : 'Sign In as Community Planter')
                  : 'Sign In to MRV Staff Portal'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Access - Strictly separated by portal */}
          <div className="mt-5 pt-4 border-t border-slate-800/80">
            {activePortal === 'community' ? (
              <div>
                <p className="text-[11px] font-semibold text-teal-400 mb-2 flex items-center space-x-1.5">
                  <Sprout className="w-3.5 h-3.5" />
                  <span>Instant Community Planter Demo Access:</span>
                </p>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('community@bluecarbon.org', 'Community@123')}
                  className="w-full p-2.5 rounded-xl bg-teal-950/40 hover:bg-teal-900/40 border border-teal-500/40 text-left transition text-xs flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-teal-300 group-hover:text-teal-200">
                      Ramesh Patel (Coastal Mangrove Farmer)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      community@bluecarbon.org • Role: community_user
                    </div>
                  </div>
                  <div className="px-2 py-1 rounded-lg bg-teal-500/20 text-teal-300 text-[10px] font-semibold flex items-center space-x-1">
                    <span>1-Click Sign In</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </button>
              </div>
            ) : (
              <div>
                <p className="text-[11px] font-semibold text-ocean-400 mb-2 flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Instant Staff Demo Access (3 Roles):</span>
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('researcher@bluecarbon.org', 'Research@123')}
                    className="p-2 rounded-xl bg-navy-800/70 hover:bg-navy-800 border border-emerald-500/40 text-left transition text-[11px] group"
                  >
                    <div className="font-bold text-emerald-300 group-hover:text-emerald-200">Researcher</div>
                    <div className="text-[10px] text-slate-400 truncate">Prof. Mukherjee</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('officer@bluecarbon.org', 'Officer@123')}
                    className="p-2 rounded-xl bg-navy-800/70 hover:bg-navy-800 border border-amber-500/40 text-left transition text-[11px] group"
                  >
                    <div className="font-bold text-amber-300 group-hover:text-amber-200">Verifier</div>
                    <div className="text-[10px] text-slate-400 truncate">Elena Rostova</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('admin@bluecarbon.org', 'Admin@123')}
                    className="p-2 rounded-xl bg-navy-800/70 hover:bg-navy-800 border border-purple-500/40 text-left transition text-[11px] group"
                  >
                    <div className="font-bold text-purple-300 group-hover:text-purple-200">Admin</div>
                    <div className="text-[10px] text-slate-400 truncate">Dr. Jenkins</div>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
