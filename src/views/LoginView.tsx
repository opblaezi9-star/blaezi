import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { NeepcoLogo } from '../components/NeepcoLogo';
import {
  Lock,
  User as UserIcon,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, clinicSettings, sessionNotice, clearSessionNotice } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const clinicName = clinicSettings?.clinicName || 'NEEPCO Hospital & Clinical Pharmacy';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      await login(username, password);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Side: Hospital Branding & Role Information */}
        <div className="lg:col-span-6 text-white space-y-6">
          <div className="flex items-center gap-3.5">
            <div className="p-1 rounded-2xl bg-white shadow-xl shrink-0 border border-white/80">
              <NeepcoLogo className="w-20 h-11" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 bg-red-600/30 text-red-300 border border-red-500/40 rounded-full">
                  NTPC • NEEPCO
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Govt. of India Enterprise</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white mt-1">
                {clinicName}
              </h1>
              <p className="text-xs text-sky-400 font-medium">Occupational Health & Pharmacy Operations</p>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-100">Secure Staff Access Portal</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Clinical pharmacy system with automated First-Expired-First-Out (FEFO) dispensing, batch lot tracking, medicine procurement receiving, and role-based staff authentication.
            </p>
          </div>

          {/* Security & Compliance Badges */}
          <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 space-y-3.5 shadow-md">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Hospital Security & Data Privacy Policy</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This terminal is restricted to authorized hospital personnel. All access events, dispensing, diagnostic logs, and patient interactions are cryptographically recorded in the immutable audit log.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                <span>Bcrypt 12-Round Password Hashing</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0"></span>
                <span>Role-Based Access Control (RBAC)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0"></span>
                <span>Automatic Terminal Lockout Shield</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                <span>Patient PHI Masking & Privacy</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form Card */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-200">
          {/* Card Header with NTPC NEEPCO Emblem */}
          <div className="mb-6 flex items-center gap-4 pb-5 border-b border-slate-100">
            <div className="p-1 rounded-xl bg-white border border-slate-200 shadow-xs shrink-0">
              <NeepcoLogo className="w-18 h-10" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-bold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  NTPC • NEEPCO Health
                </span>
                <span className="text-[10px] text-slate-500 font-semibold">Staff Terminal</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Staff Sign In</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter your authorized clinical username and password.
              </p>
            </div>
          </div>

          {sessionNotice && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{sessionNotice}</span>
              </div>
              <button
                type="button"
                onClick={clearSessionNotice}
                className="text-amber-600 hover:text-amber-800 text-xs font-bold shrink-0"
              >
                ✕
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Username or Staff ID
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. admin, pharmacist, laboratorian, doctor"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:bg-white focus:border-red-500 focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:bg-white focus:border-red-500 focus:outline-none transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-md text-sm transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-4 h-4 text-red-400" />
                  Sign In Securely
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Encrypted Session (256-bit)
            </span>
            <span>Healthcare Compliance</span>
          </div>
        </div>
      </div>
    </div>
  );
};
