import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ShiftHandover, CashMovement, CashDenomination, User } from '../types';
import { NeepcoLogo } from '../components/NeepcoLogo';
import {
  Banknote,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Printer,
  Plus,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  Building2,
  Calendar,
  UserCheck,
  Layers,
  Receipt,
  FileSpreadsheet,
  Lock,
  Coins,
  DollarSign,
  TrendingUp,
  X,
  CreditCard,
  Smartphone,
  ShieldAlert,
  ArrowRight,
  FileText,
  Copy,
  Check,
  Calculator,
} from 'lucide-react';

const STANDARD_DENOMINATIONS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

export const ShiftHandoverView: React.FC = () => {
  const { user } = useAuth();

  // State
  const [shifts, setShifts] = useState<ShiftHandover[]>([]);
  const [activeShift, setActiveShift] = useState<ShiftHandover | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'movements'>('current');
  const [staffUsers, setStaffUsers] = useState<User[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [registerFilter, setRegisterFilter] = useState<string>('all');

  // Modals
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isZReportModalOpen, setIsZReportModalOpen] = useState(false);
  const [selectedZReport, setSelectedZReport] = useState<any | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Form State: Start Shift
  const [startForm, setStartForm] = useState({
    registerName: 'Main OPD Pharmacy Counter 1',
    shiftType: 'Morning' as 'Morning' | 'Evening' | 'Night / Emergency' | 'General',
    openingFloat: 2000,
    notes: '',
  });

  // Form State: Cash Movement
  const [movementForm, setMovementForm] = useState({
    type: 'Cash Drop (Safe)' as 'Float In' | 'Cash Drop (Safe)' | 'Petty Expense' | 'Correction',
    amount: 1000,
    reason: '',
  });

  // Form State: Close Shift Reconciliation
  const [denomCounts, setDenomCounts] = useState<Record<number, number>>({
    2000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    5: 0,
    2: 0,
    1: 0,
  });
  const [useDenominationsMode, setUseDenominationsMode] = useState(true);
  const [directCountedAmount, setDirectCountedAmount] = useState<number>(0);
  const [relievingStaffId, setRelievingStaffId] = useState<string>('');
  const [handoverNotes, setHandoverNotes] = useState<string>('');
  const [varianceReason, setVarianceReason] = useState<string>('');

  // Initial Data Fetch
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [shiftsRes, activeRes, usersRes] = await Promise.all([
        api.getShifts().catch(err => {
          console.warn('Could not fetch shift history:', err);
          return { success: true, shifts: [] };
        }),
        api.getActiveShift().catch(err => {
          console.warn('Could not fetch active shift:', err);
          return { success: true, hasActiveShift: false, shift: null };
        }),
        api.getUsers().catch(err => {
          console.warn('Could not fetch users list:', err);
          return { success: true, users: [] };
        }),
      ]);

      if (shiftsRes && shiftsRes.success) {
        setShifts(shiftsRes.shifts || []);
      }
      if (activeRes && activeRes.success) {
        setActiveShift(activeRes.shift || null);
        if (activeRes.shift) {
          setDirectCountedAmount(activeRes.shift.expectedCash || 0);
        }
      }
      if (usersRes && usersRes.success) {
        setStaffUsers(usersRes.users || []);
      }
    } catch (err) {
      console.error('Failed to load shift data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculated counted cash from denominations
  const countedFromDenominations = useMemo(() => {
    return Object.entries(denomCounts).reduce((total, [denom, count]) => {
      return total + Number(denom) * (Number(count) || 0);
    }, 0);
  }, [denomCounts]);

  const effectiveCountedCash = useDenominationsMode
    ? countedFromDenominations
    : directCountedAmount;

  const currentVariance = useMemo(() => {
    if (!activeShift) return 0;
    return Number((effectiveCountedCash - activeShift.expectedCash).toFixed(2));
  }, [effectiveCountedCash, activeShift]);

  // Denominations payload generator
  const getDenominationsPayload = (): CashDenomination[] => {
    return Object.entries(denomCounts)
      .map(([denom, count]) => ({
        denomination: Number(denom),
        count: Number(count) || 0,
        subtotal: Number(denom) * (Number(count) || 0),
      }))
      .filter(d => d.count > 0);
  };

  // Handlers
  const handleStartShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsActionLoading(true);

    try {
      const res = await api.startShift({
        registerName: startForm.registerName,
        shiftType: startForm.shiftType,
        openingFloat: Number(startForm.openingFloat),
        notes: startForm.notes,
      });

      if (res.success) {
        setIsStartModalOpen(false);
        setStartForm({
          registerName: 'Main OPD Pharmacy Counter 1',
          shiftType: 'Morning',
          openingFloat: 2000,
          notes: '',
        });
        await fetchData();
      } else {
        setModalError(res.message || 'Failed to open shift.');
      }
    } catch (err: any) {
      setModalError(err.message || 'Error occurred while starting shift.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;
    setModalError(null);
    setIsActionLoading(true);

    try {
      const res = await api.addCashMovement(activeShift.id, {
        type: movementForm.type,
        amount: Number(movementForm.amount),
        reason: movementForm.reason,
      });

      if (res.success) {
        setIsMovementModalOpen(false);
        setMovementForm({
          type: 'Cash Drop (Safe)',
          amount: 1000,
          reason: '',
        });
        await fetchData();
      } else {
        setModalError(res.message || 'Failed to record cash movement.');
      }
    } catch (err: any) {
      setModalError(err.message || 'Error occurred while recording cash movement.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;
    setModalError(null);

    if (currentVariance !== 0 && !varianceReason.trim()) {
      setModalError('A cash variance was detected. A mandatory reason/explanation note is required for clinical audit compliance.');
      return;
    }

    setIsActionLoading(true);
    try {
      const relievingUser = staffUsers.find(u => u.id === relievingStaffId);
      const res = await api.closeShift(activeShift.id, {
        actualCashCounted: effectiveCountedCash,
        denominations: useDenominationsMode ? getDenominationsPayload() : [],
        relievingStaffId: relievingStaffId || undefined,
        relievingStaffName: relievingUser?.fullName || undefined,
        handoverNotes,
        varianceReason: varianceReason.trim() || (currentVariance === 0 ? 'Exact balanced match' : 'Discrepancy noted'),
      });

      if (res.success) {
        setIsCloseModalOpen(false);
        // Open Z-Report for immediate preview/print
        await openZReport(activeShift.id);
        await fetchData();
      } else {
        setModalError(res.message || 'Failed to close shift.');
      }
    } catch (err: any) {
      setModalError(err.message || 'Error occurred while reconciling shift.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const openZReport = async (shiftId: string) => {
    try {
      const res = await api.getShiftZReport(shiftId);
      if (res.success && res.zReport) {
        setSelectedZReport(res.zReport);
        setIsZReportModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to load Z-Report', err);
    }
  };

  const handleCopyZReportSummary = () => {
    if (!selectedZReport) return;
    const r = selectedZReport;
    const summaryText = `
========================================
NEEPCO OCCUPATIONAL HEALTH CENTRE & PHARMACY
OFFICIAL SHIFT HANDOVER & Z-REPORT
========================================
Shift Number: ${r.shift.shiftNumber}
Register: ${r.shift.registerName} (${r.shift.shiftType} Shift)
Pharmacist: ${r.shift.staffName}
Relieving Staff: ${r.shift.relievingStaffName || 'N/A'}
Period: ${new Date(r.shift.startTime).toLocaleString()} to ${r.shift.endTime ? new Date(r.shift.endTime).toLocaleString() : 'In-Progress'}
Status: ${r.shift.status}

FINANCIAL RECONCILIATION:
- Opening Float: ₹${r.shift.openingFloat.toFixed(2)}
- Cash Collections: ₹${r.shift.totalCashSales.toFixed(2)}
- Digital/Card Sales: ₹${r.shift.totalCardSales.toFixed(2)}
- Corporate Insurance: ₹${r.shift.totalInsuranceSales.toFixed(2)}
- UPI/Mobile Money: ₹${r.shift.totalUPIOrOtherSales.toFixed(2)}
- Cash Adjustments (In/Out): +₹${r.shift.cashIn.toFixed(2)} / -₹${r.shift.cashOut.toFixed(2)}
- Expected Cash in Drawer: ₹${r.shift.expectedCash.toFixed(2)}
- Actual Cash Counted: ₹${(r.shift.actualCashCounted ?? r.shift.expectedCash).toFixed(2)}
- Variance: ₹${(r.shift.variance ?? 0) > 0 ? '+' : ''}${(r.shift.variance ?? 0).toFixed(2)} (${r.shift.varianceReason || 'Balanced'})

VOLUME:
- Dispensing Transactions: ${r.shift.totalTransactions}
- Total Medicine Items: ${r.shift.totalItemsDispensed}

HANDOVER REMARKS:
${r.shift.handoverNotes || 'None'}
========================================
Generated: ${new Date().toLocaleString()}
    `.trim();

    navigator.clipboard.writeText(summaryText);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  // Filtered History
  const filteredShifts = useMemo(() => {
    return shifts.filter(s => {
      const matchesSearch =
        s.shiftNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.registerName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'open' && s.status === 'Open') ||
        (statusFilter === 'closed' && s.status === 'Closed') ||
        (statusFilter === 'balanced' && s.status === 'Closed' && s.variance === 0) ||
        (statusFilter === 'variance' && s.status === 'Closed' && s.variance !== 0);

      const matchesRegister =
        registerFilter === 'all' || s.registerName === registerFilter;

      return matchesSearch && matchesStatus && matchesRegister;
    });
  }, [shifts, searchQuery, statusFilter, registerFilter]);

  // All Cash Movements for all shifts
  const allMovements = useMemo(() => {
    const list: Array<CashMovement & { shiftNumber: string; registerName: string }> = [];
    shifts.forEach(s => {
      (s.movements || []).forEach(m => {
        list.push({
          ...m,
          shiftNumber: s.shiftNumber,
          registerName: s.registerName,
        });
      });
    });
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [shifts]);

  const uniqueRegisters = useMemo(() => {
    return Array.from(new Set(shifts.map(s => s.registerName)));
  }, [shifts]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-sky-50 text-sky-700 border border-sky-200/60">
              <Banknote className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Shift Handover & Cash Drawer Reconciliation
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  NEEPCO Live Clinic Protocol
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Register float balancing, FEFO cash tracking, denomination counting, and official Z-Report certification.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchData}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-colors"
            title="Refresh shift data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {activeShift ? (
            <>
              <button
                onClick={() => {
                  setModalError(null);
                  setIsMovementModalOpen(true);
                }}
                className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Coins className="w-3.5 h-3.5 text-amber-700" />
                Drawer Action (Safe Drop / Float)
              </button>

              <button
                onClick={() => {
                  setModalError(null);
                  setDirectCountedAmount(activeShift.expectedCash || 0);
                  setIsCloseModalOpen(true);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Reconcile & Close Shift (Handover)
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setModalError(null);
                setIsStartModalOpen(true);
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Start New Shift Register
            </button>
          )}
        </div>
      </div>

      {/* Active Shift Banner Card */}
      {activeShift ? (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-xl p-6 border border-slate-700 shadow-md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-700/80">
            <div className="flex items-start gap-4">
              <div className="p-1.5 bg-white border border-slate-200 rounded-xl shrink-0">
                <NeepcoLogo className="w-14 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Active Register Shift
                  </span>
                  <span className="text-slate-400 text-xs font-medium">
                    #{activeShift.shiftNumber}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[11px] font-semibold">
                    {activeShift.shiftType} Shift
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mt-1">
                  {activeShift.registerName}
                </h2>
                <div className="flex items-center gap-4 text-xs text-slate-300 mt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                    On-Duty: <strong className="text-white ml-0.5">{activeShift.staffName}</strong> ({activeShift.staffRole})
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Started: {new Date(activeShift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(activeShift.startTime).toLocaleDateString()})
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right bg-slate-800/80 px-4 py-3 rounded-xl border border-slate-700">
                <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider block">
                  Expected Drawer Cash
                </span>
                <div className="text-2xl font-black text-emerald-400 tracking-tight mt-0.5">
                  ₹{activeShift.expectedCash.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-slate-400">
                  Float + Cash Sales + In - Drops
                </span>
              </div>
            </div>
          </div>

          {/* Active Shift Financial Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
            <div className="bg-slate-800/50 p-3.5 rounded-lg border border-slate-700/60">
              <span className="text-[10px] font-semibold uppercase text-slate-400 block tracking-wider">
                Opening Cash Float
              </span>
              <div className="text-base font-bold text-white mt-1">
                ₹{activeShift.openingFloat.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-400">Initial register base</span>
            </div>

            <div className="bg-slate-800/50 p-3.5 rounded-lg border border-slate-700/60">
              <span className="text-[10px] font-semibold uppercase text-emerald-400 block tracking-wider">
                Cash Collections
              </span>
              <div className="text-base font-bold text-emerald-300 mt-1">
                ₹{activeShift.totalCashSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-400">Direct cash sales</span>
            </div>

            <div className="bg-slate-800/50 p-3.5 rounded-lg border border-slate-700/60">
              <span className="text-[10px] font-semibold uppercase text-sky-400 block tracking-wider">
                Digital & Card
              </span>
              <div className="text-base font-bold text-sky-300 mt-1">
                ₹{activeShift.totalCardSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-400">POS / Card terminal</span>
            </div>

            <div className="bg-slate-800/50 p-3.5 rounded-lg border border-slate-700/60">
              <span className="text-[10px] font-semibold uppercase text-purple-400 block tracking-wider">
                NEEPCO / Insurance
              </span>
              <div className="text-base font-bold text-purple-300 mt-1">
                ₹{activeShift.totalInsuranceSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-400">Corporate coverage</span>
            </div>

            <div className="bg-slate-800/50 p-3.5 rounded-lg border border-slate-700/60">
              <span className="text-[10px] font-semibold uppercase text-amber-400 block tracking-wider">
                Net Cash Drops / In
              </span>
              <div className="text-base font-bold text-amber-300 mt-1">
                {activeShift.cashIn >= activeShift.cashOut ? '+' : '-'}₹{Math.abs(activeShift.cashIn - activeShift.cashOut).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-400">+{activeShift.cashIn} In / -{activeShift.cashOut} Safe</span>
            </div>

            <div className="bg-slate-800/50 p-3.5 rounded-lg border border-slate-700/60">
              <span className="text-[10px] font-semibold uppercase text-slate-400 block tracking-wider">
                Dispensing Volume
              </span>
              <div className="text-base font-bold text-white mt-1">
                {activeShift.totalTransactions} <span className="text-xs font-normal text-slate-400">Rx ({activeShift.totalItemsDispensed} items)</span>
              </div>
              <span className="text-[10px] text-slate-400">FEFO prescriptions</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">No Register Shift Currently Open</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
            To maintain strict clinical cash accountability, start a new shift register with an opening cash float before dispensing cash transactions.
          </p>
          <button
            onClick={() => {
              setModalError(null);
              setIsStartModalOpen(true);
            }}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs inline-flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Open Register & Record Float
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('current')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'current'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Active Drawer Actions & Calculator
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'history'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Shift Reconciliation History & Z-Reports
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
              {shifts.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'movements'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Coins className="w-4 h-4" />
            Cash Drops & Float Movements Ledger
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
              {allMovements.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: Active Drawer Actions & Denomination Calculator */}
      {activeTab === 'current' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Live Shift Movements & Instructions */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-600" />
                    Cash Movements for Current Shift
                  </h3>
                  <p className="text-xs text-slate-500">
                    Safe drops, coin float replenishments, and petty cash entries recorded during this active shift.
                  </p>
                </div>
                {activeShift && (
                  <button
                    onClick={() => {
                      setModalError(null);
                      setIsMovementModalOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Record Movement
                  </button>
                )}
              </div>

              {activeShift && activeShift.movements && activeShift.movements.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 border-y border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Amount (₹)</th>
                        <th className="py-2.5 px-3">Reason / Description</th>
                        <th className="py-2.5 px-3">Staff</th>
                        <th className="py-2.5 px-3">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeShift.movements.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 w-fit ${
                                m.type === 'Float In'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : m.type === 'Cash Drop (Safe)'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {m.type === 'Float In' ? (
                                <ArrowDownRight className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <ArrowUpRight className="w-3 h-3 text-purple-600" />
                              )}
                              {m.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            ₹{m.amount.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">{m.reason}</td>
                          <td className="py-2.5 px-3 text-slate-600">{m.performedByName}</td>
                          <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No cash movements recorded yet for this active shift.
                </div>
              )}
            </div>

            {/* Shift Protocol Notice */}
            <div className="bg-slate-50 rounded-xl border border-slate-200/90 p-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                NEEPCO Pharmacy Handover Protocol & SOP
              </h4>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                <li>
                  <strong>Dual Count Verification:</strong> Count physical notes and coins in front of the relieving pharmacist before finalizing handover.
                </li>
                <li>
                  <strong>Safe Drop Policy:</strong> If cash in drawer exceeds ₹15,000 during high OPD hours, execute a "Cash Drop (Safe)" transfer to the central clinic locker.
                </li>
                <li>
                  <strong>Variance Explanations:</strong> Any cash surplus or deficit exceeding ₹0.00 mandates an immediate justification recorded for audit logs.
                </li>
                <li>
                  <strong>Controlled Substances Check:</strong> Verify narcotic cabinet keys and prescription balances prior to relieving sign-off.
                </li>
              </ul>
            </div>
          </div>

          {/* Right Col: Interactive Quick Denomination Counter Tool */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-sky-600" />
                Quick INR Denomination Counter
              </h3>
              <p className="text-xs text-slate-500">
                Test physical note counts against expected drawer balance.
              </p>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
              {STANDARD_DENOMINATIONS.map((denom) => {
                const count = denomCounts[denom] || 0;
                const sub = denom * count;
                return (
                  <div
                    key={denom}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/70 text-xs"
                  >
                    <div className="flex items-center gap-2 w-20">
                      <span className="font-bold text-slate-800">₹{denom}</span>
                      <span className="text-[10px] text-slate-400">note</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px]">×</span>
                      <input
                        type="number"
                        min="0"
                        value={count === 0 ? '' : count}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setDenomCounts((prev) => ({ ...prev, [denom]: val }));
                        }}
                        placeholder="0"
                        className="w-16 px-2 py-1 text-center bg-white border border-slate-300 rounded font-semibold text-slate-800 text-xs focus:ring-1 focus:ring-sky-500 outline-none"
                      />
                    </div>

                    <div className="text-right w-24 font-mono font-semibold text-slate-700">
                      ₹{sub.toLocaleString('en-IN')}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500">Total Counted:</span>
                <span className="text-base font-black text-slate-900 font-mono">
                  ₹{countedFromDenominations.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {activeShift && (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">System Expected:</span>
                    <span className="font-semibold text-slate-700 font-mono">
                      ₹{activeShift.expectedCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-bold ${
                      countedFromDenominations === activeShift.expectedCash
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : countedFromDenominations > activeShift.expectedCash
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    <span>Calculated Variance:</span>
                    <span>
                      {countedFromDenominations - activeShift.expectedCash >= 0 ? '+' : ''}
                      ₹{(countedFromDenominations - activeShift.expectedCash).toFixed(2)}{' '}
                      {countedFromDenominations === activeShift.expectedCash
                        ? '(Exact Match)'
                        : countedFromDenominations > activeShift.expectedCash
                        ? '(Over)'
                        : '(Short)'}
                    </span>
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={() =>
                  setDenomCounts({
                    2000: 0,
                    500: 0,
                    200: 0,
                    100: 0,
                    50: 0,
                    20: 0,
                    10: 0,
                    5: 0,
                    2: 0,
                    1: 0,
                  })
                }
                className="w-full py-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded transition-colors"
              >
                Reset Counts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Shift Reconciliation History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Shift #, Pharmacist..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Filter className="w-3.5 h-3.5 text-slate-400" /> Status:
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="all">All Shifts</option>
                <option value="open">Open / Active Only</option>
                <option value="closed">Closed Shifts</option>
                <option value="balanced">Balanced (0 Variance)</option>
                <option value="variance">With Discrepancy</option>
              </select>

              {uniqueRegisters.length > 1 && (
                <select
                  value={registerFilter}
                  onChange={(e) => setRegisterFilter(e.target.value)}
                  className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="all">All Registers</option>
                  {uniqueRegisters.map((reg) => (
                    <option key={reg} value={reg}>
                      {reg}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Shift & Register</th>
                  <th className="py-3 px-4">Staff & Reliever</th>
                  <th className="py-3 px-4">Timeline</th>
                  <th className="py-3 px-4 text-right">Opening Float</th>
                  <th className="py-3 px-4 text-right">Total Sales</th>
                  <th className="py-3 px-4 text-right">Expected Cash</th>
                  <th className="py-3 px-4 text-right">Counted / Variance</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredShifts.map((s) => {
                  const totalAllSales =
                    s.totalCashSales +
                    s.totalCardSales +
                    s.totalInsuranceSales +
                    s.totalUPIOrOtherSales;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{s.shiftNumber}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                            {s.shiftType}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                          {s.registerName}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{s.staffName}</div>
                        <div className="text-[11px] text-slate-500">
                          {s.relievingStaffName ? `Relieved by: ${s.relievingStaffName}` : 'No reliever assigned'}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-slate-900 font-medium">
                          {new Date(s.startTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {s.endTime
                            ? new Date(s.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'Active'}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        ₹{s.openingFloat.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="font-bold text-slate-900">
                          ₹{totalAllSales.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Cash: ₹{s.totalCashSales.toFixed(2)} ({s.totalTransactions} Rx)
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ₹{s.expectedCash.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {s.status === 'Closed' ? (
                          <div>
                            <div className="font-semibold text-slate-900">
                              ₹{(s.actualCashCounted ?? s.expectedCash).toFixed(2)}
                            </div>
                            <div
                              className={`text-[10px] font-bold ${
                                s.variance === 0
                                  ? 'text-emerald-600'
                                  : (s.variance || 0) > 0
                                  ? 'text-blue-600'
                                  : 'text-rose-600'
                              }`}
                            >
                              {(s.variance || 0) === 0
                                ? '✓ Exact (₹0.00)'
                                : `${(s.variance || 0) > 0 ? '+' : ''}₹${(s.variance || 0).toFixed(2)}`}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">In progress</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            s.status === 'Open'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : (s.variance || 0) === 0
                              ? 'bg-slate-100 text-slate-700 border border-slate-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {s.status === 'Open'
                            ? 'Active'
                            : (s.variance || 0) === 0
                            ? 'Closed / Balanced'
                            : 'Closed / Variance'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => openZReport(s.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded flex items-center gap-1 ml-auto transition-colors"
                          title="Generate & View Z-Report / Handover Certificate"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Z-Report
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: All Cash Movements Ledger */}
      {activeTab === 'movements' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Central Cash Drawer Audit Ledger
              </h3>
              <p className="text-xs text-slate-500">
                Log of all safe drops, coin replenishments, and petty expenses across all register shifts.
              </p>
            </div>
            {activeShift && (
              <button
                onClick={() => {
                  setModalError(null);
                  setIsMovementModalOpen(true);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Record Cash Action
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Shift & Register</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4">Reason / Authorization</th>
                  <th className="py-3 px-4">Pharmacist</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-900 font-medium">
                      {new Date(m.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
                      <span className="text-slate-400 font-normal">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{m.shiftNumber}</div>
                      <div className="text-[11px] text-slate-500">{m.registerName}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold inline-flex items-center gap-1 ${
                          m.type === 'Float In'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : m.type === 'Cash Drop (Safe)'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {m.type === 'Float In' ? (
                          <ArrowDownRight className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3 text-purple-600" />
                        )}
                        {m.type}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-black text-slate-900 font-mono">
                      ₹{m.amount.toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-slate-700">{m.reason}</td>

                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {m.performedByName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL 1: START NEW SHIFT ================= */}
      {isStartModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-white/10">
                  <Banknote className="w-5 h-5 text-emerald-400" />
                </span>
                <div>
                  <h3 className="text-sm font-bold">Open Register & Start Shift</h3>
                  <p className="text-xs text-slate-400">
                    Set up cash drawer float for NEEPCO Clinical Dispensary
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsStartModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStartShift} className="p-6 space-y-4 text-xs">
              {modalError && (
                <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Dispensary Register / Counter Terminal <span className="text-rose-500">*</span>
                </label>
                <select
                  value={startForm.registerName}
                  onChange={(e) => setStartForm({ ...startForm, registerName: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-medium text-slate-800 focus:ring-1 focus:ring-sky-500"
                >
                  <option value="Main OPD Pharmacy Counter 1">Main OPD Pharmacy Counter 1</option>
                  <option value="Emergency Pharmacy Window">Emergency & Trauma Pharmacy Window</option>
                  <option value="IPD Inpatient Counter">IPD Inpatient Dispensary Counter</option>
                  <option value="Night Duty Counter">Night Service & On-Call Counter</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Shift Duty Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={startForm.shiftType}
                    onChange={(e) => setStartForm({ ...startForm, shiftType: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-medium text-slate-800 focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="Morning">Morning Shift (08:00 - 16:00)</option>
                    <option value="Evening">Evening Shift (16:00 - 00:00)</option>
                    <option value="Night / Emergency">Night / Emergency (00:00 - 08:00)</option>
                    <option value="General">General Clinic Duty</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Opening Cash Float (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      required
                      value={startForm.openingFloat}
                      onChange={(e) => setStartForm({ ...startForm, openingFloat: Math.max(0, Number(e.target.value)) })}
                      className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Float Chips */}
              <div>
                <span className="text-[11px] text-slate-500 mb-1.5 block">Quick Float Presets:</span>
                <div className="flex items-center gap-2">
                  {[1000, 2000, 3000, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setStartForm({ ...startForm, openingFloat: amt })}
                      className={`px-2.5 py-1 rounded border text-[11px] font-semibold transition-colors ${
                        startForm.openingFloat === amt
                          ? 'bg-sky-50 text-sky-700 border-sky-300'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      ₹{amt.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Opening Remarks / Inspection Notes
                </label>
                <textarea
                  rows={2}
                  value={startForm.notes}
                  onChange={(e) => setStartForm({ ...startForm, notes: e.target.value })}
                  placeholder="e.g. Narcotic lockbox keys received, small change notes verified from central vault."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStartModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isActionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Confirm & Open Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: CASH MOVEMENT (DROP / FLOAT) ================= */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-white/10">
                  <Coins className="w-5 h-5 text-amber-400" />
                </span>
                <div>
                  <h3 className="text-sm font-bold">Record Cash Drawer Action</h3>
                  <p className="text-xs text-slate-400">
                    Safe drops, extra float in, or authorized petty expense
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMovementModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMovement} className="p-6 space-y-4 text-xs">
              {modalError && (
                <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Movement Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={movementForm.type}
                  onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value as any })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-medium text-slate-800 focus:ring-1 focus:ring-sky-500"
                >
                  <option value="Cash Drop (Safe)">Cash Drop to Hospital Safe (Reduces Drawer Cash)</option>
                  <option value="Float In">Float In / Change Replenishment (Adds Drawer Cash)</option>
                  <option value="Petty Expense">Authorized Petty Expense (Reduces Drawer Cash)</option>
                  <option value="Correction">Audit Balancing Correction</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={movementForm.amount}
                    onChange={(e) => setMovementForm({ ...movementForm, amount: Math.max(1, Number(e.target.value)) })}
                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 text-sm focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Reason & Purpose / Voucher Reference <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={movementForm.reason}
                  onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })}
                  placeholder="e.g. Transferred ₹5,000 cash excess to Hospital Vault Safe with supervisor witness."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                <strong>Projected Drawer Impact:</strong> This action will{' '}
                {movementForm.type === 'Float In' ? (
                  <span className="text-emerald-700 font-bold">increase</span>
                ) : (
                  <span className="text-purple-700 font-bold">decrease</span>
                )}{' '}
                expected drawer cash by ₹{Number(movementForm.amount || 0).toFixed(2)}.
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMovementModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isActionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Save Movement Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: RECONCILE & CLOSE SHIFT (HANDOVER) ================= */}
      {isCloseModalOpen && activeShift && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold">
                    Reconcile Cash Drawer & Complete Shift Handover
                  </h3>
                  <p className="text-xs text-slate-400">
                    Shift #{activeShift.shiftNumber} • {activeShift.registerName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCloseModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCloseShift} className="p-6 space-y-5 text-xs overflow-y-auto custom-scrollbar flex-1">
              {modalError && (
                <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Financial Benchmark Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-3 gap-3 text-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Opening Float</span>
                  <span className="text-sm font-bold text-slate-800">₹{activeShift.openingFloat.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Cash Collections</span>
                  <span className="text-sm font-bold text-emerald-700">₹{activeShift.totalCashSales.toFixed(2)}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-sky-700 block">System Expected</span>
                  <span className="text-base font-black text-sky-800 font-mono">₹{activeShift.expectedCash.toFixed(2)}</span>
                </div>
              </div>

              {/* Count Mode Selector */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-800">Physical Cash Count Method:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUseDenominationsMode(true)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold ${
                      useDenominationsMode
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Note Breakdown (₹2000...₹1)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseDenominationsMode(false)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold ${
                      !useDenominationsMode
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Direct Lump Sum Entry
                  </button>
                </div>
              </div>

              {/* Method A: Denominations Grid */}
              {useDenominationsMode ? (
                <div className="space-y-2">
                  <span className="text-[11px] text-slate-500 block">
                    Enter the count of each physical currency note/coin in the drawer:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-200 rounded-lg bg-slate-50">
                    {STANDARD_DENOMINATIONS.map((denom) => (
                      <div key={denom} className="bg-white p-2 rounded border border-slate-200 text-center">
                        <span className="text-[11px] font-bold text-slate-800 block">₹{denom}</span>
                        <input
                          type="number"
                          min="0"
                          value={denomCounts[denom] || ''}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                            setDenomCounts((prev) => ({ ...prev, [denom]: val }));
                          }}
                          placeholder="0"
                          className="w-full mt-1 p-1 text-center font-bold text-xs border border-slate-300 rounded focus:ring-1 focus:ring-sky-500"
                        />
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                          ₹{((denomCounts[denom] || 0) * denom).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Total Counted Physical Cash (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={directCountedAmount}
                      onChange={(e) => setDirectCountedAmount(Math.max(0, Number(e.target.value)))}
                      className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg font-black text-slate-900 text-base focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>
              )}

              {/* Live Variance Analysis Box */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  currentVariance === 0
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    : currentVariance > 0
                    ? 'bg-blue-50 text-blue-900 border-blue-300'
                    : 'bg-rose-50 text-rose-900 border-rose-300'
                }`}
              >
                <div>
                  <span className="text-xs uppercase font-bold tracking-wider block">
                    {currentVariance === 0
                      ? '✓ Cash Drawer Reconciled (Exact Match)'
                      : currentVariance > 0
                      ? '⚠ Cash Over / Surplus Detected'
                      : '⚠ Cash Short / Deficit Detected'}
                  </span>
                  <span className="text-xs opacity-80">
                    Counted: ₹{effectiveCountedCash.toFixed(2)} vs Expected: ₹{activeShift.expectedCash.toFixed(2)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black font-mono">
                    {currentVariance >= 0 ? '+' : ''}₹{currentVariance.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Mandatory Variance Reason if discrepancy exists */}
              {currentVariance !== 0 && (
                <div className="space-y-1 bg-amber-50/70 p-3.5 rounded-lg border border-amber-200">
                  <label className="block text-amber-900 font-bold text-xs flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Mandatory Discrepancy Justification Note <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={varianceReason}
                    onChange={(e) => setVarianceReason(e.target.value)}
                    placeholder="Provide specific reason for difference (e.g. small roundoff coin discrepancy, pending customer return)."
                    className="w-full p-2 border border-amber-300 rounded bg-white text-slate-800 focus:ring-1 focus:ring-amber-500 text-xs"
                  />
                </div>
              )}

              {/* Relieving Pharmacist & Handover */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Relieving Pharmacist / Supervisor
                  </label>
                  <select
                    value={relievingStaffId}
                    onChange={(e) => setRelievingStaffId(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-medium text-slate-800 focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="">-- Select Incoming Staff --</option>
                    {staffUsers
                      .filter((u) => u.isActive && u.id !== user?.id)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} ({u.role})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Shift Handover Remarks
                  </label>
                  <input
                    type="text"
                    value={handoverNotes}
                    onChange={(e) => setHandoverNotes(e.target.value)}
                    placeholder="Narcotics cabinet verified, next queue items..."
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCloseModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isActionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Lock Register & Generate Z-Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: OFFICIAL Z-REPORT & HANDOVER CERTIFICATE ================= */}
      {isZReportModalOpen && selectedZReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">Official Shift Z-Report & Certification</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyZReportSummary}
                  className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center gap-1 border border-slate-700"
                  title="Copy formatted text"
                >
                  {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSuccess ? 'Copied' : 'Copy Text'}
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Slip
                </button>
                <button
                  onClick={() => setIsZReportModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 text-xs space-y-6 print:p-0 print:text-black">
              {/* Official Header */}
              <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <NeepcoLogo className="w-14 h-7" />
                  <span className="font-black text-sm text-slate-900 uppercase tracking-tight">
                    NTPC - NEEPCO OCCUPATIONAL HEALTH CENTRE
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium">
                  Central Medical Dispensary & Pharmacy Division
                </p>
                <p className="text-[10px] text-slate-500">
                  License: {selectedZReport.clinic.license} • Shift Z-Report & Handover Slip
                </p>
              </div>

              {/* Shift Key Info */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-slate-700">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Shift Identifier</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {selectedZReport.shift.shiftNumber} ({selectedZReport.shift.shiftType})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Terminal / Register</span>
                  <span className="font-bold text-slate-900">{selectedZReport.shift.registerName}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Pharmacist On Duty</span>
                  <span className="font-medium">{selectedZReport.shift.staffName} ({selectedZReport.shift.staffRole})</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Relieving Staff</span>
                  <span className="font-medium">{selectedZReport.shift.relievingStaffName || 'Unassigned / Vault Lock'}</span>
                </div>
                <div className="col-span-2 text-[11px] text-slate-500 border-t border-slate-200/80 pt-2 flex items-center justify-between">
                  <span>
                    Started: {new Date(selectedZReport.shift.startTime).toLocaleString()}
                  </span>
                  <span>
                    Closed: {selectedZReport.shift.endTime ? new Date(selectedZReport.shift.endTime).toLocaleString() : 'Open'}
                  </span>
                </div>
              </div>

              {/* Financial Breakdown Table */}
              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-2">
                  Financial Reconciliation Summary
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <tbody className="divide-y divide-slate-200">
                      <tr className="bg-slate-50/50">
                        <td className="py-1.5 px-3 text-slate-600">Opening Cash Float</td>
                        <td className="py-1.5 px-3 text-right font-mono font-semibold">
                          ₹{selectedZReport.shift.openingFloat.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3 text-slate-600">Cash Collections (OPD)</td>
                        <td className="py-1.5 px-3 text-right font-mono font-semibold text-emerald-700">
                          +₹{selectedZReport.shift.totalCashSales.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3 text-slate-600">Credit Card / POS Sales</td>
                        <td className="py-1.5 px-3 text-right font-mono font-semibold text-sky-700">
                          ₹{selectedZReport.shift.totalCardSales.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3 text-slate-600">NEEPCO Corporate / Insurance</td>
                        <td className="py-1.5 px-3 text-right font-mono font-semibold text-purple-700">
                          ₹{selectedZReport.shift.totalInsuranceSales.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3 text-slate-600">UPI / Mobile Money</td>
                        <td className="py-1.5 px-3 text-right font-mono font-semibold text-amber-700">
                          ₹{selectedZReport.shift.totalUPIOrOtherSales.toFixed(2)}
                        </td>
                      </tr>
                      <tr className="bg-slate-50/50">
                        <td className="py-1.5 px-3 text-slate-600">Cash Drops to Safe / Petty Out</td>
                        <td className="py-1.5 px-3 text-right font-mono font-semibold text-rose-700">
                          -₹{selectedZReport.shift.cashOut.toFixed(2)}
                        </td>
                      </tr>
                      <tr className="bg-slate-100 font-bold">
                        <td className="py-2 px-3 text-slate-900">Expected Physical Drawer Cash</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-900">
                          ₹{selectedZReport.shift.expectedCash.toFixed(2)}
                        </td>
                      </tr>
                      <tr className="bg-slate-900 text-white font-bold">
                        <td className="py-2 px-3">Actual Counted Physical Cash</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-400 text-sm">
                          ₹{(selectedZReport.shift.actualCashCounted ?? selectedZReport.shift.expectedCash).toFixed(2)}
                        </td>
                      </tr>
                      <tr
                        className={`font-bold ${
                          (selectedZReport.shift.variance || 0) === 0
                            ? 'bg-emerald-50 text-emerald-900'
                            : 'bg-amber-50 text-amber-900'
                        }`}
                      >
                        <td className="py-2 px-3">Variance / Discrepancy</td>
                        <td className="py-2 px-3 text-right font-mono">
                          {(selectedZReport.shift.variance || 0) >= 0 ? '+' : ''}
                          ₹{(selectedZReport.shift.variance || 0).toFixed(2)}{' '}
                          ({selectedZReport.shift.varianceReason || 'Exact Match'})
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Denomination Breakdown If Available */}
              {selectedZReport.shift.denominations && selectedZReport.shift.denominations.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-2">
                    Counted Currency Denominations
                  </h4>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    {selectedZReport.shift.denominations.map((d: any) => (
                      <div key={d.denomination} className="p-1.5 bg-slate-50 border border-slate-200 rounded">
                        <span className="font-bold text-slate-700">₹{d.denomination}</span> × {d.count} ={' '}
                        <strong className="text-slate-900 font-mono">₹{d.subtotal}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Handover Remarks */}
              {selectedZReport.shift.handoverNotes && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Shift Handover Remarks & Log
                  </span>
                  <p className="text-xs text-slate-700 italic">
                    "{selectedZReport.shift.handoverNotes}"
                  </p>
                </div>
              )}

              {/* Dual Signatures */}
              <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-center">
                <div>
                  <div className="border-b border-slate-400 pb-1 mb-1 font-semibold text-slate-800">
                    {selectedZReport.shift.staffName}
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                    Handed Over By (Outgoing Pharmacist)
                  </span>
                </div>
                <div>
                  <div className="border-b border-slate-400 pb-1 mb-1 font-semibold text-slate-800">
                    {selectedZReport.shift.relievingStaffName || '________________________'}
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                    Received & Verified By (Incoming Staff)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
