import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { NeepcoLogo } from './NeepcoLogo';
import {
  Lock,
  Unlock,
  ShieldAlert,
  LogOut,
  Building2,
  KeyRound,
  Eye,
  EyeOff,
  UserCheck,
} from 'lucide-react';

interface WorkstationLockModalProps {
  isLocked: boolean;
  onUnlock: () => void;
}

export const WorkstationLockModal: React.FC<WorkstationLockModalProps> = ({
  isLocked,
  onUnlock,
}) => {
  const { user, login, logout, clinicSettings } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isLocked || !user) return null;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter your password to unlock the terminal.');
      return;
    }

    try {
      setIsUnlocking(true);
      setError(null);
      // Re-authenticate with current username and entered password
      await login(user.username, password);
      setPassword('');
      onUnlock();
    } catch (err: any) {
      setError(err.message || 'Incorrect password. Access denied.');
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <div
      id="workstation-lock-screen"
      className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 select-none animate-in fade-in duration-300"
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 text-white relative overflow-hidden">
        {/* Decorative Top Ambient Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />

        {/* Clinic Identity & Lock Status */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-1.5 rounded-2xl bg-white shadow-xl mb-3 border border-white/80">
            <NeepcoLogo className="w-20 h-10" />
          </div>
          <div className="inline-block mb-1">
            <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 bg-sky-600/30 text-sky-200 border border-sky-500/40 rounded-full">
              NTPC • NEEPCO Terminal
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2 mt-1">
            <Lock className="w-5 h-5 text-amber-400" />
            Workstation Locked
          </h2>
          <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1.5 font-medium">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            {clinicSettings?.clinicName || 'NEEPCO Hospital & Clinical Pharmacy'}
          </p>
        </div>

        {/* Active Clinician Profile Card */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 mb-6 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold text-base shrink-0 shadow-md">
            {user.fullName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate flex items-center gap-2">
              <span>{user.fullName}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {user.role}
              </span>
            </div>
            <div className="text-xs text-slate-400 truncate mt-0.5">
              @{user.username} • {user.email || 'Clinician Terminal'}
            </div>
          </div>
        </div>

        {/* Unlock Form */}
        <form onSubmit={handleUnlock} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Enter Password to Resume
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Account password..."
                autoFocus
                disabled={isUnlocking}
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-start gap-2 animate-in fade-in">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isUnlocking}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-4 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 cursor-pointer disabled:opacity-50"
          >
            <Unlock className={`w-4 h-4 ${isUnlocking ? 'animate-spin' : ''}`} />
            {isUnlocking ? 'Verifying Credentials...' : 'Unlock Terminal'}
          </button>
        </form>

        {/* Secondary Actions & Healthcare Compliance Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="font-mono text-[11px] text-slate-500">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>

          <button
            onClick={logout}
            className="text-slate-400 hover:text-rose-400 flex items-center gap-1 font-medium transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Switch Account / Sign Out</span>
          </button>
        </div>

        <div className="mt-3 text-[10px] text-slate-500 text-center flex items-center justify-center gap-1">
          <UserCheck className="w-3 h-3 text-emerald-500" />
          <span>Patient data shielded in compliance with Clinical Data Protection standards.</span>
        </div>
      </div>
    </div>
  );
};
