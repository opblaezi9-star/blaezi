import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Medicine, Category } from '../types';
import { useAuth } from '../context/AuthContext';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { formatMonthYear } from '../utils/formatters';
import {
  Pill,
  Search,
  Plus,
  Edit2,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  XCircle,
  X,
  Layers,
  Filter,
  ArrowUpDown,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';

export const MedicinesView: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'lowStock' | 'active'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medicine | null>(null);
  const [deletingMed, setDeletingMed] = useState<Medicine | null>(null);
  const [deletingBatch, setDeletingBatch] = useState<{ med: Medicine; batch: any } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    genericName: '',
    categoryId: '',
    baseNumber: '',
    description: '',
    unit: 'Tablet',
    minStockLevel: 50,
    status: 'Active' as 'Active' | 'Inactive',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Batch Detail Modal
  const [selectedMedForBatches, setSelectedMedForBatches] = useState<Medicine | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [medRes, catRes] = await Promise.all([
        api.getMedicines({
          search,
          categoryId: selectedCategory,
          lowStock: stockFilter === 'lowStock' ? 'true' : undefined,
        }),
        api.getCategories(),
      ]);

      if (medRes.success) {
        setMedicines(medRes.medicines);
      }
      if (catRes.success) {
        setCategories(catRes.categories);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, selectedCategory, stockFilter]);

  const handleOpenAdd = () => {
    setEditingMed(null);
    setFormData({
      name: '',
      genericName: '',
      categoryId: categories[0]?.id || '',
      baseNumber: `MED-${Date.now().toString().slice(-4)}`,
      description: '',
      unit: 'Tablet',
      minStockLevel: 50,
      status: 'Active',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (med: Medicine) => {
    setEditingMed(med);
    setFormData({
      name: med.name,
      genericName: med.genericName,
      categoryId: med.categoryId,
      baseNumber: med.baseNumber,
      description: med.description,
      unit: med.unit,
      minStockLevel: med.minStockLevel,
      status: med.status,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.categoryId || !formData.baseNumber) {
      setFormError('Please fill all required fields (Name, Category, Base Number).');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      if (editingMed) {
        await api.updateMedicine(editingMed.id, formData);
      } else {
        await api.createMedicine(formData);
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Medicines Master Catalog
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700">
              {medicines.length} Products
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Define drug formulations, base numbers, categories, and safety stock limits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add New Medicine
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
            placeholder="Search medicine name, generic name, or base number..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-sky-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-sky-500 focus:outline-none text-slate-700 font-medium"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md border border-slate-200 text-xs">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                stockFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStockFilter('lowStock')}
              className={`px-2.5 py-1 rounded font-medium transition-all flex items-center gap-1 ${
                stockFilter === 'lowStock'
                  ? 'bg-rose-50 text-rose-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              Low Stock
            </button>
          </div>
        </div>
      </div>

      {/* Medicines Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Medicine Details</th>
                <th className="py-3 px-3">Base Number</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-center">Unit</th>
                <th className="py-3 px-3 text-right">Current Stock</th>
                <th className="py-3 px-3 text-right">Min Level</th>
                <th className="py-3 px-3 text-center">Batches</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Loading medicine catalog...
                  </td>
                </tr>
              ) : medicines.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No medicines match the selected filter or search query.
                  </td>
                </tr>
              ) : (
                medicines.map(med => {
                  const stock = med.totalStock || 0;
                  const isLow = stock <= med.minStockLevel;

                  return (
                    <tr
                      key={med.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Name & Generic */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{med.name}</div>
                        <div className="text-[11px] text-slate-500 italic">
                          {med.genericName}
                        </div>
                      </td>

                      {/* Base Number */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        {med.baseNumber}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md font-medium text-[11px]">
                          {med.categoryName}
                        </span>
                      </td>

                      {/* Unit */}
                      <td className="py-3 px-3 text-center text-slate-600 font-medium">
                        {med.unit}
                      </td>

                      {/* Current Stock */}
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`font-black px-2 py-0.5 rounded-md ${
                            isLow
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'text-slate-900'
                          }`}
                        >
                          {stock} {med.unit}s
                        </span>
                      </td>

                      {/* Min Stock Level */}
                      <td className="py-3 px-3 text-right font-medium text-slate-500">
                        {med.minStockLevel}
                      </td>

                      {/* Batches Count */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => setSelectedMedForBatches(med)}
                          className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg font-bold text-slate-700 transition-colors inline-flex items-center gap-1"
                          title="View active batch breakdown"
                        >
                          <Boxes className="w-3.5 h-3.5" />
                          {med.totalBatches || 0}
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            med.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {med.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(med)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Edit medicine details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingMed(med)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete medicine"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Add / Edit Medicine Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                  <Pill className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingMed ? 'Edit Medicine' : 'Add New Medicine'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Master catalog profile & formulation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Medicine Brand Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Paracetamol 500mg"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Generic Formula *
                  </label>
                  <input
                    type="text"
                    value={formData.genericName}
                    onChange={e => setFormData({ ...formData, genericName: e.target.value })}
                    placeholder="e.g. Acetaminophen"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Base Number / Item Code *
                  </label>
                  <input
                    type="text"
                    value={formData.baseNumber}
                    onChange={e => setFormData({ ...formData, baseNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. PARA500"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:border-emerald-600 focus:outline-hidden uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                    required
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Unit Type
                  </label>
                  <select
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Syrup Bottle">Syrup Bottle</option>
                    <option value="Vial">Vial</option>
                    <option value="Ampoule">Ampoule</option>
                    <option value="Ointment Tube">Ointment Tube</option>
                    <option value="Drop Bottle">Drop Bottle</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Min Stock Threshold
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.minStockLevel}
                    onChange={e =>
                      setFormData({ ...formData, minStockLevel: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={e =>
                      setFormData({ ...formData, status: e.target.value as any })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Description / Clinical Indications
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Analgesic and antipyretic for fever and mild to moderate pain"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                {editingMed ? (
                  <button
                    type="button"
                    onClick={() => {
                      const m = editingMed;
                      setIsModalOpen(false);
                      setDeletingMed(m);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 font-bold rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Medicine
                  </button>
                ) : <div />}
                <div className="flex items-center gap-2">
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
                    {submitting ? 'Saving...' : editingMed ? 'Update Medicine' : 'Create Medicine'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingMed}
        title="Delete Medicine"
        itemName={deletingMed ? `${deletingMed.name} (${deletingMed.baseNumber})` : undefined}
        message="Are you sure you want to delete this medicine? If there are any associated batches or records, they will also be permanently removed."
        warningNote={
          deletingMed?.totalStock && deletingMed.totalStock > 0
            ? `Warning: This medicine currently has ${deletingMed.totalStock} units across inventory batches.`
            : undefined
        }
        confirmText="Yes, Delete Medicine"
        onCancel={() => setDeletingMed(null)}
        onConfirm={async () => {
          if (!deletingMed) return;
          await api.deleteMedicine(deletingMed.id);
          setDeletingMed(null);
          await fetchData();
        }}
      />

      {/* Batch Breakdown Drawer / Modal */}
      {selectedMedForBatches && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Batches for {selectedMedForBatches.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Base: {selectedMedForBatches.baseNumber} • Category: {selectedMedForBatches.categoryName}
                </p>
              </div>
              <button
                onClick={() => setSelectedMedForBatches(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase">
                    <th className="py-2.5 px-3">Batch Number</th>
                    <th className="py-2.5 px-3">Expiry Date (MM/YY)</th>
                    <th className="py-2.5 px-3 text-right">Available Qty</th>
                    <th className="py-2.5 px-3 text-right">Selling Price</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!selectedMedForBatches.batches || selectedMedForBatches.batches.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        No batch inventory records found for this medicine.
                      </td>
                    </tr>
                  ) : (
                    selectedMedForBatches.batches.map(b => (
                      <tr key={b.id}>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {b.batchNumber}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-700">
                          {formatMonthYear(b.expiryDate)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">
                          {b.currentQuantity} / {b.quantityReceived}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium">
                          ₹{b.sellingPrice}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              b.status === 'Available'
                                ? 'bg-emerald-100 text-emerald-800'
                                : b.status === 'Expiring Soon'
                                ? 'bg-orange-100 text-orange-800'
                                : b.status === 'Expired'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => setDeletingBatch({ med: selectedMedForBatches, batch: b })}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center cursor-pointer"
                            title="Delete Batch Record"
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

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedMedForBatches(null)}
                className="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Batch Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingBatch}
        title="Delete Medicine Batch"
        itemName={deletingBatch ? `Batch #${deletingBatch.batch.batchNumber} (${deletingBatch.med.name})` : undefined}
        message="Are you sure you want to delete this batch? All stock recorded under this batch number will be removed from inventory."
        confirmText="Yes, Delete Batch"
        onCancel={() => setDeletingBatch(null)}
        onConfirm={async () => {
          if (!deletingBatch) return;
          await api.deleteBatch(deletingBatch.batch.id);
          const currentMedId = deletingBatch.med.id;
          setDeletingBatch(null);
          await fetchData();
          if (selectedMedForBatches && selectedMedForBatches.id === currentMedId) {
            const updated = await api.getMedicineById(currentMedId);
            if (updated.success) setSelectedMedForBatches(updated.medicine);
          }
        }}
      />
    </div>
  );
};
