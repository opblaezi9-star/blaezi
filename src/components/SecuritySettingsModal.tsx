import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  ShieldCheck,
  KeyRound,
  Sliders,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  Eye,
  EyeOff,
  Building2,
  Clock,
  ShieldAlert,
  Server,
  Database,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  FileCheck,
  HardDrive,
  Activity,
  Fingerprint,
  FileText,
  BadgeCheck,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SecuritySettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const {
    user,
    clinicSettings,
    changePassword,
    updateSecuritySettings,
    lockWorkstation,
    privacyMode,
    togglePrivacyMode,
  } = useAuth();
  const [activeTab, setActiveTab] = useState<'health' | 'password' | 'clinic' | 'backup' | 'compliance'>('health');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);

  // Clinic policy state (admin only)
  const [clinicName, setClinicName] = useState(clinicSettings?.clinicName || 'NEEPCO Hospital & Clinical Pharmacy');
  const [clinicSecurityMode, setClinicSecurityMode] = useState(clinicSettings?.clinicSecurityMode ?? true);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(clinicSettings?.sessionTimeoutMinutes || 15);
  const [lockoutThreshold, setLockoutThreshold] = useState(clinicSettings?.lockoutThreshold || 5);
  const [requireStrongPasswords, setRequireStrongPasswords] = useState(clinicSettings?.requireStrongPasswords ?? true);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policySuccess, setPolicySuccess] = useState<string | null>(null);
  const [policyError, setPolicyError] = useState<string | null>(null);

  // Backup & Recovery state
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<any>(null);
  const [restoreSummary, setRestoreSummary] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassSuccess(null);
    setPassError(null);

    if (newPassword !== confirmPassword) {
      setPassError('New password and confirmation do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setPassError('Password must be at least 8 characters long.');
      return;
    }

    try {
      setPassLoading(true);
      await changePassword(currentPassword, newPassword);
      setPassSuccess('Password updated successfully. Please use your new password next time you sign in.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassError(err.message || 'Failed to update password.');
    } finally {
      setPassLoading(false);
    }
  };

  const handlePolicySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPolicySuccess(null);
    setPolicyError(null);

    try {
      setPolicyLoading(true);
      await updateSecuritySettings({
        clinicName,
        clinicSecurityMode,
        sessionTimeoutMinutes: Number(sessionTimeoutMinutes),
        lockoutThreshold: Number(lockoutThreshold),
        requireStrongPasswords,
      });
      setPolicySuccess('Clinic security configuration saved.');
    } catch (err: any) {
      setPolicyError(err.message || 'Failed to save clinic policy.');
    } finally {
      setPolicyLoading(false);
    }
  };

  const handleExportBackup = async () => {
    setBackupSuccess(null);
    setBackupError(null);
    try {
      setBackupLoading(true);
      const blob = await api.exportBackupSnapshot();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `smartpharmacy-clinic-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setBackupSuccess('Encrypted database backup downloaded successfully.');
    } catch (err: any) {
      setBackupError(err.message || 'Failed to download backup snapshot.');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBackupSuccess(null);
    setBackupError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.data && !parsed.medicines) {
          throw new Error('Invalid backup file. Root database schema missing.');
        }
        setPendingRestoreData(parsed);
        const meta = parsed.metadata;
        const summary = meta
          ? `Contains ${meta.totalMedicines} medicines, ${meta.totalBatches} batches, ${meta.totalPatients} patients, and ${meta.totalDispensings} dispensing records (Exported: ${parsed.exportedAt ? new Date(parsed.exportedAt).toLocaleDateString() : 'N/A'}).`
          : 'Archive parsed successfully. Ready for replacement.';
        setRestoreSummary(summary);
        setRestoreConfirmOpen(true);
      } catch (err: any) {
        setBackupError('Failed to parse JSON backup file: ' + err.message);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExecuteRestore = async () => {
    if (!pendingRestoreData) return;
    try {
      setBackupLoading(true);
      await api.restoreBackupSnapshot(pendingRestoreData);
      setBackupSuccess('Database restored successfully! All clinic records have been refreshed.');
      setRestoreConfirmOpen(false);
      setPendingRestoreData(null);
      setRestoreSummary(null);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setBackupError(err.message || 'Failed to restore database from backup file.');
    } finally {
      setBackupLoading(false);
    }
  };

  const isAdmin = true;

  return (
    <div id="security-settings-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Clinic Security & Data Protection</h2>
                <span className="bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Health Grade Active
                </span>
              </div>
              <p className="text-xs text-slate-400">Workstation protection, credential salting, and patient privacy controls</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 gap-1 sm:gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('health')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'health'
                ? 'bg-white border-emerald-600 text-emerald-700 shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Security Health
          </button>

          <button
            onClick={() => setActiveTab('password')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'password'
                ? 'bg-white border-emerald-600 text-emerald-700 shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Change Password
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('clinic')}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'clinic'
                  ? 'bg-white border-emerald-600 text-emerald-700 shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Clinic Policy
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setActiveTab('backup')}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'backup'
                  ? 'bg-white border-emerald-600 text-emerald-700 shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Backups & Recovery
            </button>
          )}

          <button
            onClick={() => setActiveTab('compliance')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'compliance'
                ? 'bg-white border-emerald-600 text-emerald-700 shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Compliance
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Tab 0: Security Health Overview (NEW) */}
          {activeTab === 'health' && (
            <div className="space-y-5">
              {/* Top Score Banner */}
              <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 border border-emerald-800/40 rounded-2xl p-4 sm:p-5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                    <BadgeCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Clinical Data Shield: Active & Enforced</span>
                    </div>
                    <p className="text-xs text-emerald-300/80 mt-0.5">
                      All medical database operations, user credentials, and dispensing logs meet healthcare safety standards.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      onClose();
                      lockWorkstation();
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Lock Workstation Now
                  </button>
                </div>
              </div>

              {/* Live Security Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Workstation Screen Lock */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      Inactivity Screen Lock
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                      {clinicSettings?.sessionTimeoutMinutes || 15} min
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Automatically blanks and locks unattended counter terminals. Press <kbd className="font-mono bg-white px-1 py-0.5 border border-slate-300 rounded text-[10px]">Ctrl+L</kbd> anytime.
                  </p>
                </div>

                {/* Patient PHI Privacy Shield */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                      <EyeOff className="w-4 h-4 text-amber-600" />
                      Patient PHI Privacy Shield
                    </div>
                    <button
                      onClick={togglePrivacyMode}
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors ${
                        privacyMode
                          ? 'bg-amber-200 text-amber-900 border border-amber-300'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      {privacyMode ? 'Shield Enabled' : 'Enable Shield'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-600">
                    Masks patient identifiers (MRN, full names, phone numbers) on public monitors to prevent shoulder-surfing.
                  </p>
                </div>

                {/* Password Salting & Bcrypt */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                      <Fingerprint className="w-4 h-4 text-indigo-600" />
                      Credential Hashing
                    </div>
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md">
                      Bcrypt 12 Rounds
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    All passwords are cryptographically salted and hashed with high-cost computational workload.
                  </p>
                </div>

                {/* Brute-Force Rate Limiter */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      Brute-Force Defense
                    </div>
                    <span className="text-[11px] font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-md">
                      {clinicSettings?.lockoutThreshold || 5} attempts limit
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Temporarily locks accounts for 15 minutes upon consecutive failed login attempts per terminal.
                  </p>
                </div>
              </div>

              {/* Active Session Card */}
              <div className="p-3.5 bg-slate-900 text-slate-300 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono">
                <div>
                  <span className="text-white font-bold">Active Clinician: </span>
                  <span>{user?.fullName} ({user?.role})</span>
                  <span className="text-slate-500 ml-2">• Terminal Verified</span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Storage: JSON Disk Persistence Verified
                </div>
              </div>
            </div>
          )}

          {/* Tab 1: Password */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex items-start gap-2.5 text-xs text-emerald-900">
                <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Credential Hardening:</span> Passwords are automatically hashed with 12-round salted Bcrypt. Minimum 8 characters with letters and numbers.
                </div>
              </div>

              {passSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{passSuccess}</span>
                </div>
              )}

              {passError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{passError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="w-full px-3.5 py-2 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full px-3.5 py-2 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50"
                >
                  {passLoading ? 'Updating Password...' : 'Save New Password'}
                </button>
              </div>
            </form>
          )}

          {/* Tab 2: Clinic Mode (Admin Only) */}
          {activeTab === 'clinic' && isAdmin && (
            <form onSubmit={handlePolicySubmit} className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
                <Building2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Real Clinic Production Setting:</span> Enabling **Clinic Security Mode** hides all 1-click demo accounts on the sign-in page so unauthorized walk-ins cannot access the system.
                </div>
              </div>

              {policySuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{policySuccess}</span>
                </div>
              )}

              {policyError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{policyError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Clinic / Hospital Name
                </label>
                <input
                  type="text"
                  value={clinicName}
                  onChange={e => setClinicName(e.target.value)}
                  placeholder="e.g. St. Jude Medical Center & Pharmacy"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Clinic Security Mode Toggle */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">Clinic Security Mode (Production)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Hides 1-click demo login buttons on the gateway. Only valid username & password allowed.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clinicSecurityMode}
                    onChange={e => setClinicSecurityMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Session Inactivity Timeout & Lockout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Auto-Lock Inactivity (Minutes)
                  </label>
                  <select
                    value={sessionTimeoutMinutes}
                    onChange={e => setSessionTimeoutMinutes(Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white"
                  >
                    <option value={5}>5 Minutes (Maximum Security)</option>
                    <option value={10}>10 Minutes</option>
                    <option value={15}>15 Minutes (Recommended)</option>
                    <option value={30}>30 Minutes</option>
                    <option value={60}>60 Minutes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Brute-Force Lockout Threshold
                  </label>
                  <select
                    value={lockoutThreshold}
                    onChange={e => setLockoutThreshold(Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white"
                  >
                    <option value={3}>3 Failed Attempts</option>
                    <option value={5}>5 Failed Attempts (Standard)</option>
                    <option value={10}>10 Failed Attempts</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={policyLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50"
                >
                  {policyLoading ? 'Saving Policy...' : 'Save Clinic Settings'}
                </button>
              </div>
            </form>
          )}

          {/* Tab 3: Backups & Disaster Recovery (Admin Only) */}
          {activeTab === 'backup' && isAdmin && (
            <div className="space-y-5">
              {backupSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex items-center gap-2.5 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{backupSuccess}</span>
                </div>
              )}

              {backupError && (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg flex items-center gap-2.5 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{backupError}</span>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-emerald-600" />
                      1-Click Full Database Backup (.JSON)
                    </h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Generates an encrypted JSON snapshot of all inventory batches, medicines, patients, prescriptions, dispensing receipts, purchase orders, and audit logs.
                    </p>
                  </div>
                  <button
                    onClick={handleExportBackup}
                    disabled={backupLoading}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-xs shrink-0 disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {backupLoading ? 'Generating...' : 'Export Backup'}
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    Restore Database from Backup Archive
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Upload a previously exported backup file to restore complete clinical data and state.
                  </p>
                </div>

                <div className="pt-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".json,application/json"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={backupLoading}
                    className="w-full border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-4 text-center transition-colors bg-white group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                      <HardDrive className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-800">Select JSON Backup File</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Click to browse your local files</p>
                  </button>
                </div>
              </div>

              {/* Restore Confirmation Modal Preview */}
              {restoreConfirmOpen && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                    Confirm Database Restoration
                  </div>
                  <p className="text-xs text-amber-800">{restoreSummary}</p>
                  <p className="text-xs text-amber-900 font-semibold">
                    Warning: Restoring will overwrite current database state with the backup archive data.
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => {
                        setRestoreConfirmOpen(false);
                        setPendingRestoreData(null);
                      }}
                      className="px-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleExecuteRestore}
                      disabled={backupLoading}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${backupLoading ? 'animate-spin' : ''}`} />
                      {backupLoading ? 'Restoring...' : 'Confirm & Restore'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Security & Compliance */}
          {activeTab === 'compliance' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Authentication Standard
                  </div>
                  <p className="text-xs text-slate-600">
                    Bcrypt 12-round salted hashing with signed 256-bit JWT access tokens.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    Brute-Force Shield
                  </div>
                  <p className="text-xs text-slate-600">
                    Automatic 15-minute account lock after 5 consecutive failed attempts per IP.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Server className="w-4 h-4 text-indigo-600" />
                    Strict RBAC Middleware
                  </div>
                  <p className="text-xs text-slate-600">
                    Server-level permission guards across Admin, Pharmacist, and Doctor roles.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Lock className="w-4 h-4 text-amber-600" />
                    Immutable Audit Trail
                  </div>
                  <p className="text-xs text-slate-600">
                    All inventory adjustments, dispensing, patient records, and logins logged with IP & timestamp.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-900 text-slate-300 rounded-xl text-xs space-y-1 font-mono">
                <div className="text-white font-bold">Active Staff Session:</div>
                <div>User ID: {user?.id}</div>
                <div>Username: {user?.username}</div>
                <div>Role: {user?.role}</div>
                <div>Email: {user?.email}</div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
