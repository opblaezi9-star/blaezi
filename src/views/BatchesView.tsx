import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { MedicineBatch, Medicine, Supplier } from '../types';
import { useAuth } from '../context/AuthContext';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { formatMonthYear, toMonthInputValue, monthInputToIso } from '../utils/formatters';
import {
  Boxes,
  Pill,
  FlaskConical,
  Plus,
  Search,
  Sliders,
  Clock,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  X,
  RefreshCw,
  Edit3,
  Calendar,
  DollarSign,
  AlertTriangle,
  FileSpreadsheet,
  ThermometerSnowflake,
  Sparkles,
  ShieldCheck,
  Check,
  TestTubes,
  Trash2,
} from 'lucide-react';

export const BatchesView: React.FC = () => {
  const { user } = useAuth();
  const [activeSegment, setActiveSegment] = useState<'medicines' | 'reagents' | 'all'>('medicines');
  const [batches, setBatches] = useState<MedicineBatch[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [reagents, setReagents] = useState<Medicine[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deletingBatch, setDeletingBatch] = useState<MedicineBatch | null>(null);

  // Add Batch Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormType, setAddFormType] = useState<'Medicine' | 'Reagent'>('Medicine');
  const [addFormData, setAddFormData] = useState({
    medicineId: '',
    batchNumber: '',
    manufacturingDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
    quantityReceived: 100,
    purchasePrice: 10,
    sellingPrice: 15,
    supplierId: '',
    testsPerUnit: 100,
    storageLocation: '2°C - 8°C (Cold Storage)',
    qcStatus: 'QC Passed' as any,
  });
  const [addError, setAddError] = useState<string | null>(null);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Stock Adjustment / Spoilage Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustMode, setAdjustMode] = useState<'adjust' | 'spoilage'>('adjust');
  const [selectedBatchForAdjust, setSelectedBatchForAdjust] = useState<MedicineBatch | null>(null);
  const [adjustData, setAdjustData] = useState({
    newQuantity: 0,
    remarks: '',
    reason: 'Physical Stock Count Discrepancy',
  });
  const [spoilageData, setSpoilageData] = useState({
    quantity: 1,
    reason: 'Expired' as 'Expired' | 'Damaged / Broken' | 'Contaminated' | 'Temperature Excursion' | 'Quarantine / Recall',
    disposalMethod: 'Incineration',
    witnessName: '',
    notes: '',
  });
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  // QC Update Modal
  const [qcModalBatch, setQcModalBatch] = useState<MedicineBatch | null>(null);
  const [qcUpdateData, setQcUpdateData] = useState({
    qcStatus: 'QC Passed',
    qcNotes: '',
  });
  const [submittingQC, setSubmittingQC] = useState(false);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const itemTypeParam =
        activeSegment === 'medicines' ? 'Medicine' : activeSegment === 'reagents' ? 'Reagent' : undefined;

      const [batRes, medRes, reagRes, supRes] = await Promise.all([
        api.getBatches({
          search,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          itemType: itemTypeParam,
        }),
        api.getMedicines(),
        api.getReagents().catch(() => ({ success: false, reagents: [] })),
        api.getSuppliers(),
      ]);

      if (batRes.success) setBatches(batRes.batches);
      if (medRes.success) setMedicines(medRes.medicines);
      if (reagRes.success) setReagents(reagRes.reagents);
      if (supRes.success) setSuppliers(supRes.suppliers);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [activeSegment, search, statusFilter]);

  const handleOpenAdd = (type: 'Medicine' | 'Reagent' = activeSegment === 'reagents' ? 'Reagent' : 'Medicine') => {
    setAddFormType(type);
    const itemList = type === 'Reagent' ? reagents : medicines;
    const firstItem = itemList[0];

    setAddFormData({
      medicineId: firstItem?.id || '',
      batchNumber: type === 'Reagent' ? `LOT-2026-${Date.now().toString().slice(-4)}` : `BAT-2026-${Date.now().toString().slice(-4)}`,
      manufacturingDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
      quantityReceived: type === 'Reagent' ? 5 : 100,
      purchasePrice: type === 'Reagent' ? 1200 : 10,
      sellingPrice: type === 'Reagent' ? 1500 : 15,
      supplierId: suppliers[0]?.id || '',
      testsPerUnit: firstItem?.testsPerUnit || 100,
      storageLocation: firstItem?.storageCondition || '2°C - 8°C (Refrigerated)',
      qcStatus: 'QC Passed',
    });
    setAddError(null);
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormData.medicineId || !addFormData.batchNumber || !addFormData.expiryDate) {
      setAddError('Item, Batch / Lot Number, and Expiry Date are required.');
      return;
    }

    try {
      setSubmittingAdd(true);
      setAddError(null);
      await api.createBatch({
        ...addFormData,
        itemType: addFormType,
      });
      setIsAddModalOpen(false);
      await fetchBatches();
    } catch (err: any) {
      setAddError(err.message || 'Failed to create batch lot.');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleOpenAdjust = (batch: MedicineBatch, mode: 'adjust' | 'spoilage' = 'adjust') => {
    setSelectedBatchForAdjust(batch);
    setAdjustMode(mode);
    setAdjustData({
      newQuantity: batch.currentQuantity,
      remarks: '',
      reason: 'Physical Stock Count Discrepancy',
    });
    setSpoilageData({
      quantity: 1,
      reason: batch.status === 'Expired' ? 'Expired' : 'Damaged / Broken',
      disposalMethod: 'Incineration',
      witnessName: '',
      notes: '',
    });
    setAdjustError(null);
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchForAdjust) return;

    try {
      setSubmittingAdjust(true);
      setAdjustError(null);

      if (adjustMode === 'spoilage') {
        if (spoilageData.quantity <= 0 || spoilageData.quantity > selectedBatchForAdjust.currentQuantity) {
          setAdjustError(`Waste quantity must be between 1 and available stock (${selectedBatchForAdjust.currentQuantity}).`);
          return;
        }
        await api.recordSpoilage({
          batchId: selectedBatchForAdjust.id,
          quantity: spoilageData.quantity,
          reason: spoilageData.reason,
          disposalMethod: spoilageData.disposalMethod,
          witnessName: spoilageData.witnessName || undefined,
          notes: spoilageData.notes || undefined,
        });
      } else {
        await api.adjustBatchStock(selectedBatchForAdjust.id, adjustData);
      }

      setIsAdjustModalOpen(false);
      await fetchBatches();
    } catch (err: any) {
      setAdjustError(err.message || 'Failed to update stock / record waste.');
    } finally {
      setSubmittingAdjust(false);
    }
  };

  const handleUnsealBatch = async (batch: MedicineBatch) => {
    if (!confirm(`Unseal and open lot "${batch.batchNumber}" for active diagnostic testing? This starts open-vial stability tracking.`)) {
      return;
    }
    try {
      const res = await api.unsealReagentBatch({ batchId: batch.id });
      if (res.success) {
        alert(res.message);
        fetchBatches();
      } else {
        alert(res.message || 'Failed to unseal lot.');
      }
    } catch (e: any) {
      alert(e.message || 'Failed to unseal lot.');
    }
  };

  const handleOpenQC = (batch: MedicineBatch) => {
    setQcModalBatch(batch);
    setQcUpdateData({
      qcStatus: batch.qcStatus || 'QC Passed',
      qcNotes: batch.qcNotes || 'Standard calibration curve verified within permissible SD.',
    });
  };

  const handleQCSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qcModalBatch) return;

    try {
      setSubmittingQC(true);
      const res = await api.updateReagentQC({
        batchId: qcModalBatch.id,
        qcStatus: qcUpdateData.qcStatus,
        qcNotes: qcUpdateData.qcNotes,
      });
      if (res.success) {
        setQcModalBatch(null);
        fetchBatches();
      } else {
        alert(res.message || 'Failed to update QC status.');
      }
    } catch (e: any) {
      alert(e.message || 'Failed to update QC status.');
    } finally {
      setSubmittingQC(false);
    }
  };

  const exportBatchesCSV = () => {
    const headers = [
      'Item Type',
      'Batch/Lot #',
      'Item Name',
      'Base Code',
      'Mfg Date',
      'Expiry Date',
      'Quantity Available',
      'Quantity Received',
      'Purchase Price',
      'Selling Price',
      'Supplier',
      'Status',
      'QC Status',
      'Open Vial Status',
    ];

    const rows = batches.map(b => [
      b.itemType || 'Medicine',
      b.batchNumber,
      `"${b.medicineName.replace(/"/g, '""')}"`,
      b.baseNumber,
      formatMonthYear(b.manufacturingDate),
      formatMonthYear(b.expiryDate),
      b.currentQuantity,
      b.quantityReceived,
      b.purchasePrice,
      b.sellingPrice,
      `"${(b.supplierName || 'Direct').replace(/"/g, '""')}"`,
      b.status,
      b.qcStatus || 'N/A',
      b.isOpenVial ? `Open (Exp: ${b.openVialExpiryDate || 'N/A'})` : 'Sealed',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `batches_and_lots_registry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isDoctor = false;
  const canManage = true;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-sm shrink-0">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Batch & Lot Registry
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                FEFO Rotation & Expiry Control
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive lot tracking for dispensary medicines, diagnostic laboratory reagents, shelf-life, and QC verification.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportBatchesCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export CSV
          </button>

          {canManage && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenAdd('Medicine')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Receive Medicine Batch
              </button>

              <button
                onClick={() => handleOpenAdd('Reagent')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Receive Reagent Lot
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Primary Category Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveSegment('medicines')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSegment === 'medicines'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Pill className="w-4 h-4 text-emerald-600" />
            <span>Medicine Batches</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
              {activeSegment === 'medicines' ? batches.length : 'Dispensary'}
            </span>
          </button>

          <button
            onClick={() => setActiveSegment('reagents')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSegment === 'reagents'
                ? 'bg-white text-sky-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FlaskConical className="w-4 h-4 text-sky-600" />
            <span>Laboratory Reagent Lots</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-100 text-sky-800">
              {activeSegment === 'reagents' ? batches.length : 'Lab & QC'}
            </span>
          </button>

          <button
            onClick={() => setActiveSegment('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSegment === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-4 h-4 text-slate-600" />
            <span>All Batches (Unified)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
              {activeSegment === 'all' ? batches.length : 'All'}
            </span>
          </button>
        </div>

        {/* Search & Status Pill Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${activeSegment === 'reagents' ? 'reagent lot or test' : 'batch number'}...`}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto text-xs bg-slate-100 p-1 rounded-xl">
            {[
              { id: 'all', label: 'All' },
              { id: 'Available', label: 'Available' },
              { id: 'Expiring Soon', label: 'Expiring Soon' },
              { id: 'Expired', label: 'Expired' },
              { id: 'Depleted', label: 'Depleted' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-3">Batch / Lot #</th>
                <th className="py-3 px-3">Item & Base Code</th>
                <th className="py-3 px-3">Manufacturing & Expiry</th>
                {activeSegment === 'reagents' && <th className="py-3 px-3">Open-Vial Stability</th>}
                <th className="py-3 px-3 text-right">
                  {activeSegment === 'reagents' ? 'Available Kits (Yield)' : 'Available / Received'}
                </th>
                {activeSegment === 'reagents' ? (
                  <th className="py-3 px-3 text-center">QC & Calibration</th>
                ) : (
                  <th className="py-3 px-3 text-right">Buy / Sell Price</th>
                )}
                <th className="py-3 px-3">Storage / Supplier</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    Loading registry lots...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <Boxes className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No batches or lots found matching your criteria.
                  </td>
                </tr>
              ) : (
                batches.map(b => {
                  const isReagent = b.itemType === 'Reagent';
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Item Type Tag */}
                      <td className="py-3 px-4">
                        {isReagent ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                            <FlaskConical className="w-3 h-3 text-sky-600" />
                            Reagent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <Pill className="w-3 h-3 text-emerald-600" />
                            Medicine
                          </span>
                        )}
                      </td>

                      {/* Batch Number */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-slate-900">{b.batchNumber}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{b.id}</div>
                      </td>

                      {/* Item Name */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{b.medicineName}</div>
                        <div className="text-[11px] text-slate-500 font-mono font-semibold">
                          {b.baseNumber}
                        </div>
                      </td>

                      {/* Mfg & Expiry */}
                      <td className="py-3 px-3">
                        <div
                          className={`font-bold ${
                            b.status === 'Expired'
                              ? 'text-rose-700'
                              : b.status === 'Expiring Soon'
                              ? 'text-orange-700'
                              : 'text-slate-800'
                          }`}
                        >
                          Exp: {formatMonthYear(b.expiryDate)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">Mfg: {formatMonthYear(b.manufacturingDate)}</div>
                      </td>

                      {/* Open-Vial Column (for reagents) */}
                      {activeSegment === 'reagents' && (
                        <td className="py-3 px-3">
                          {b.isOpenVial ? (
                            <div className="space-y-0.5">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                  b.isOpenVialExpired
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}
                              >
                                <Clock className="w-3 h-3" />
                                {b.isOpenVialExpired ? 'Open Vial Expired' : 'Unsealed / Active'}
                              </span>
                              <div className="text-[10px] text-slate-500">
                                Stability: {b.openVialExpiryDate || 'N/A'}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                              <ShieldCheck className="w-3 h-3 text-slate-400" />
                              Factory Sealed
                            </span>
                          )}
                        </td>
                      )}

                      {/* Quantity / Yield */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-black text-slate-900">
                          {b.currentQuantity}{' '}
                          <span className="text-slate-400 font-normal">/ {b.quantityReceived}</span>
                        </div>
                        {isReagent && b.testsPerUnit && (
                          <div className="text-[10px] text-sky-700 font-semibold">
                            ~{b.currentQuantity * b.testsPerUnit} tests yield
                          </div>
                        )}
                      </td>

                      {/* QC Column or Price Column */}
                      {activeSegment === 'reagents' ? (
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              b.qcStatus === 'QC Passed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : b.qcStatus === 'Calibrated'
                                ? 'bg-blue-100 text-blue-800'
                                : b.qcStatus === 'Pending QC'
                                ? 'bg-amber-100 text-amber-800'
                                : b.qcStatus === 'Failed QC'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {b.qcStatus === 'QC Passed' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                            {b.qcStatus === 'Calibrated' && <Sparkles className="w-3 h-3 text-blue-600" />}
                            {b.qcStatus === 'Pending QC' && <Clock className="w-3 h-3 text-amber-600" />}
                            {b.qcStatus === 'Failed QC' && <XCircle className="w-3 h-3 text-rose-600" />}
                            {b.qcStatus || 'QC Passed'}
                          </span>
                        </td>
                      ) : (
                        <td className="py-3 px-3 text-right font-medium">
                          <div>₹{b.sellingPrice} <span className="text-[10px] text-slate-400">(sell)</span></div>
                          <div className="text-[11px] text-slate-400">₹{b.purchasePrice} (buy)</div>
                        </td>
                      )}

                      {/* Storage / Supplier */}
                      <td className="py-3 px-3 text-slate-600">
                        {isReagent && b.storageLocation ? (
                          <div className="flex items-center gap-1 text-[11px] text-slate-700">
                            <ThermometerSnowflake className="w-3 h-3 text-blue-600 shrink-0" />
                            <span className="truncate max-w-[120px]">{b.storageLocation}</span>
                          </div>
                        ) : (
                          <div className="truncate max-w-[120px]">{b.supplierName || 'Central Supply'}</div>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            b.status === 'Available'
                              ? 'bg-emerald-100 text-emerald-800'
                              : b.status === 'Expiring Soon'
                              ? 'bg-orange-100 text-orange-800'
                              : b.status === 'Expired'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isReagent && !b.isOpenVial && b.currentQuantity > 0 && !isDoctor && (
                            <button
                              onClick={() => handleUnsealBatch(b)}
                              className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-[10px] font-bold transition-colors"
                              title="Unseal kit for active clinical testing"
                            >
                              Unseal
                            </button>
                          )}

                          {isReagent && !isDoctor && (
                            <button
                              onClick={() => handleOpenQC(b)}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold transition-colors"
                              title="Update QC / Calibration notes"
                            >
                              QC
                            </button>
                          )}

                          {!isDoctor && (
                            <>
                              <button
                                onClick={() => handleOpenAdjust(b)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                                title="Adjust batch stock or write off spoilage"
                              >
                                <Sliders className="w-3 h-3 text-slate-500" />
                                Adjust
                              </button>
                              <button
                                onClick={() => setDeletingBatch(b)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete batch record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Direct Add Batch Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div
                  className={`p-2 rounded-lg ${
                    addFormType === 'Reagent' ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {addFormType === 'Reagent' ? <FlaskConical className="w-5 h-5" /> : <Boxes className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {addFormType === 'Reagent' ? 'Receive Diagnostic Reagent Lot' : 'Direct Medicine Batch Entry'}
                  </h3>
                  <p className="text-xs text-slate-500">Record a new manufacturer supply lot</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Type selector in modal */}
            <div className="flex rounded-xl border border-slate-200 p-1 bg-slate-50 mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => handleOpenAdd('Medicine')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  addFormType === 'Medicine' ? 'bg-white shadow-xs text-emerald-800 font-bold' : 'text-slate-500'
                }`}
              >
                Medicine Batch
              </button>
              <button
                type="button"
                onClick={() => handleOpenAdd('Reagent')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  addFormType === 'Reagent' ? 'bg-white shadow-xs text-sky-800 font-bold' : 'text-slate-500'
                }`}
              >
                Reagent & Diagnostic Kit Lot
              </button>
            </div>

            {addError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Select {addFormType === 'Reagent' ? 'Reagent / Kit *' : 'Medicine *'}
                </label>
                <select
                  value={addFormData.medicineId}
                  onChange={e => {
                    const selId = e.target.value;
                    const items = addFormType === 'Reagent' ? reagents : medicines;
                    const found = items.find(i => i.id === selId);
                    setAddFormData({
                      ...addFormData,
                      medicineId: selId,
                      testsPerUnit: found?.testsPerUnit || addFormData.testsPerUnit,
                      storageLocation: found?.storageCondition || addFormData.storageLocation,
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                  required
                >
                  {(addFormType === 'Reagent' ? reagents : medicines).map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.baseNumber}) {m.department ? `[${m.department}]` : `[${m.categoryName || ''}]`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {addFormType === 'Reagent' ? 'Lot Number *' : 'Batch Number *'}
                  </label>
                  <input
                    type="text"
                    value={addFormData.batchNumber}
                    onChange={e =>
                      setAddFormData({ ...addFormData, batchNumber: e.target.value.toUpperCase() })
                    }
                    placeholder={addFormType === 'Reagent' ? 'e.g. LOT-BIO-902' : 'e.g. BAT-2026-901'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Supplier</label>
                  <select
                    value={addFormData.supplierId}
                    onChange={e => setAddFormData({ ...addFormData, supplierId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                  >
                    <option value="">Central / Direct Supply</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Manufacturing Date (MM/YY)</label>
                  <input
                    type="month"
                    value={toMonthInputValue(addFormData.manufacturingDate)}
                    onChange={e =>
                      setAddFormData({ ...addFormData, manufacturingDate: monthInputToIso(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expiry Date (MM/YY) *</label>
                  <input
                    type="month"
                    value={toMonthInputValue(addFormData.expiryDate)}
                    onChange={e => setAddFormData({ ...addFormData, expiryDate: monthInputToIso(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {addFormType === 'Reagent' ? 'Kits Received *' : 'Quantity Received *'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={addFormData.quantityReceived}
                    onChange={e =>
                      setAddFormData({
                        ...addFormData,
                        quantityReceived: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={addFormData.purchasePrice}
                    onChange={e =>
                      setAddFormData({
                        ...addFormData,
                        purchasePrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Billable Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={addFormData.sellingPrice}
                    onChange={e =>
                      setAddFormData({
                        ...addFormData,
                        sellingPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {addFormType === 'Reagent' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-sky-50/70 border border-sky-200 rounded-xl">
                  <div>
                    <label className="block font-bold text-sky-900 mb-1">Tests Yield Per Kit</label>
                    <input
                      type="number"
                      min="1"
                      value={addFormData.testsPerUnit}
                      onChange={e =>
                        setAddFormData({ ...addFormData, testsPerUnit: parseInt(e.target.value, 10) || 100 })
                      }
                      className="w-full px-3 py-1.5 bg-white border border-sky-200 rounded-lg focus:outline-hidden font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-sky-900 mb-1">Baseline QC Verification</label>
                    <select
                      value={addFormData.qcStatus}
                      onChange={e => setAddFormData({ ...addFormData, qcStatus: e.target.value as any })}
                      className="w-full px-3 py-1.5 bg-white border border-sky-200 rounded-lg focus:outline-hidden font-semibold"
                    >
                      <option value="QC Passed">QC Passed (Standard Run)</option>
                      <option value="Calibrated">Calibrated on Analyzer</option>
                      <option value="Pending QC">Pending QC Inspection</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className={`px-4 py-2 text-white font-bold rounded-xl shadow-sm disabled:opacity-50 ${
                    addFormType === 'Reagent'
                      ? 'bg-sky-600 hover:bg-sky-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {submittingAdd ? 'Saving...' : addFormType === 'Reagent' ? 'Register Reagent Lot' : 'Register Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QC & Calibration Update Modal */}
      {qcModalBatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-800 rounded-lg">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">QC & Calibration Verification</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {qcModalBatch.medicineName} ({qcModalBatch.batchNumber})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setQcModalBatch(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQCSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Quality Control Status *</label>
                <select
                  value={qcUpdateData.qcStatus}
                  onChange={e => setQcUpdateData({ ...qcUpdateData, qcStatus: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-hidden font-semibold"
                >
                  <option value="QC Passed">QC Passed - Calibrators & Controls within ±2 SD</option>
                  <option value="Calibrated">Calibrated - Multi-Point Baseline Validated</option>
                  <option value="Pending QC">Pending QC - Awaiting Laboratory Run</option>
                  <option value="Failed QC">Failed QC - Out of Tolerance (Do Not Dispense/Use)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Calibration Standard Notes & Certificate
                </label>
                <textarea
                  rows={3}
                  value={qcUpdateData.qcNotes}
                  onChange={e => setQcUpdateData({ ...qcUpdateData, qcNotes: e.target.value })}
                  placeholder="e.g. Standard Lot #STD-441 verified on Beckman Coulter DXH 800. Slope = 1.002, R² = 0.999."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQcModalBatch(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingQC}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm disabled:opacity-50"
                >
                  {submittingQC ? 'Updating...' : 'Save QC Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment & Spoilage Modal */}
      {isAdjustModalOpen && selectedBatchForAdjust && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {adjustMode === 'adjust' ? 'Inventory Audit Adjustment' : 'Log Waste / Spoilage Write-Off'}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedBatchForAdjust.medicineName} ({selectedBatchForAdjust.batchNumber})
                </p>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex rounded-xl border border-slate-200 p-1 bg-slate-50 mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setAdjustMode('adjust')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  adjustMode === 'adjust' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
                }`}
              >
                Count Adjustment
              </button>
              <button
                type="button"
                onClick={() => setAdjustMode('spoilage')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  adjustMode === 'spoilage' ? 'bg-white shadow-xs text-rose-700' : 'text-slate-500'
                }`}
              >
                Waste & Spoilage Write-off
              </button>
            </div>

            {adjustError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs">
                {adjustError}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Stock in System:</span>
                  <span className="font-bold text-slate-900">
                    {selectedBatchForAdjust.currentQuantity} units
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Expiry Date (MM/YY):</span>
                  <span className="font-medium text-slate-800">
                    {formatMonthYear(selectedBatchForAdjust.expiryDate)}
                  </span>
                </div>
              </div>

              {adjustMode === 'adjust' ? (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      New Adjusted Physical Quantity *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={adjustData.newQuantity}
                      onChange={e =>
                        setAdjustData({
                          ...adjustData,
                          newQuantity: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden text-base font-bold text-slate-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Adjustment Reason *</label>
                    <select
                      value={adjustData.reason}
                      onChange={e => setAdjustData({ ...adjustData, reason: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                    >
                      <option value="Physical Stock Count Discrepancy">
                        Physical Stock Count Discrepancy
                      </option>
                      <option value="Damaged / Broken Packaging">Damaged / Broken Packaging</option>
                      <option value="Expired Stock Quarantine">Expired Stock Quarantine</option>
                      <option value="Hospital Ward Sample Donation">
                        Hospital Ward Sample Donation
                      </option>
                      <option value="Correction of Entry Error">Correction of Entry Error</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Audit Remarks / Justification
                    </label>
                    <textarea
                      rows={2}
                      value={adjustData.remarks}
                      onChange={e => setAdjustData({ ...adjustData, remarks: e.target.value })}
                      placeholder="Enter remarks for the compliance audit log..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Units to Write-off *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={selectedBatchForAdjust.currentQuantity}
                        value={spoilageData.quantity}
                        onChange={e =>
                          setSpoilageData({
                            ...spoilageData,
                            quantity: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-rose-600 focus:outline-hidden text-base font-bold text-rose-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Disposal Protocol *</label>
                      <select
                        value={spoilageData.disposalMethod}
                        onChange={e =>
                          setSpoilageData({ ...spoilageData, disposalMethod: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-rose-600 focus:outline-hidden"
                      >
                        <option value="Incineration">Biohazard Incineration</option>
                        <option value="Chemical Inactivation">Chemical Inactivation</option>
                        <option value="Returned to Manufacturer">Returned to Manufacturer</option>
                        <option value="Secure Landfill / Encapsulation">Secure Encapsulation</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Spoilage Reason *</label>
                    <select
                      value={spoilageData.reason}
                      onChange={e =>
                        setSpoilageData({ ...spoilageData, reason: e.target.value as any })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-rose-600 focus:outline-hidden"
                    >
                      <option value="Expired">Expired Stock</option>
                      <option value="Damaged / Broken">Physical Damage / Broken Vials</option>
                      <option value="Contaminated">Contamination / Compromised Seal</option>
                      <option value="Temperature Excursion">Cold-Chain Temperature Excursion</option>
                      <option value="Quarantine / Recall">Regulatory Recall Quarantine</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Authorized Witness / Disposal Officer
                    </label>
                    <input
                      type="text"
                      value={spoilageData.witnessName}
                      onChange={e =>
                        setSpoilageData({ ...spoilageData, witnessName: e.target.value })
                      }
                      placeholder="e.g. Dr. Sarah Jenkins (Senior QA)"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-rose-600 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Destruction Notes & Certificate #
                    </label>
                    <textarea
                      rows={2}
                      value={spoilageData.notes}
                      onChange={e =>
                        setSpoilageData({ ...spoilageData, notes: e.target.value })
                      }
                      placeholder="e.g. Incident report #IR-2026-88. Autoclaved prior to disposal."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-rose-600 focus:outline-hidden"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                {selectedBatchForAdjust && !isDoctor ? (
                  <button
                    type="button"
                    onClick={() => {
                      const b = selectedBatchForAdjust;
                      setIsAdjustModalOpen(false);
                      setDeletingBatch(b);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 font-bold rounded-xl text-xs transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Batch
                  </button>
                ) : <div />}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAdjustModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAdjust}
                    className={`px-4 py-2 text-white font-bold rounded-xl shadow-sm disabled:opacity-50 ${
                      adjustMode === 'spoilage'
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {submittingAdjust
                      ? 'Processing...'
                      : adjustMode === 'spoilage'
                      ? 'Confirm Spoilage Write-Off'
                      : 'Confirm Stock Adjustment'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Batch Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingBatch}
        title="Delete Batch Record"
        itemName={deletingBatch ? `Batch #${deletingBatch.batchNumber} - ${deletingBatch.medicineName}` : undefined}
        message="Are you sure you want to delete this batch record? This will permanently remove the lot and its remaining quantity from stock."
        warningNote={
          deletingBatch?.currentQuantity && deletingBatch.currentQuantity > 0
            ? `Warning: This batch currently has ${deletingBatch.currentQuantity} active units in inventory.`
            : undefined
        }
        confirmText="Yes, Delete Batch"
        onCancel={() => setDeletingBatch(null)}
        onConfirm={async () => {
          if (!deletingBatch) return;
          await api.deleteBatch(deletingBatch.id);
          setDeletingBatch(null);
          await fetchBatches();
        }}
      />
    </div>
  );
};
