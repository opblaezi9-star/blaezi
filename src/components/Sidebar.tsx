import React from 'react';
import { useAuth } from '../context/AuthContext';
import { NeepcoLogo } from './NeepcoLogo';
import {
  LayoutDashboard,
  Pill,
  FolderTree,
  Boxes,
  Layers,
  ShoppingCart,
  Syringe,
  Banknote,
  RotateCcw,
  Truck,
  Users2,
  FileBarChart2,
  FileSpreadsheet,
  ShieldCheck,
  Mail,
  Lock,
  RotateCw,
  Trash2,
  Sparkles,
  LogOut,
  FlaskConical,
} from 'lucide-react';

export type TabType =
  | 'dashboard'
  | 'medicines'
  | 'reagents'
  | 'categories'
  | 'batches'
  | 'inventory'
  | 'purchases'
  | 'dispensing'
  | 'returns'
  | 'suppliers'
  | 'patients'
  | 'reports'
  | 'audit'
  | 'users'
  | 'emailLogs'
  | 'email-logs'
  | 'security';

interface SidebarProps {
  currentTab?: TabType | string;
  currentView?: string;
  onSelectTab?: (tab: TabType) => void;
  onSelectView?: (tab: string) => void;
  onOpenSecurity?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  currentView,
  onSelectTab,
  onSelectView,
  onOpenSecurity,
}) => {
  const { user, canAccess, resetDatabase, clearDatabase, logout, clinicSettings } = useAuth();
  const activeTab = (currentTab || currentView || 'dashboard') as TabType;
  const isClinicMode = clinicSettings?.clinicSecurityMode;
  const [modalAction, setModalAction] = React.useState<'wipe' | 'restore' | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleExecuteModalAction = async () => {
    try {
      setIsProcessing(true);
      if (modalAction === 'wipe') {
        await clearDatabase();
        window.location.reload();
      } else if (modalAction === 'restore') {
        await resetDatabase();
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
      setModalAction(null);
    }
  };

  const handleSelect = (tab: TabType) => {

    if (tab === 'security') {
      if (onOpenSecurity) onOpenSecurity();
      return;
    }
    if (onSelectTab) onSelectTab(tab);
    if (onSelectView) onSelectView(tab === 'emailLogs' ? 'email-logs' : tab);
  };

  const navItems: Array<{
    id: TabType;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: string;
    section?: string;
  }> = [
    // Main Overview
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Overview' },

    // Core Pharmacy Catalog & Stock
    { id: 'medicines', label: 'Medicines', icon: Pill, section: 'Inventory' },
    { id: 'reagents', label: 'Reagents & Lab Kits', icon: FlaskConical, section: 'Inventory' },
    { id: 'inventory', label: 'Inventory & Stock', icon: Layers, section: 'Inventory' },
    { id: 'batches', label: 'Batches', icon: Boxes, section: 'Inventory' },
    { id: 'categories', label: 'Categories', icon: FolderTree, section: 'Inventory' },

    // Operations & Clinical
    { id: 'dispensing', label: 'Dispensing (FEFO)', icon: Syringe, section: 'Operations' },
    { id: 'purchases', label: 'Purchases', icon: ShoppingCart, section: 'Operations' },
    { id: 'returns', label: 'Returns', icon: RotateCcw, section: 'Operations' },
    { id: 'suppliers', label: 'Suppliers', icon: Truck, section: 'Operations' },
    { id: 'patients', label: 'Patients & Rx', icon: Users2, section: 'Operations' },

    // Intelligence & Governance
    { id: 'reports', label: 'Reports', icon: FileBarChart2, section: 'Management' },
    { id: 'audit', label: 'Audit Logs', icon: FileSpreadsheet, section: 'Management' },
    { id: 'emailLogs', label: 'Email Alerts & SMTP', icon: Mail, section: 'Management' },
    { id: 'users', label: 'Users & Roles', icon: ShieldCheck, section: 'Management' },
    { id: 'security', label: 'Security & Policy', icon: Lock, section: 'Management' },
  ];

  // Group by sections
  const sections = Array.from(new Set(navItems.map(item => item.section)));

  return (
    <aside className="w-64 bg-slate-900 flex flex-col border-r border-slate-800 shrink-0 select-none min-h-screen">
      {/* Brand Header */}
      <div className="p-4 flex items-center gap-3 border-b border-slate-800/80">
        <div className="p-1 rounded-xl bg-white shadow-xs border border-slate-200/80 shrink-0">
          <NeepcoLogo className="w-13 h-7" />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1">
            <h1 className="text-white font-bold tracking-tight text-sm leading-tight truncate">
              NEEPCO
            </h1>
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 bg-red-600/30 text-red-300 border border-red-500/40 rounded">
              Govt
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium truncate">Health & Pharmacy</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 space-y-4 mt-4 overflow-y-auto custom-scrollbar">
        {sections.map(section => {
          const items = navItems.filter(item => item.section === section);
          return (
            <div key={section} className="space-y-1">
              <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {section}
              </div>
              <div className="space-y-1">
                {items.map(item => {
                  const allowed = canAccess(item.id);
                  const isCurrent =
                    activeTab === item.id ||
                    (item.id === 'emailLogs' && activeTab === 'email-logs');
                  const Icon = item.icon;

                  if (!allowed) return null;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                        isCurrent
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Icon className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-white' : 'text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Profile & Reset Footer */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/30">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-xs shrink-0">
              {user?.fullName?.charAt(0) || 'AD'}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-white truncate">{user?.fullName || 'Admin User'}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">{user?.role || 'Administrator'}</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 rounded-md transition-colors shrink-0"
            title="Log Out / Switch Account"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {isClinicMode ? (
          <div className="pt-1">
            <button
              onClick={() => {
                if (onOpenSecurity) onOpenSecurity();
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 rounded-lg border border-emerald-800/40 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Clinic Mode Active</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              onClick={() => setModalAction('wipe')}
              id="btn-sidebar-wipe-data"
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 rounded-lg border border-rose-800/40 transition-colors cursor-pointer"
              title="Wipe all demo inventory, batches, and transactions"
            >
              <Trash2 className="w-3 h-3 text-rose-400" />
              Wipe Demo Data
            </button>

            <button
              onClick={() => setModalAction('restore')}
              id="btn-sidebar-restore-demo"
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700/60 transition-colors cursor-pointer"
              title="Reload factory sample data"
            >
              <RotateCw className="w-3 h-3 text-slate-400" />
              Restore Demo
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {modalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-800 animate-in fade-in zoom-in-95 text-slate-100 p-6">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
              modalAction === 'wipe' ? 'bg-rose-500/20 text-rose-400' : 'bg-indigo-500/20 text-indigo-400'
            }`}>
              {modalAction === 'wipe' ? <Trash2 className="w-6 h-6" /> : <RotateCw className="w-6 h-6" />}
            </div>

            <h3 className="text-base font-bold text-white mb-1">
              {modalAction === 'wipe' ? 'Wipe Demo Inventory & Records?' : 'Restore Demo Sample Dataset?'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              {modalAction === 'wipe'
                ? 'This will clear all demo medicines, batches, purchase orders, dispensing records, and simulated transactions, leaving an empty clean slate for entering actual clinic data.'
                : 'This will reset the system with default demonstration medications, diagnostic reagent kits, supplier profiles, and sample batches.'}
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setModalAction(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleExecuteModalAction}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold text-white rounded-xl transition-colors shadow-xs ${
                  modalAction === 'wipe'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {isProcessing ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>{modalAction === 'wipe' ? 'Confirm Wipe' : 'Confirm Restore'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

