import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { MedicineReturn, MedicineBatch, Patient, Supplier } from '../types';
import { useAuth } from '../context/AuthContext';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { formatMonthYear } from '../utils/formatters';
import {
  RotateCcw,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  Boxes,
  Truck,
  Users2,
  Trash2,
} from 'lucide-react';

export const ReturnsView: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [returns, setReturns] = useState<MedicineReturn[]>([]);
  const [batches, setBatches] = useState<MedicineBatch[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingReturn, setDeletingReturn] = useState<MedicineReturn | null>(null);

  // Return Processing Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [returnType, setReturnType] = useState<'Patient Return' | 'Supplier Return'>('Patient Return');
  const [formData, setFormData] = useState({
    referenceNumber: '',
    patientId: '',
    supplierId: '',
    reason: 'Unused prescription returned by patient',
    items: [
      {
        batchId: '',
        quantity: 5,
        reason: 'Unused medicine',
        restockAction: 'Restocked' as 'Restocked' | 'Quarantined' | 'Disposed',
      },
    ],
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [retRes, batRes, patRes, supRes] = await Promise.all([
        api.getReturns({ search }),
        api.getBatches(),
        api.getPatients(),
        api.getSuppliers(),
      ]);

      if (retRes.success) setReturns(retRes.returns);
      if (batRes.success) setBatches(batRes.batches);
      if (patRes.success) setPatients(patRes.patients);
      if (supRes.success) setSuppliers(supRes.suppliers);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const handleOpenAdd = () => {
    setFormData({
      referenceNumber: `REF-${Date.now().toString().slice(-4)}`,
      patientId: patients[0]?.id || '',
      supplierId: suppliers[0]?.id || '',
      reason:
        returnType === 'Patient Return'
          ? 'Unused prescription medication returned by patient'
          : 'Recall / Defective batch returned to distributor',
      items: [
        {
          batchId: batches[0]?.id || '',
          quantity: 5,
          reason: returnType === 'Patient Return' ? 'Unopened seal' : 'Defective lot packaging',
          restockAction: returnType === 'Patient Return' ? 'Restocked' : 'Quarantined',
        },
      ],
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleAddItemRow = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          batchId: batches[0]?.id || '',
          quantity: 2,
          reason: 'Return item',
          restockAction: 'Restocked',
        },
      ],
    }));
  };

  const handleRemoveItemRow = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleUpdateItemRow = (idx: number, field: string, value: any) => {
    setFormData(prev => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...prev, items };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      setErrorMsg('Please specify at least one batch item for return.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      await api.processReturn({
        returnType,
        ...formData,
      });

      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process return.');
    } finally {
      setSubmitting(false);
    }
  };

  const isDoctor = false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Medicine Returns & Restocking
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700">
              {returns.length} Return Entries
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Handle patient returns and distributor recalls with automated inventory adjustment.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Process New Return
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search return #, patient, supplier, or reference #..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Return #</th>
                <th className="py-3 px-3">Return Type</th>
                <th className="py-3 px-3">Patient / Supplier</th>
                <th className="py-3 px-3">Ref #</th>
                <th className="py-3 px-3 text-center">Items (Units)</th>
                <th className="py-3 px-3">Reason</th>
                <th className="py-3 px-3">Processed By</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Loading return records...
                  </td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No medicine return records found.
                  </td>
                </tr>
              ) : (
                returns.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {r.returnNumber}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.returnType === 'Patient Return'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {r.returnType}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {r.patientName || r.supplierName || 'Hospital Unit'}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {r.referenceNumber || '-'}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800">
                      {r.itemCount || 0} meds ({r.totalQuantity || 0} units)
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                      {r.reason}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800">
                      {r.processedByName}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setDeletingReturn(r)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center"
                        title="Delete Return Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Return Processing Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 text-purple-800 rounded-lg">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Process Medicine Return</h3>
                  <p className="text-xs text-slate-500">Adjust stock or quarantine returned lots</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Return Origin Type *</label>
                  <select
                    value={returnType}
                    onChange={e => setReturnType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    <option value="Patient Return">Patient Return</option>
                    <option value="Supplier Return">Supplier Return (Recall/Defect)</option>
                  </select>
                </div>

                {returnType === 'Patient Return' ? (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Select Patient *</label>
                    <select
                      value={formData.patientId}
                      onChange={e => setFormData({ ...formData, patientId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      required
                    >
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.patientId})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Select Supplier *</label>
                    <select
                      value={formData.supplierId}
                      onChange={e => setFormData({ ...formData, supplierId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      required
                    >
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reference Dispense / Invoice #</label>
                <input
                  type="text"
                  value={formData.referenceNumber}
                  onChange={e => setFormData({ ...formData, referenceNumber: e.target.value })}
                  placeholder="e.g. DISP-2026-001 or INV-449"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Return Items
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="px-2.5 py-1 bg-slate-800 text-white rounded-lg text-[11px] font-semibold hover:bg-slate-900 inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Batch Item
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Batch / Medicine</th>
                        <th className="p-2.5 w-24 text-right">Return Qty</th>
                        <th className="p-2.5">Stock Action</th>
                        <th className="p-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2">
                            <select
                              value={item.batchId}
                              onChange={e => handleUpdateItemRow(idx, 'batchId', e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                            >
                              {batches.map(b => (
                                <option key={b.id} value={b.id}>
                                  {b.medicineName} ({b.batchNumber}) - Exp: {formatMonthYear(b.expiryDate)}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={e =>
                                handleUpdateItemRow(
                                  idx,
                                  'quantity',
                                  parseInt(e.target.value, 10) || 0
                                )
                              }
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-right font-bold"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={item.restockAction}
                              onChange={e =>
                                handleUpdateItemRow(idx, 'restockAction', e.target.value)
                              }
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                            >
                              <option value="Restocked">Restock (+ Inventory)</option>
                              <option value="Quarantined">Quarantine / Isolation</option>
                              <option value="Disposed">Disposed / Biohazard</option>
                            </select>
                          </td>
                          <td className="p-2 text-center">
                            {formData.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(idx)}
                                className="text-slate-400 hover:text-rose-600 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason / Notes</label>
                <textarea
                  rows={2}
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : 'Confirm Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Return Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingReturn}
        title="Delete Medicine Return"
        itemName={deletingReturn ? `Return #${deletingReturn.returnNumber} (${deletingReturn.returnType})` : undefined}
        message="Are you sure you want to delete this return record? This will remove the return audit transaction."
        confirmText="Yes, Delete Return"
        onCancel={() => setDeletingReturn(null)}
        onConfirm={async () => {
          if (!deletingReturn) return;
          await api.deleteReturn(deletingReturn.id);
          setDeletingReturn(null);
          await fetchData();
        }}
      />
    </div>
  );
};
