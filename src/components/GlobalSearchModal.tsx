import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import {
  Search,
  X,
  Pill,
  Boxes,
  ShoppingCart,
  Truck,
  Users2,
  ArrowRight,
} from 'lucide-react';
import { TabType } from './Sidebar';
import { formatMonthYear } from '../utils/formatters';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult?: (view: any) => void;
  onNavigate?: (tab: TabType, targetId?: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectResult,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const [medicines, setMedicines] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setMedicines([]);
      setBatches([]);
      setPos([]);
      setPatients([]);
      setSuppliers([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const [medRes, batRes, poRes, patRes, supRes] = await Promise.all([
          api.getMedicines({ search: query }),
          api.getBatches({ search: query }),
          api.getPurchases({ search: query }),
          api.getPatients({ search: query }),
          api.getSuppliers({ search: query }),
        ]);

        setMedicines(medRes.medicines?.slice(0, 4) || []);
        setBatches(batRes.batches?.slice(0, 4) || []);
        setPos(poRes.purchaseOrders?.slice(0, 4) || []);
        setPatients(patRes.patients?.slice(0, 4) || []);
        setSuppliers(supRes.suppliers?.slice(0, 4) || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const navigateTo = (view: any) => {
    if (onSelectResult) onSelectResult(view);
    else if (onNavigate) onNavigate(view);
    onClose();
  };

  const totalResults =
    medicines.length + batches.length + pos.length + patients.length + suppliers.length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs p-4 sm:p-6 md:p-20 flex justify-center">
      <div
        className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 h-fit max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search medicines, base numbers, batch codes, POs, patients..."
            className="flex-1 bg-transparent border-0 focus:outline-none text-sm text-slate-900 placeholder:text-slate-400 font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-slate-400 hover:text-slate-600 px-1.5 py-0.5"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="text-center py-6 text-xs text-slate-400">
              Searching hospital pharmacy records...
            </div>
          )}

          {!loading && !query && (
            <div className="text-center py-8 text-slate-400">
              <p className="text-xs">
                Type keywords like "Paracetamol", "PARA500", "PO-2026", or patient names.
              </p>
            </div>
          )}

          {!loading && query && totalResults === 0 && (
            <div className="text-center py-8 text-slate-500 text-xs">
              No matching records found for "{query}".
            </div>
          )}

          {/* Medicines */}
          {medicines.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                Medicines Catalog ({medicines.length})
              </div>
              <div className="space-y-1">
                {medicines.map(med => (
                  <button
                    key={med.id}
                    onClick={() => navigateTo('medicines')}
                    className="w-full text-left p-2 hover:bg-slate-50 rounded-lg flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-slate-100 text-slate-700 rounded-md">
                        <Pill className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-sky-600">
                          {med.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {med.baseNumber} • {med.genericName}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Batches */}
          {batches.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                Batch Lots ({batches.length})
              </div>
              <div className="space-y-1">
                {batches.map(batch => (
                  <button
                    key={batch.id}
                    onClick={() => navigateTo('batches')}
                    className="w-full text-left p-2 hover:bg-slate-50 rounded-lg flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-slate-100 text-slate-700 rounded-md">
                        <Boxes className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-sky-600">
                          {batch.medicineName} — Batch {batch.batchNumber}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Exp: {formatMonthYear(batch.expiryDate)} • Qty: {batch.currentQuantity}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Purchase Orders */}
          {pos.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                Purchase Orders ({pos.length})
              </div>
              <div className="space-y-1">
                {pos.map(po => (
                  <button
                    key={po.id}
                    onClick={() => navigateTo('purchases')}
                    className="w-full text-left p-2 hover:bg-slate-50 rounded-lg flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-slate-100 text-slate-700 rounded-md">
                        <ShoppingCart className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-sky-600">
                          {po.poNumber} — {po.supplierName}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Status: {po.orderStatus} • ₹{po.totalAmount}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Patients */}
          {patients.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                Patients ({patients.length})
              </div>
              <div className="space-y-1">
                {patients.map(p => (
                  <button
                    key={p.id}
                    onClick={() => navigateTo('patients')}
                    className="w-full text-left p-2 hover:bg-slate-50 rounded-lg flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-slate-100 text-slate-700 rounded-md">
                        <Users2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-sky-600">
                          {p.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          MRN: {p.patientIdNumber} • Phone: {p.phone}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Suppliers */}
          {suppliers.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                Suppliers ({suppliers.length})
              </div>
              <div className="space-y-1">
                {suppliers.map(s => (
                  <button
                    key={s.id}
                    onClick={() => navigateTo('suppliers')}
                    className="w-full text-left p-2 hover:bg-slate-50 rounded-lg flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-slate-100 text-slate-700 rounded-md">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-sky-600">
                          {s.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Contact: {s.contactPerson} • {s.phone}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-400">
          Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] text-slate-600">Esc</kbd> to exit search
        </div>
      </div>
    </div>
  );
};
