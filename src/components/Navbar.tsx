import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Bell,
  Search,
  LogOut,
  ShieldCheck,
  Plus,
  Lock,
  Eye,
  EyeOff,
  Mail,
} from 'lucide-react';

interface NavbarProps {
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onOpenSecurity?: () => void;
  unreadCount?: number;
  onNavigate?: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSearch,
  onOpenNotifications,
  onOpenSecurity,
  unreadCount = 0,
  onNavigate,
}) => {
  const { user, logout, lockWorkstation, privacyMode, togglePrivacyMode } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 lg:px-8 shrink-0 sticky top-0 z-30">
      {/* Search Bar Input */}
      <div className="flex items-center gap-4 w-72 sm:w-80 lg:w-96">
        <div className="relative w-full cursor-pointer" onClick={onOpenSearch}>
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            readOnly
            onClick={onOpenSearch}
            className="block w-full pl-10 pr-12 py-2 border border-slate-200 rounded-md bg-slate-50 text-sm focus:outline-none focus:border-sky-500 focus:bg-white cursor-pointer placeholder:text-slate-400"
            placeholder="Search medicine, batch or PO..."
          />
          <kbd className="hidden sm:inline-flex absolute right-2.5 top-2.5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-white border border-slate-300 rounded shadow-2xs">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
        {/* Patient Data Privacy Shield Toggle */}
        <button
          onClick={togglePrivacyMode}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all ${
            privacyMode
              ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-xs'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
          title={privacyMode ? 'Patient Privacy Shield ACTIVE (PHI Masked)' : 'Enable Patient PHI Privacy Shield'}
        >
          {privacyMode ? (
            <EyeOff className="w-3.5 h-3.5 text-amber-600" />
          ) : (
            <Eye className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span className="hidden lg:inline">{privacyMode ? 'PHI Masked' : 'Privacy Shield'}</span>
        </button>

        {/* Instant Lock Workstation Button (Ctrl+L / Cmd+L) */}
        <button
          onClick={lockWorkstation}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-amber-800 hover:bg-amber-50 rounded-lg border border-slate-200 transition-colors"
          title="Lock Workstation Terminal (⌘L / Ctrl+L)"
        >
          <Lock className="w-3.5 h-3.5 text-amber-600" />
          <span className="hidden md:inline">Lock Screen</span>
        </button>

        {/* Security & Password Settings */}
        {onOpenSecurity && (
          <button
            onClick={onOpenSecurity}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-slate-200 transition-colors"
            title="Clinic Security & Password Settings"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="hidden md:inline">Security</span>
          </button>
        )}

        {/* Direct Email Alerts & SMTP Settings Shortcut */}
        {onNavigate && (
          <button
            onClick={() => onNavigate('emailLogs')}
            id="nav-email-alerts-btn"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
            title="Email Alerts & Real SMTP Settings"
          >
            <Mail className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden xl:inline">Email & SMTP</span>
          </button>
        )}

        {/* Notifications Icon Button */}
        <div className="relative flex items-center">
          <button
            onClick={onOpenNotifications}
            className="w-9 h-9 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-full cursor-pointer transition-colors relative"
            title="Hospital Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
            )}
          </button>
        </div>

        {/* Subtle Divider */}
        <div className="h-6 w-[1px] bg-slate-200"></div>

        {/* Quick Action Button */}
        {onNavigate && (
          <div>
            {user?.role === 'Doctor' ? (
              <button
                onClick={() => onNavigate('patients')}
                className="bg-slate-900 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> New Rx
              </button>
            ) : (
              <button
                onClick={() => onNavigate('purchases')}
                className="bg-slate-900 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> New Order
              </button>
            )}
          </div>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          title="Sign out of clinic session"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
