import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AuditLog } from '../types';
import {
  ShieldAlert,
  Search,
  Filter,
  Clock,
  User,
  Activity,
  Layers,
  Trash2,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getAuditLogs({
        search,
        module: moduleFilter !== 'all' ? moduleFilter : undefined,
        action: actionFilter !== 'all' ? actionFilter : undefined,
      });
      if (res.success) {
        setLogs(res.auditLogs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search, moduleFilter, actionFilter]);

  const handleClearLogs = async () => {
    try {
      setIsClearing(true);
      const res = await api.clearAuditLogs();
      if (res.success) {
        setLogs(res.auditLogs || []);
        setShowClearModal(false);
        setNotice({ type: 'success', message: 'Audit trail purged and re-initialized with fresh ledger marker.' });
      } else {
        setNotice({ type: 'error', message: res.message || 'Failed to clear audit logs.' });
      }
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to clear audit logs.' });
    } finally {
      setIsClearing(false);
    }
  };

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['Timestamp', 'User', 'Role', 'Module', 'Action', 'Description', 'Record ID', 'IP Address'];
    const rows = logs.map(l => [
      `"${new Date(l.timestamp).toISOString()}"`,
      `"${(l.userName || '').replace(/"/g, '""')}"`,
      `"${(l.userRole || l.role || '').replace(/"/g, '""')}"`,
      `"${(l.module || l.table || '').replace(/"/g, '""')}"`,
      `"${(l.action || '').replace(/"/g, '""')}"`,
      `"${(l.description || l.details || '').replace(/"/g, '""')}"`,
      `"${(l.recordId || l.entityId || '').replace(/"/g, '""')}"`,
      `"${(l.ipAddress || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const modules = [
    'all',
    'Auth',
    'Medicine',
    'Batch',
    'Inventory',
    'Purchase',
    'Dispensing',
    'Return',
    'Patient',
    'Reagent',
    'User',
  ];

  const actions = ['all', 'Login', 'Create', 'Update', 'Delete', 'Dispense', 'Purchase', 'Stock Update', 'System'];

  const isAdmin = user?.role === 'Admin';

  return (
    <div className="space-y-6">
      {/* Notice Banner */}
      {notice && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between border shadow-xs animate-in fade-in ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notice.message}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-slate-700">
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Hospital Compliance & Security Audit Logs
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700">
              Immutable Ledger
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Chronological audit trail tracking all authentications, stock shifts, dispensings, reagent testing, and database modifications.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchLogs}
            id="btn-refresh-audit-logs"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 bg-white border border-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            id="btn-export-audit-logs"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 bg-white border border-slate-200 rounded-xl transition-all shadow-2xs disabled:opacity-40 cursor-pointer"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            Export CSV
          </button>

          {logs.length > 0 && (
            <button
              onClick={() => setShowClearModal(true)}
              id="btn-clear-audit-logs"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-xl transition-all shadow-2xs cursor-pointer"
              title="Clear all recorded compliance audit logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Logs
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search action, description, username, record ID, or IP..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Action filter */}
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-hidden"
          >
            <option value="all">All Actions</option>
            {actions.filter(a => a !== 'all').map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* Module filter pills */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs bg-slate-100 p-1 rounded-xl border border-slate-200 max-w-full">
            {modules.map(mod => (
              <button
                key={mod}
                onClick={() => setModuleFilter(mod)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all uppercase text-[10px] tracking-wider whitespace-nowrap ${
                  moduleFilter === mod
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mod}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-3">User & Role</th>
                <th className="py-3 px-3">Module / Table</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-4">Description & Context</th>
                <th className="py-3 px-3 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                      <span>Loading security and audit logs...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No audit records match the current filter.
                  </td>
                </tr>
              ) : (
                logs.map(log => {
                  const actionColor =
                    log.action === 'Delete'
                      ? 'bg-rose-100 text-rose-700 border-rose-200'
                      : log.action === 'Create'
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      : log.action === 'Update' || log.action === 'Stock Update'
                      ? 'bg-amber-100 text-amber-700 border-amber-200'
                      : log.action === 'Dispense'
                      ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200';

                  const moduleName = log.module || log.table || 'System';
                  const userRole = log.userRole || log.role || 'Staff';
                  const description = log.description || log.details || '';
                  const recordId = log.recordId || log.entityId || '';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>

                      {/* User */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{log.userName || 'System'}</div>
                        <div className="text-[10px] text-slate-400">{userRole}</div>
                      </td>

                      {/* Module */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wider">
                          {moduleName}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${actionColor}`}>
                          {log.action}
                        </span>
                      </td>

                      {/* Details */}
                      <td className="py-3 px-4 text-slate-600 max-w-md">
                        <span>{description}</span>
                        {recordId && (
                          <span className="ml-1 text-[10px] font-mono text-slate-400">
                            (ID: {recordId})
                          </span>
                        )}
                      </td>

                      {/* IP */}
                      <td className="py-3 px-3 text-right font-mono text-[11px] text-slate-400">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: CLEAR AUDIT LOGS */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                Clear & Purge Audit Logs?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-6">
                Are you sure you want to clear <strong>{logs.length}</strong> recorded hospital audit trail entries? A single administrative log record will be created to document this action.
              </p>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isClearing}
                  onClick={() => setShowClearModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="btn-confirm-clear-audit"
                  disabled={isClearing}
                  onClick={handleClearLogs}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl transition-colors shadow-xs disabled:opacity-50"
                >
                  {isClearing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Purging Logs...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Yes, Clear Audit Trail</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
