import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StockTransaction, StockMovement } from '../types';
import { formatMonthYear } from '../utils/formatters';
import {
  Layers,
  Search,
  AlertTriangle,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

export const InventoryView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'transactions' | 'movements'>('matrix');
  const [items, setItems] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'lowStock' | 'expiringSoon' | 'expired'>('all');

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'matrix') {
        const res = await api.getInventoryItems({
          search,
          filterType:
            filterType === 'lowStock'
              ? 'low-stock'
              : filterType === 'expiringSoon'
              ? 'expiring-soon'
              : filterType === 'expired'
              ? 'expired'
              : undefined,
        });
        if (res.success) setItems(res.items);
      } else if (activeTab === 'transactions') {
        const res = await api.getStockTransactions({ search });
        if (res.success) setTransactions(res.transactions);
      } else {
        const res = await api.getStockMovements({ search });
        if (res.success) setMovements(res.movements);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, search, filterType]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Hospital Inventory & Movement Logs
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700">
              Audit-Enforced Stock Ledger
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Automated stock increments and decrements with full transactional lineage.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md border border-slate-200 text-xs">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3 py-1.5 rounded font-medium transition-all ${
              activeTab === 'matrix'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Consolidated Matrix
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3 py-1.5 rounded font-medium transition-all ${
              activeTab === 'transactions'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Stock Transactions
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`px-3 py-1.5 rounded font-medium transition-all ${
              activeTab === 'movements'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Movement Audit Trail
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search medicine, base number, batch code, or transaction number..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-sky-500 focus:outline-none"
          />
        </div>

        {activeTab === 'matrix' && (
          <div className="flex items-center gap-1 overflow-x-auto text-xs bg-slate-100 p-1 rounded-md border border-slate-200">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                filterType === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Items
            </button>
            <button
              onClick={() => setFilterType('lowStock')}
              className={`px-2.5 py-1 rounded font-medium transition-all flex items-center gap-1 ${
                filterType === 'lowStock'
                  ? 'bg-rose-50 text-rose-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              Low Stock
            </button>
            <button
              onClick={() => setFilterType('expiringSoon')}
              className={`px-2.5 py-1 rounded font-medium transition-all flex items-center gap-1 ${
                filterType === 'expiringSoon'
                  ? 'bg-amber-50 text-amber-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3 h-3 text-amber-600" />
              Expiring Soon
            </button>
            <button
              onClick={() => setFilterType('expired')}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                filterType === 'expired'
                  ? 'bg-red-100 text-red-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Expired
            </button>
          </div>
        )}
      </div>

      {/* Tab 1: Consolidated Matrix */}
      {activeTab === 'matrix' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Medicine & Formulation</th>
                  <th className="py-3 px-3">Base Code</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 text-right">Available Stock</th>
                  <th className="py-3 px-3 text-right">Min Threshold</th>
                  <th className="py-3 px-3 text-center">Batch Count</th>
                  <th className="py-3 px-3 text-center">Earliest Expiry (MM/YY)</th>
                  <th className="py-3 px-4 text-center">Stock Condition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Loading consolidated stock matrix...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No inventory records match current filter.
                    </td>
                  </tr>
                ) : (
                  items.map(item => {
                    const rowKey = item.medicineId || item.id || item.baseNumber;
                    const isExpired = item.hasExpired || item.stockCondition === 'Expired Batches Present';
                    const isExpiring = item.hasExpiringSoon || item.stockCondition === 'Expiring Soon';
                    const isLow = item.isLowStock || item.stockCondition === 'Low Stock';
                    const currentStock = item.currentStock ?? item.totalStock ?? 0;
                    const batchCount = item.batches ? item.batches.length : (item.batchCount ?? 0);
                    const earliestExp = item.earliestExpiry && item.earliestExpiry !== 'N/A' ? item.earliestExpiry : null;

                    return (
                      <tr key={rowKey} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{item.medicineName || item.name}</div>
                          <div className="text-[11px] text-slate-500">{item.genericName}</div>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">
                          {item.baseNumber}
                        </td>
                        <td className="py-3 px-3">{item.categoryName}</td>
                        <td className="py-3 px-3 text-right font-black text-slate-900">
                          {currentStock} {item.unit}s
                        </td>
                        <td className="py-3 px-3 text-right text-slate-500 font-medium">
                          {item.minStockLevel} {item.unit}s
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-700">
                          {batchCount}
                        </td>
                        <td className="py-3 px-3 text-center font-medium">
                          {earliestExp ? (
                            <span className="font-semibold text-slate-800">
                              {formatMonthYear(earliestExp)}
                            </span>
                          ) : (
                            <span className="text-slate-400">No Batches</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isExpired
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : isExpiring
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : isLow
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {isExpired
                              ? 'Expired Batches'
                              : isExpiring
                              ? 'Expiring Soon'
                              : isLow
                              ? 'Low Stock'
                              : 'Healthy'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Stock Transactions */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Txn #</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Medicine & Batch</th>
                  <th className="py-3 px-3 text-right">Delta Qty</th>
                  <th className="py-3 px-3 text-right">Before → After</th>
                  <th className="py-3 px-3">Reference #</th>
                  <th className="py-3 px-3">Staff</th>
                  <th className="py-3 px-4">Remarks / Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Loading transactions ledger...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No stock transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {t.transactionNumber}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                            t.transactionType === 'Dispense'
                              ? 'bg-emerald-100 text-emerald-800'
                              : t.transactionType === 'Purchase'
                              ? 'bg-sky-100 text-sky-800'
                              : t.transactionType === 'Return'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {t.transactionType}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{t.medicineName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Batch: {t.batchNumber}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-black">
                        <span
                          className={
                            t.quantity > 0 ? 'text-emerald-700' : 'text-rose-700'
                          }
                        >
                          {t.quantity > 0 ? `+${t.quantity}` : t.quantity}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {t.quantityBefore} → <span className="font-bold text-slate-900">{t.quantityAfter}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700">
                        {t.referenceNumber || '-'}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800">
                        {t.userName}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-800">{t.remarks || 'Standard update'}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(t.date).toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Stock Movements Trail */}
      {activeTab === 'movements' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Movement #</th>
                  <th className="py-3 px-3">Medicine</th>
                  <th className="py-3 px-3">Batch Code</th>
                  <th className="py-3 px-3">Movement Type</th>
                  <th className="py-3 px-3 text-right">In (+)</th>
                  <th className="py-3 px-3 text-right">Out (-)</th>
                  <th className="py-3 px-3 text-right">Balance After</th>
                  <th className="py-3 px-3">Responsible User</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Loading movements log...
                    </td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      No movement trails recorded.
                    </td>
                  </tr>
                ) : (
                  movements.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {m.movementNumber}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {m.medicineName}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700">
                        {m.batchNumber}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-800">
                          {m.movementType}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-700">
                        {m.quantityIn > 0 ? `+${m.quantityIn}` : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-rose-700">
                        {m.quantityOut > 0 ? `-${m.quantityOut}` : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900">
                        {m.balanceAfter}
                      </td>
                      <td className="py-3 px-3 text-slate-700">{m.userName}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
