import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DashboardData } from '../types';
import { useAuth } from '../context/AuthContext';
import { TabType } from '../components/Sidebar';
import { formatMonthYear } from '../utils/formatters';
import {
  Pill,
  FlaskConical,
  AlertTriangle,
  Clock,
  Syringe,
  ShoppingCart,
  Boxes,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertOctagon,
  Calendar,
  Check,
  Activity,
  UserCheck,
  Mail,
  ThermometerSnowflake,
  Layers,
  TestTube2,
  Building2,
  ChevronRight,
  Sparkles,
  Package,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface DashboardViewProps {
  onNavigate: (tab: TabType | string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardScope, setDashboardScope] = useState<'all' | 'medicines' | 'reagents'>('all');
  const [alertsTab, setAlertsTab] = useState<'all' | 'medicines' | 'reagents'>('all');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboard();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (e) {
      console.error('Error loading dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading || !data) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-sky-200 border-t-sky-600 rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-medium text-slate-500">
          Loading clinical & diagnostic dashboard metrics...
        </p>
      </div>
    );
  }

  const { cards } = data;
  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const currentTime = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalCombinedCatalog = (cards.totalMedicines || 0) + (cards.totalReagents || 0);
  const totalCombinedLowStock = (cards.lowStockCount || 0) + (cards.lowStockReagentsCount || 0);
  const totalCombinedExpiring = (cards.expiringSoonCount || 0) + (cards.expiringReagentsCount || 0);
  const totalCombinedExpired = (cards.expiredCount || 0) + (cards.expiredReagentsCount || 0);
  const totalCombinedValue = (cards.totalInventoryValue || 0) + (cards.reagentInventoryValue || 0);

  return (
    <div className="space-y-6">
      {/* Overview Page Title Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Clinic & Lab Dashboard</h2>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Live Integrated Hub
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Welcome back, {user?.fullName || 'User'}. Unified monitor for pharmaceuticals, laboratory reagents, and clinical dispensing.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2 text-right">
          <button
            onClick={() => onNavigate('emailLogs')}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-all shadow-2xs"
          >
            <Mail className="w-3.5 h-3.5 text-indigo-600" />
            <span>Alerts & SMTP</span>
          </button>
          
          <div className="hidden sm:block text-right pr-1">
            <p className="text-xs font-bold text-slate-800">{currentDate}</p>
            <p className="text-[10px] text-slate-400">Updated: {currentTime}</p>
          </div>

          <button
            onClick={fetchDashboard}
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 shadow-2xs transition-colors"
            title="Refresh metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scope Segment Control & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Scope Tabs */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl gap-1 text-xs overflow-x-auto">
          <button
            onClick={() => setDashboardScope('all')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              dashboardScope === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-slate-700" />
            <span>All Inventory & Lab</span>
          </button>

          <button
            onClick={() => setDashboardScope('medicines')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              dashboardScope === 'medicines'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-indigo-900'
            }`}
          >
            <Pill className="w-3.5 h-3.5 text-indigo-600" />
            <span>Medicines & Pharmacy</span>
          </button>

          <button
            onClick={() => setDashboardScope('reagents')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              dashboardScope === 'reagents'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-emerald-900'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5 text-emerald-600" />
            <span>Diagnostic Reagents</span>
            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-black">
              {cards.totalReagents || 0}
            </span>
          </button>
        </div>

        {/* Quick Launch Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => onNavigate('dispensing')}
            className="px-3 py-1.5 bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1 shrink-0"
          >
            <Syringe className="w-3.5 h-3.5 text-sky-600" />
            + Dispense
          </button>
          <button
            onClick={() => onNavigate('reagents')}
            className="px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1 shrink-0"
          >
            <TestTube2 className="w-3.5 h-3.5 text-emerald-600" />
            + Log Lab Test
          </button>
          <button
            onClick={() => onNavigate('purchases')}
            className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1 shrink-0"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            + Purchase Order
          </button>
        </div>
      </div>

      {/* Top 6 Metric Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Total Catalog Items */}
        {dashboardScope === 'reagents' ? (
          <div
            onClick={() => onNavigate('reagents')}
            className="bg-white p-5 rounded-2xl border border-emerald-200/80 shadow-2xs hover:border-emerald-300 cursor-pointer transition-all bg-linear-to-br from-white to-emerald-50/20 group"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5 text-emerald-600" />
                Lab Diagnostic Reagents
              </p>
              <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900">{cards.totalReagents || 0}</span>
              <span className="text-emerald-700 text-xs font-bold bg-emerald-100/70 px-2 py-0.5 rounded-md">
                {(cards.totalTestsAvailable || 0).toLocaleString()} Tests Available
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between border-t border-slate-100 pt-2 font-medium">
              <span>Kits: <strong>{cards.totalReagentKits || 0} packs</strong></span>
              <span>Valuation: <strong>₹{(cards.reagentInventoryValue || 0).toLocaleString('en-IN')}</strong></span>
            </div>
          </div>
        ) : dashboardScope === 'medicines' ? (
          <div
            onClick={() => onNavigate('medicines')}
            className="bg-white p-5 rounded-2xl border border-indigo-200/80 shadow-2xs hover:border-indigo-300 cursor-pointer transition-all bg-linear-to-br from-white to-indigo-50/20 group"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-indigo-600" />
                Total Medicines
              </p>
              <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900">{cards.totalMedicines}</span>
              <span className="text-indigo-700 text-xs font-bold bg-indigo-100/70 px-2 py-0.5 rounded-md">
                {cards.activeMedicines} Active
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between border-t border-slate-100 pt-2 font-medium">
              <span>Total Units: <strong>{cards.totalStockUnits}</strong></span>
              <span>Valuation: <strong>₹{(cards.totalInventoryValue || 0).toLocaleString('en-IN')}</strong></span>
            </div>
          </div>
        ) : (
          <div
            onClick={() => onNavigate('inventory')}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-slate-500" />
                Total Inventory Catalog
              </p>
              <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-700 transition-colors" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900">{totalCombinedCatalog} Items</span>
              <span className="text-emerald-700 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                All Systems Active
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between border-t border-slate-100 pt-2 font-medium">
              <span>💊 <strong>{cards.totalMedicines}</strong> Meds</span>
              <span>🧪 <strong>{cards.totalReagents || 0}</strong> Reagents ({(cards.totalTestsAvailable || 0).toLocaleString()} tests)</span>
            </div>
          </div>
        )}

        {/* Card 2: Low Stock Alerts */}
        <div
          onClick={() => onNavigate(dashboardScope === 'reagents' ? 'reagents' : 'inventory')}
          className="bg-white p-5 rounded-2xl border border-rose-200/80 shadow-2xs hover:border-rose-300 cursor-pointer transition-all bg-linear-to-br from-white to-rose-50/15 group"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              Low Stock Warnings
            </p>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-rose-600 transition-colors" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900">
              {dashboardScope === 'reagents'
                ? cards.lowStockReagentsCount || 0
                : dashboardScope === 'medicines'
                ? cards.lowStockCount
                : totalCombinedLowStock}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
              totalCombinedLowStock > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
            }`}>
              {totalCombinedLowStock > 0 ? 'REORDER NEEDED' : 'STOCK HEALTHY'}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between border-t border-slate-100 pt-2 font-medium">
            <span>💊 Meds Low: <strong>{cards.lowStockCount}</strong></span>
            <span>🧪 Reagents Low: <strong>{cards.lowStockReagentsCount || 0}</strong></span>
          </div>
        </div>

        {/* Card 3: Expiring Soon & Open Vial Stability */}
        <div
          onClick={() => onNavigate(dashboardScope === 'reagents' ? 'reagents' : 'batches')}
          className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-2xs hover:border-amber-300 cursor-pointer transition-all bg-linear-to-br from-white to-amber-50/15 group"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Expiring Batches & Open Vials
            </p>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition-colors" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900">
              {dashboardScope === 'reagents'
                ? (cards.expiringReagentsCount || 0) + (cards.openVialsNearExpiryCount || 0)
                : dashboardScope === 'medicines'
                ? cards.expiringSoonCount
                : totalCombinedExpiring}
            </span>
            <span className="text-amber-800 text-xs font-bold bg-amber-100/80 px-2 py-0.5 rounded-md">
              Next 30 Days / Open
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between border-t border-slate-100 pt-2 font-medium">
            <span>💊 Med Lots: <strong>{cards.expiringSoonCount}</strong></span>
            <span>🧪 Open Vials: <strong>{cards.openVialsCount || 0} active</strong></span>
          </div>
        </div>

        {/* Card 4: Expired Batches (Action Required) */}
        <div
          onClick={() => onNavigate(dashboardScope === 'reagents' ? 'reagents' : 'batches')}
          className="bg-white p-5 rounded-2xl border border-red-200/80 shadow-2xs hover:border-red-300 cursor-pointer transition-all bg-linear-to-br from-white to-red-50/15 group"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider flex items-center gap-1.5">
              <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
              Expired Quarantine
            </p>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-red-600 transition-colors" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900">
              {dashboardScope === 'reagents'
                ? cards.expiredReagentsCount || 0
                : dashboardScope === 'medicines'
                ? cards.expiredCount
                : totalCombinedExpired}
            </span>
            <span
              className={`px-2 py-0.5 text-[10px] font-black rounded-md ${
                totalCombinedExpired > 0
                  ? 'bg-red-100 text-red-800 animate-pulse'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {totalCombinedExpired > 0 ? 'QUARANTINE ACTION' : 'ZERO EXPIRED'}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between border-t border-slate-100 pt-2 font-medium">
            <span>💊 Expired Meds: <strong>{cards.expiredCount}</strong></span>
            <span>🧪 Expired Reagents: <strong>{cards.expiredReagentsCount || 0}</strong></span>
          </div>
        </div>

        {/* Card 5: Today's Clinical Activity */}
        <div
          onClick={() => onNavigate(dashboardScope === 'reagents' ? 'reagents' : 'dispensing')}
          className="bg-white p-5 rounded-2xl border border-sky-200/80 shadow-2xs hover:border-sky-300 cursor-pointer transition-all bg-linear-to-br from-white to-sky-50/15 group"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-sky-600" />
              Today's Clinical Usage
            </p>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-sky-600 transition-colors" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900">
              {dashboardScope === 'reagents'
                ? `${cards.todayReagentTestsRun || 0} Tests`
                : dashboardScope === 'medicines'
                ? `${cards.todayDispensingCount} Rx`
                : `${cards.todayDispensingCount} Rx / ${cards.todayReagentTestsRun || 0} Tests`}
            </span>
            <span className="text-sky-700 text-xs font-bold bg-sky-100/70 px-2 py-0.5 rounded-md">
              Today
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between border-t border-slate-100 pt-2 font-medium">
            <span>💊 Rx Sales: <strong>₹{(cards.todayDispensingAmount || 0).toFixed(2)}</strong></span>
            <span>🧪 Lab Logs: <strong>{cards.todayReagentConsumptionCount || 0} runs</strong></span>
          </div>
        </div>

        {/* Card 6: Pending Purchases & Logistics */}
        <div
          onClick={() => onNavigate('purchases')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingCart className="w-3.5 h-3.5 text-slate-500" />
              Pending Purchase Orders
            </p>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-700 transition-colors" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900">{cards.pendingPurchasesCount} Orders</span>
            <span className="text-slate-600 text-xs font-bold bg-slate-100 px-2 py-0.5 rounded-md">
              Awaiting GRN
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between border-t border-slate-100 pt-2 font-medium">
            <span>Reagent Replenishment: <strong>{cards.pendingReagentPurchasesCount || 0} POs</strong></span>
            <span className="text-sky-600 font-bold">Receive Stock →</span>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Chart: Medicine Stock by Category OR Lab Reagent Tests by Department */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900">
                  {dashboardScope === 'reagents'
                    ? 'Laboratory Diagnostic Reagents & Test Capacity'
                    : dashboardScope === 'medicines'
                    ? 'Medicine Stock Distribution by Category'
                    : 'Inventory Distribution: Medicines & Lab Diagnostic Reagents'}
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                {dashboardScope === 'reagents'
                  ? 'Total available diagnostic tests and kit inventory across pathology disciplines'
                  : 'Current on-hand units categorized by therapeutic specialty & laboratory department'}
              </p>
            </div>
            
            <div className="flex items-center gap-1.5 text-xs font-bold">
              {dashboardScope !== 'reagents' && (
                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-lg">
                  💊 {cards.totalStockUnits} Med Units
                </span>
              )}
              {dashboardScope !== 'medicines' && (
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg">
                  🧪 {(cards.totalTestsAvailable || 0).toLocaleString()} Lab Tests
                </span>
              )}
            </div>
          </div>

          <div className="h-68 w-full">
            {dashboardScope === 'reagents' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.departmentReagentStats || []} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '12px',
                      border: 'none',
                      padding: '8px 12px',
                    }}
                    formatter={(value: any, name: any) => [
                      name === 'testsAvailable' ? `${Number(value).toLocaleString()} Tests` : `${value} Kits`,
                      name === 'testsAvailable' ? 'Test Capacity' : 'Kits On Hand',
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="testsAvailable" fill="#059669" radius={[4, 4, 0, 0]} name="Available Tests" />
                  <Bar dataKey="stockKits" fill="#0284c7" radius={[4, 4, 0, 0]} name="Kits / Packs" />
                </BarChart>
              </ResponsiveContainer>
            ) : dashboardScope === 'medicines' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.categoryStats} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '12px',
                      border: 'none',
                      padding: '8px 12px',
                    }}
                  />
                  <Bar dataKey="stock" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Units in Stock" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              /* Combined Unified Chart */
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    ...data.categoryStats.slice(0, 4).map(c => ({
                      name: `💊 ${c.name}`,
                      stock: c.stock,
                      type: 'Medicine',
                    })),
                    ...(data.departmentReagentStats || []).slice(0, 4).map(d => ({
                      name: `🧪 ${d.name}`,
                      stock: d.stockKits * 10, // normalized visual scale
                      rawTests: d.testsAvailable,
                      rawKits: d.stockKits,
                      type: 'Reagent',
                    })),
                  ]}
                  margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '12px',
                      border: 'none',
                      padding: '8px 12px',
                    }}
                    formatter={(value: any, _name: any, item: any) => {
                      if (item.payload.type === 'Reagent') {
                        return [`${item.payload.rawKits} Kits (${item.payload.rawTests.toLocaleString()} Tests)`, 'Reagent Stock'];
                      }
                      return [`${value} Units`, 'Medicine Stock'];
                    }}
                  />
                  <Bar dataKey="stock" fill="#0284c7" radius={[4, 4, 0, 0]} name="Stock Index" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right Chart: Batch Health & Quality Assurance */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="mb-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800">
                {dashboardScope === 'reagents' ? 'Reagent Stability & QC' : 'Batch Health & Expiry'}
              </h3>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {dashboardScope === 'reagents' ? `${cards.totalReagentKits || 0} Lots` : `${cards.totalBatches} Lots`}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {dashboardScope === 'reagents'
                ? 'Open vial integrity, sealed stock & QC calibration'
                : 'Shelf-life expiration status and stock readiness'}
            </p>
          </div>

          <div className="h-44 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={
                    dashboardScope === 'reagents' && data.reagentStatusBreakdown
                      ? data.reagentStatusBreakdown
                      : data.batchStatusBreakdown
                  }
                  cx="50%"
                  cy="50%"
                  innerRadius={46}
                  outerRadius={66}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {(dashboardScope === 'reagents' && data.reagentStatusBreakdown
                    ? data.reagentStatusBreakdown
                    : data.batchStatusBreakdown
                  ).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
            {(dashboardScope === 'reagents' && data.reagentStatusBreakdown
              ? data.reagentStatusBreakdown
              : data.batchStatusBreakdown
            ).map(item => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-slate-600 text-[11px] truncate">
                  {item.name}: <b className="text-slate-900">{item.value}</b>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Critical Stock, Expiry & Diagnostic Lab Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-1">
        {/* Critical Alerts Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800">Critical Stock & Expiry Alerts</h3>
                <p className="text-[11px] text-slate-500">Immediate clinical restock & QC attention triggers</p>
              </div>
            </div>

            {/* Filter Pill */}
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setAlertsTab('all')}
                className={`px-2 py-0.5 rounded font-bold ${
                  alertsTab === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                All ({data.lowStockList.length + (data.lowStockReagentsList?.length || 0) + data.expiringBatchesList.length})
              </button>
              <button
                onClick={() => setAlertsTab('medicines')}
                className={`px-2 py-0.5 rounded font-bold ${
                  alertsTab === 'medicines' ? 'bg-indigo-600 text-white' : 'text-slate-600'
                }`}
              >
                Medicines ({data.lowStockList.length})
              </button>
              <button
                onClick={() => setAlertsTab('reagents')}
                className={`px-2 py-0.5 rounded font-bold ${
                  alertsTab === 'reagents' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                }`}
              >
                Reagents ({(data.lowStockReagentsList?.length || 0) + (data.expiringReagentsList?.length || 0)})
              </button>
            </div>
          </div>

          <div className="p-0 overflow-y-auto max-h-88">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] text-slate-500 uppercase bg-slate-50/50 border-b border-slate-100 font-bold">
                <tr>
                  <th className="px-4 py-2.5">Item & Discipline</th>
                  <th className="px-3 py-2.5">Department / Cat</th>
                  <th className="px-3 py-2.5 text-right">Available</th>
                  <th className="px-4 py-2.5 text-right">Alert Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Reagent Low Stock */}
                {(alertsTab === 'all' || alertsTab === 'reagents') &&
                  (data.lowStockReagentsList || []).map(reag => (
                    <tr key={`reag-low-${reag.id}`} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <FlaskConical className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{reag.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono pl-5">{reag.baseNumber}</div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          {reag.department}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-rose-600">
                        <div>{reag.currentStock} / {reag.minStockLevel} kits</div>
                        <div className="text-[10px] text-slate-500 font-normal">({reag.totalTestsRemaining} tests)</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-full uppercase">
                          Low Reagents
                        </span>
                      </td>
                    </tr>
                  ))}

                {/* Medicine Low Stock */}
                {(alertsTab === 'all' || alertsTab === 'medicines') &&
                  data.lowStockList.map(med => (
                    <tr key={`low-${med.id}`} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Pill className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>{med.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono pl-5">{med.baseNumber}</div>
                      </td>
                      <td className="px-3 py-3 text-slate-500 text-xs">
                        {med.categoryName || 'General'}
                      </td>
                      <td className="px-3 py-3 text-rose-600 font-bold text-right text-xs">
                        {med.currentStock} / {med.minStockLevel} {med.unit}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-full uppercase">
                          Low Stock
                        </span>
                      </td>
                    </tr>
                  ))}

                {/* Expiring Batches */}
                {(alertsTab === 'all' || alertsTab === 'medicines') &&
                  data.expiringBatchesList
                    .filter(b => b.itemType !== 'Reagent')
                    .slice(0, 3)
                    .map(batch => (
                      <tr key={`exp-${batch.id}`} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 flex items-center gap-1.5">
                            <Pill className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span>{batch.medicineName}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono pl-5">Lot: {batch.batchNumber}</div>
                        </td>
                        <td className="px-3 py-3 text-slate-500 text-xs font-mono">
                          Pharma
                        </td>
                        <td className="px-3 py-3 text-slate-700 text-right text-xs font-bold">
                          {batch.currentQuantity} units
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full uppercase">
                            Exp {formatMonthYear(batch.expiryDate)}
                          </span>
                        </td>
                      </tr>
                    ))}

                {/* Expiring Reagents & Open Vials */}
                {(alertsTab === 'all' || alertsTab === 'reagents') &&
                  (data.expiringReagentsList || []).slice(0, 3).map(reagLot => (
                    <tr key={`reag-exp-${reagLot.id}`} className="hover:bg-amber-50/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <FlaskConical className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{reagLot.reagentName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono pl-5">Lot: {reagLot.batchNumber}</div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-[10px] text-slate-600 font-medium">{reagLot.department}</span>
                      </td>
                      <td className="px-3 py-3 text-slate-700 text-right text-xs font-bold">
                        <div>{reagLot.currentQuantity} kits</div>
                        <div className="text-[10px] text-slate-500 font-normal">({reagLot.totalTestsRemaining} tests)</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full uppercase">
                          {reagLot.isOpenVial ? `Open Vial Exp: ${formatMonthYear(reagLot.openVialExpiryDate)}` : `Exp: ${formatMonthYear(reagLot.expiryDate)}`}
                        </span>
                      </td>
                    </tr>
                  ))}

                {data.lowStockList.length === 0 &&
                  (data.lowStockReagentsList?.length || 0) === 0 &&
                  data.expiringBatchesList.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-xs text-slate-500">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                        <span className="font-bold text-slate-800 block">All inventory levels and reagent lots healthy</span>
                        No active stock thresholds or batch expirations detected.
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Integrated Activity Feed */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-sky-100 text-sky-700 rounded-lg">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800">Recent Clinical & Lab Activity</h3>
                <p className="text-[11px] text-slate-500">Dispensing, diagnostic tests run, & audit logs</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('audit')}
              className="text-xs text-sky-600 font-bold hover:underline"
            >
              Audit Trail
            </button>
          </div>

          <div className="p-4 space-y-3 max-h-88 overflow-y-auto">
            {/* Show Recent Reagent Consumptions if any */}
            {(data.recentReagentConsumptions || []).slice(0, 3).map((rc, idx) => (
              <div key={rc.id || `rc-${idx}`} className="flex gap-3 text-xs p-2 rounded-xl bg-emerald-50/40 border border-emerald-100">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <FlaskConical className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900">
                      🧪 {rc.testName}
                    </p>
                    <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-1.5 py-0.2 rounded">
                      {rc.testsConsumed} tests
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Reagent: <strong>{rc.reagentName}</strong> • {rc.department}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {new Date(rc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • By {rc.performedByUserName}
                  </p>
                </div>
              </div>
            ))}

            {/* General Activity */}
            {data.recentActivity.slice(0, 5).map((act, idx) => {
              const isPurchase = act.action === 'Purchase';
              const isDispense = act.action === 'Dispense';
              const isCorrection = act.action === 'Stock Update' || act.action === 'Update';

              return (
                <div key={act.id || idx} className="flex gap-3 text-xs p-2 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isDispense
                        ? 'bg-sky-50 text-sky-600'
                        : isPurchase
                        ? 'bg-emerald-50 text-emerald-600'
                        : isCorrection
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-indigo-50 text-indigo-600'
                    }`}
                  >
                    {isDispense ? (
                      <Syringe className="w-4 h-4" />
                    ) : isPurchase ? (
                      <ShoppingCart className="w-4 h-4" />
                    ) : isCorrection ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <UserCheck className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 leading-tight">
                      {act.action} Action
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{act.description}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {act.userName}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
