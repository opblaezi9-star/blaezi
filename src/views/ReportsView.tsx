import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { formatMonthYear } from '../utils/formatters';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Layers,
  Clock,
  ShoppingCart,
  Syringe,
  RotateCcw,
  TrendingUp,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const [reportType, setReportType] = useState<
    'inventory' | 'expiry' | 'purchases' | 'dispensing' | 'movement' | 'returns'
  >('inventory');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await api.getReport(reportType, { startDate, endDate });
      if (res.success) {
        setReportData(res.report);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, startDate, endDate]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!reportData || !reportData.data || reportData.data.length === 0) return;

    const data = reportData.data;
    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = headers.map(header => {
        let val = row[header];
        if (header.toLowerCase().includes('expiry') || header.toLowerCase().includes('manufacturing') || header === 'mfgDate') {
          val = formatMonthYear(val);
        }
        const escaped = ('' + (val !== null && val !== undefined ? val : '')).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Hospital Pharmacy Analytics & Reports
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700">
              Export & Compliance
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Generate audit-ready reports for inventory, expiry, purchases, patient dispensing, and movements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition-all"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* Report Selector Pills & Date Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        {/* Pills */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs bg-slate-100 p-1 rounded-xl border border-slate-200">
          {[
            { id: 'inventory', label: 'Consolidated Stock', icon: Layers },
            { id: 'expiry', label: 'Expiry Tracker', icon: Clock },
            { id: 'purchases', label: 'Purchase Invoices', icon: ShoppingCart },
            { id: 'dispensing', label: 'Dispensing Ledger', icon: Syringe },
            { id: 'movement', label: 'Stock Movements', icon: TrendingUp },
            { id: 'returns', label: 'Returns & Recalls', icon: RotateCcw },
          ].map(tab => {
            const Icon = tab.icon;
            const active = reportType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setReportType(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  active
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Dates */}
        {(reportType === 'purchases' ||
          reportType === 'dispensing' ||
          reportType === 'movement' ||
          reportType === 'returns') && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
            />
            <span className="text-slate-400 font-semibold">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>
        )}
      </div>

      {/* Report Header for Print */}
      <div className="hidden print:block mb-6 text-center border-b pb-4">
        <h2 className="text-lg font-black text-slate-900">
          SmartPharmacy Hospital Management System
        </h2>
        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">
          {reportData?.title || 'System Audit Report'}
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          Generated on: {new Date().toLocaleString()}
        </p>
      </div>

      {/* Summary Cards if available */}
      {reportData?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
          {Object.entries(reportData.summary).map(([key, value]) => (
            <div
              key={key}
              className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs"
            >
              <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                {key.replace(/([A-Z])/g, ' $1')}
              </div>
              <div className="text-base font-black text-slate-900 mt-1">
                {typeof value === 'number' && key.toLowerCase().includes('amount')
                  ? `₹${value.toFixed(2)}`
                  : String(value)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                {reportData?.data && reportData.data.length > 0 ? (
                  Object.keys(reportData.data[0]).map(key => (
                    <th key={key} className="py-3 px-3.5">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </th>
                  ))
                ) : (
                  <th className="py-3 px-3.5">Records</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Generating report data...
                  </td>
                </tr>
              ) : !reportData?.data || reportData.data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    No data records matching criteria.
                  </td>
                </tr>
              ) : (
                reportData.data.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    {Object.entries(row).map(([k, v], cellIdx) => (
                      <td key={cellIdx} className="py-2.5 px-3.5">
                        {k.toLowerCase().includes('expiry') || k.toLowerCase().includes('manufacturing') || k === 'mfgDate'
                          ? formatMonthYear(v as string)
                          : typeof v === 'boolean'
                          ? v
                            ? 'Yes'
                            : 'No'
                          : typeof v === 'number' && k.toLowerCase().includes('price')
                          ? `₹${v.toFixed(2)}`
                          : typeof v === 'number' && k.toLowerCase().includes('total')
                          ? `₹${v.toFixed(2)}`
                          : String(v !== null && v !== undefined ? v : '-')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
