import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Dispensing, Patient, Medicine } from '../types';
import { useAuth } from '../context/AuthContext';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { formatMonthYear } from '../utils/formatters';
import {
  Syringe,
  Plus,
  Search,
  Printer,
  Trash2,
  X,
  AlertTriangle,
  Receipt,
  Barcode,
  ShieldCheck,
  ShieldAlert,
  Check,
  Building2,
} from 'lucide-react';

export const DispensingView: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [dispensings, setDispensings] = useState<Dispensing[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingDispensing, setDeletingDispensing] = useState<Dispensing | null>(null);

  // Barcode quick scan state in modal
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeFeedback, setBarcodeFeedback] = useState<string | null>(null);

  // Dispense Wizard Modal
  const [isDispenseModalOpen, setIsDispenseModalOpen] = useState(false);
  const [dispenseForm, setDispenseForm] = useState({
    patientId: '',
    doctorId: '',
    notes: '',
    prescriptionId: '',
    allergyOverrideReason: '',
    witnessStaffId: '',
    items: [] as Array<{
      medicineId: string;
      quantity: number;
    }>,
  });
  const [dispenseError, setDispenseError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Active Receipt/Slip Modal
  const [activeReceipt, setActiveReceipt] = useState<Dispensing | null>(null);
  const [receiptFormat, setReceiptFormat] = useState<'a4' | 'thermal'>('a4');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dispRes, patRes, medRes] = await Promise.all([
        api.getDispensings({ search }),
        api.getPatients(),
        api.getMedicines({ activeOnly: 'true' }),
      ]);

      if (dispRes.success) setDispensings(dispRes.dispensings);
      if (patRes.success) setPatients(patRes.patients);
      if (medRes.success) setMedicines(medRes.medicines);

      // Load doctors & staff
      const usersRes = await api.getUsers().catch(() => ({ users: [] }));
      const allUsers = usersRes.users || [];
      setStaffUsers(allUsers);
      const docs = allUsers.filter((u: any) => u.role === 'Doctor');
      setDoctors(docs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const handleOpenDispense = () => {
    const initialMed = medicines[0]?.id || '';
    setDispenseForm({
      patientId: patients[0]?.id || '',
      doctorId: doctors[0]?.id || '',
      notes: 'Standard OPD hospital prescription fulfillment - Free govt supply',
      prescriptionId: '',
      allergyOverrideReason: '',
      witnessStaffId: '',
      items: initialMed ? [{ medicineId: initialMed, quantity: 5 }] : [],
    });
    setBarcodeInput('');
    setBarcodeFeedback(null);
    setDispenseError(null);
    setIsDispenseModalOpen(true);
  };

  const handleBarcodeScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const query = barcodeInput.trim().toLowerCase();
    const matched = medicines.find(
      m =>
        m.baseNumber.toLowerCase() === query ||
        m.name.toLowerCase().includes(query) ||
        (m.genericName && m.genericName.toLowerCase().includes(query))
    );

    if (matched) {
      const existingIndex = dispenseForm.items.findIndex(item => item.medicineId === matched.id);
      if (existingIndex >= 0) {
        const updated = [...dispenseForm.items];
        updated[existingIndex].quantity += 1;
        setDispenseForm({ ...dispenseForm, items: updated });
      } else {
        setDispenseForm({
          ...dispenseForm,
          items: [...dispenseForm.items, { medicineId: matched.id, quantity: 1 }],
        });
      }
      setBarcodeFeedback(`Scanned & added: ${matched.name}`);
      setBarcodeInput('');
      setTimeout(() => setBarcodeFeedback(null), 3000);
    } else {
      setBarcodeFeedback(`No medicine found matching "${barcodeInput}"`);
      setTimeout(() => setBarcodeFeedback(null), 3000);
    }
  };

  const handleAddItemRow = () => {
    setDispenseForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          medicineId: medicines[0]?.id || '',
          quantity: 5,
        },
      ],
    }));
  };

  const handleRemoveItemRow = (idx: number) => {
    setDispenseForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleUpdateItemRow = (idx: number, field: string, value: any) => {
    setDispenseForm(prev => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...prev, items };
    });
  };

  const selectedPatientObj = patients.find(p => p.id === dispenseForm.patientId);

  const cartCalculations = () => {
    let containsControlled = false;
    let totalUnits = 0;
    const detectedAllergies: string[] = [];

    const patientAllergies = (selectedPatientObj?.allergies || '').toLowerCase();

    for (const item of dispenseForm.items) {
      const med = medicines.find(m => m.id === item.medicineId);
      totalUnits += Number(item.quantity) || 0;
      if (med) {
        if (med.isControlled) {
          containsControlled = true;
        }

        if (patientAllergies && patientAllergies !== 'none' && patientAllergies !== 'none known') {
          const medName = med.name.toLowerCase();
          const genName = (med.genericName || '').toLowerCase();
          const tags = (med.allergyTags || []).map(t => t.toLowerCase());

          if (
            patientAllergies.includes('penicillin') &&
            (medName.includes('amox') || genName.includes('penicillin') || tags.includes('penicillin') || tags.includes('beta-lactam'))
          ) {
            detectedAllergies.push(`${med.name} (Cross-reacts with Penicillin / Beta-lactams)`);
          } else if (
            patientAllergies.includes('aspirin') &&
            (medName.includes('aspirin') || medName.includes('ibuprofen') || tags.includes('nsaid'))
          ) {
            detectedAllergies.push(`${med.name} (Cross-reacts with NSAIDs / Aspirin)`);
          } else if (
            patientAllergies.includes('sulfa') &&
            (medName.includes('sulfa') || tags.includes('sulfonamide'))
          ) {
            detectedAllergies.push(`${med.name} (Cross-reacts with Sulfonamides)`);
          }
        }
      }
    }

    return {
      containsControlled,
      detectedAllergies,
      totalUnits,
      itemCount: dispenseForm.items.length,
    };
  };

  const cartSummary = cartCalculations();

  const handleDispenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispenseForm.patientId || dispenseForm.items.length === 0) {
      setDispenseError('Please select a patient and add at least one medication item.');
      return;
    }

    // Check quantity validity
    for (const item of dispenseForm.items) {
      if (item.quantity <= 0) {
        setDispenseError('Dispensing quantity must be greater than 0.');
        return;
      }
      const med = medicines.find(m => m.id === item.medicineId);
      if (med && (med.totalStock || 0) < item.quantity) {
        setDispenseError(
          `Insufficient stock for ${med.name}! Available: ${med.totalStock || 0}, Requested: ${item.quantity}`
        );
        return;
      }
    }

    // Clinical allergy override check
    if (cartSummary.detectedAllergies.length > 0 && !dispenseForm.allergyOverrideReason.trim()) {
      setDispenseError(
        `Clinical Alert: Patient has recorded allergies matching items in cart (${cartSummary.detectedAllergies.join(', ')}). A clinical override justification is required before dispensing.`
      );
      return;
    }

    // Controlled substance dual-witness check
    if (cartSummary.containsControlled && !dispenseForm.witnessStaffId) {
      setDispenseError(
        'Controlled Substance Requirement: High-risk narcotic dispensing requires a second licensed clinical witness sign-off.'
      );
      return;
    }

    try {
      setSubmitting(true);
      setDispenseError(null);

      const witnessStaff = staffUsers.find(u => u.id === dispenseForm.witnessStaffId);

      const payload = {
        patientId: dispenseForm.patientId,
        doctorId: dispenseForm.doctorId || undefined,
        notes: dispenseForm.notes,
        prescriptionId: dispenseForm.prescriptionId || undefined,
        paymentMethod: 'Free (Govt Hospital Supply)',
        allergyOverrideReason: dispenseForm.allergyOverrideReason || undefined,
        hasAllergyWarning: cartSummary.detectedAllergies.length > 0,
        witnessStaffId: dispenseForm.witnessStaffId || undefined,
        witnessStaffName: witnessStaff?.fullName || undefined,
        items: dispenseForm.items,
      };

      const res = await api.dispenseMedicine(payload);
      if (res.success && res.dispensing) {
        setIsDispenseModalOpen(false);
        setActiveReceipt(res.dispensing);
        await fetchData();
      }
    } catch (err: any) {
      setDispenseError(err.message || 'Dispensing failed. Check stock availability.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewReceipt = async (d: Dispensing) => {
    try {
      setLoading(true);
      const res = await api.getDispensingById(d.id);
      if (res.success && res.dispensing) {
        setActiveReceipt(res.dispensing);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const isDoctor = false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Prescription Dispensing & FEFO Engine
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Govt Hospital Supply • Free Dispensing
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Public health dispensary: Automatically allocates earliest-expiry batches first (FEFO) with patient safety checks.
          </p>
        </div>

        <button
          onClick={handleOpenDispense}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium shadow-xs transition-colors cursor-pointer"
        >
          <Syringe className="w-4 h-4 text-emerald-400" />
          Dispense Prescription (FEFO)
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search dispensing number, patient name, doctor, or pharmacist..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-sky-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Dispensing History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Dispensing #</th>
                <th className="py-3 px-3">Patient Name</th>
                <th className="py-3 px-3">Doctor / OPD</th>
                <th className="py-3 px-3">Pharmacist</th>
                <th className="py-3 px-3 text-center">Items (Qty)</th>
                <th className="py-3 px-3">Dispensed Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading dispensing transactions...
                  </td>
                </tr>
              ) : dispensings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No dispensing records recorded.
                  </td>
                </tr>
              ) : (
                dispensings.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Number */}
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900">
                        {d.dispensingNumber}
                      </div>
                      <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                        {d.status || 'Completed'}
                      </span>
                    </td>

                    {/* Patient */}
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {d.patientName}
                    </td>

                    {/* Doctor */}
                    <td className="py-3 px-3 text-slate-600">
                      {d.doctorName || 'General OPD'}
                    </td>

                    {/* Pharmacist */}
                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {d.pharmacistName}
                    </td>

                    {/* Items */}
                    <td className="py-3 px-3 text-center font-bold text-slate-800">
                      <span className="bg-slate-100 px-2 py-0.5 rounded">
                        {d.itemCount || (d.details ? d.details.length : 1)} meds ({d.totalQuantity || (d.details ? d.details.reduce((a, b) => a + b.quantity, 0) : 0)} units)
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-3 text-slate-500">
                      {new Date(d.createdAt).toLocaleString()}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => handleViewReceipt(d)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold transition-colors inline-flex items-center gap-1"
                        title="View Dispensing Issue Slip"
                      >
                        <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                        Issue Slip
                      </button>
                      <button
                        onClick={() => setDeletingDispensing(d)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center"
                        title="Delete / Void Dispensing Record"
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

      {/* Dispense Medicine Wizard Modal */}
      {isDispenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                  <Syringe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Government Hospital Prescription Dispensing (FEFO)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Automated First-Expiry-First-Out Batch Allocation & Clinical Safety Verification
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDispenseModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Barcode Scanner Bar */}
            <form
              onSubmit={handleBarcodeScan}
              className="mb-4 bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-center gap-2"
            >
              <Barcode className="w-5 h-5 text-slate-500 shrink-0" />
              <input
                type="text"
                value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value)}
                placeholder="Scan medicine barcode / SKU (e.g. MED-AMOX-500) or type name and hit Enter..."
                className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-600 font-mono"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Scan / Add
              </button>
            </form>

            {barcodeFeedback && (
              <div className="mb-3 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600" />
                {barcodeFeedback}
              </div>
            )}

            {dispenseError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{dispenseError}</span>
              </div>
            )}

            <form onSubmit={handleDispenseSubmit} className="space-y-4 text-xs flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Select Patient *
                  </label>
                  <select
                    value={dispenseForm.patientId}
                    onChange={e => setDispenseForm({ ...dispenseForm, patientId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden font-medium"
                    required
                  >
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.patientId} / MRN: {p.medicalRecordNumber})
                      </option>
                    ))}
                  </select>

                  {selectedPatientObj && (
                    <div className="mt-1.5 text-[11px] text-slate-600 flex items-center gap-2">
                      <span>Age: {selectedPatientObj.age}</span>
                      <span>•</span>
                      <span>
                        Allergies:{' '}
                        <span className={`font-semibold ${selectedPatientObj.allergies && selectedPatientObj.allergies.toLowerCase() !== 'none' ? 'text-rose-700' : 'text-slate-700'}`}>
                          {selectedPatientObj.allergies || 'None Known'}
                        </span>
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Prescribing Doctor
                  </label>
                  <select
                    value={dispenseForm.doctorId}
                    onChange={e => setDispenseForm({ ...dispenseForm, doctorId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden font-medium"
                  >
                    <option value="">Hospital OPD / Walk-in Prescriber</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Medicine Line Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Prescription Medicines to Dispense ({cartSummary.itemCount} items • {cartSummary.totalUnits} total units)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="px-2.5 py-1 bg-slate-800 text-white rounded-lg text-[11px] font-semibold hover:bg-slate-900 inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Drug
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Medicine</th>
                        <th className="p-2.5 w-32 text-right">Available Stock</th>
                        <th className="p-2.5 w-36 text-right">Qty to Dispense</th>
                        <th className="p-2.5 w-12 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dispenseForm.items.map((item, idx) => {
                        const med = medicines.find(m => m.id === item.medicineId);
                        const stock = med?.totalStock || 0;
                        const isOverStock = item.quantity > stock;

                        // Earliest expiring active batch info for FEFO visual clarity
                        const activeBatch = med?.batches
                          ?.filter(b => b.currentQuantity > 0 && b.status !== 'Expired')
                          ?.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())[0] || med?.batches?.[0];

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-2">
                              <select
                                value={item.medicineId}
                                onChange={e =>
                                  handleUpdateItemRow(idx, 'medicineId', e.target.value)
                                }
                                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                              >
                                {medicines.map(m => (
                                  <option key={m.id} value={m.id}>
                                    {m.name} ({m.baseNumber}) {m.isControlled ? '⚠️ [Controlled]' : ''}
                                  </option>
                                ))}
                              </select>
                              {activeBatch && (
                                <div className="mt-0.5 text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-1 rounded">FEFO Batch:</span>
                                  <span>{activeBatch.batchNumber}</span>
                                  <span>• Exp: {formatMonthYear(activeBatch.expiryDate)}</span>
                                </div>
                              )}
                            </td>
                            <td className="p-2 text-right">
                              <span
                                className={`font-bold ${
                                  stock <= 20 ? 'text-amber-700' : 'text-slate-900'
                                }`}
                              >
                                {stock} {med?.unit || 'Unit'}s
                              </span>
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
                                className={`w-full px-2 py-1.5 bg-slate-50 border rounded-lg text-right font-bold text-xs ${
                                  isOverStock
                                    ? 'border-rose-400 text-rose-800'
                                    : 'border-slate-200 text-slate-900'
                                }`}
                              />
                            </td>
                            <td className="p-2 text-center">
                              {dispenseForm.items.length > 1 && (
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Allergy Warning Banner if detected */}
              {cartSummary.detectedAllergies.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-900 font-bold">
                    <ShieldAlert className="w-5 h-5 text-rose-600" />
                    <span>Clinical Contraindication Warning</span>
                  </div>
                  <p className="text-rose-800 text-[11px]">
                    The patient has documented allergies that cross-react with items in the cart:
                  </p>
                  <ul className="list-disc list-inside text-rose-900 font-semibold text-[11px]">
                    {cartSummary.detectedAllergies.map((allg, i) => (
                      <li key={i}>{allg}</li>
                    ))}
                  </ul>
                  <div>
                    <label className="block font-bold text-rose-900 text-[11px] mb-1">
                      Clinical Override Justification Reason * (Required to dispense)
                    </label>
                    <input
                      type="text"
                      value={dispenseForm.allergyOverrideReason}
                      onChange={e =>
                        setDispenseForm({ ...dispenseForm, allergyOverrideReason: e.target.value })
                      }
                      placeholder="e.g. Desensitization completed / Doctor confirmed benefit outweighs risk"
                      className="w-full px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-xs focus:outline-none focus:border-rose-600 text-rose-900"
                    />
                  </div>
                </div>
              )}

              {/* Controlled Substance Witness Requirement */}
              {cartSummary.containsControlled && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold">
                    <ShieldCheck className="w-5 h-5 text-amber-600" />
                    <span>Controlled Substance Dual-Witness Requirement</span>
                  </div>
                  <p className="text-amber-800 text-[11px]">
                    Cart contains Schedule II/IV controlled substances. Regulations mandate a second clinical witness sign-off.
                  </p>
                  <div>
                    <label className="block font-bold text-amber-900 text-[11px] mb-1">
                      Witnessing Licensed Staff Member *
                    </label>
                    <select
                      value={dispenseForm.witnessStaffId}
                      onChange={e =>
                        setDispenseForm({ ...dispenseForm, witnessStaffId: e.target.value })
                      }
                      className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs focus:outline-none focus:border-amber-600"
                    >
                      <option value="">Select Witnessing Pharmacist / Nurse / Doctor</option>
                      {staffUsers
                        .filter(u => u.id !== user?.id)
                        .map(u => (
                          <option key={u.id} value={u.id}>
                            {u.fullName} ({u.role})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Govt Free Dispensing Banner */}
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-lg shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-emerald-900 block">
                    Government Public Health Supply — Free of Charge
                  </span>
                  <span className="text-emerald-700 text-[11px]">
                    Under Government Hospital Policy, all prescribed medicines are supplied free of cost for inpatient and OPD patient care. No billing or copay is collected.
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Pharmacist Notes / Dosage Directions
                </label>
                <textarea
                  rows={2}
                  value={dispenseForm.notes}
                  onChange={e => setDispenseForm({ ...dispenseForm, notes: e.target.value })}
                  placeholder="e.g. Take 1 tablet after meals twice daily for 5 days."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDispenseModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Syringe className="w-4 h-4" />
                  {submitting ? 'Allocating FEFO Batches...' : 'Confirm Dispensing (Govt Supply)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Dispensing Issue Slip Modal / Print Preview */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white">
          <div
            className={`bg-white rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95 max-h-[90vh] flex flex-col print:border-none print:shadow-none print:max-w-none print:h-auto ${
              receiptFormat === 'thermal' ? 'max-w-sm font-mono text-[11px]' : 'max-w-2xl text-xs'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3 print:border-b-2 print:border-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-lg">
                  +
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 tracking-tight">
                    NEEPCO Hospital Pharmacy
                  </h2>
                  <p className="text-[10px] text-slate-500">Official Prescription Issue Slip & Patient Dispensing Record</p>
                </div>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-[10px]">
                  <button
                    onClick={() => setReceiptFormat('a4')}
                    className={`px-2 py-1 rounded font-bold ${
                      receiptFormat === 'a4' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
                    }`}
                  >
                    A4 Slip
                  </button>
                  <button
                    onClick={() => setReceiptFormat('thermal')}
                    className={`px-2 py-1 rounded font-bold ${
                      receiptFormat === 'thermal' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
                    }`}
                  >
                    Thermal Slip (80mm)
                  </button>
                </div>
                <button
                  onClick={handlePrint}
                  className="p-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button
                  onClick={() => setActiveReceipt(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Slip Content */}
            <div className="space-y-3 flex-1 overflow-y-auto print:overflow-visible">
              <div
                className={`grid ${
                  receiptFormat === 'thermal' ? 'grid-cols-1 gap-2' : 'grid-cols-2 gap-4'
                } bg-slate-50 p-3 rounded-xl border border-slate-200 print:bg-transparent print:border-slate-300`}
              >
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">
                    Issue Slip # / Date
                  </div>
                  <div className="font-mono font-bold text-slate-900">
                    {activeReceipt.dispensingNumber}
                  </div>
                  <div className="text-slate-500 text-[10px] mt-0.5">
                    {new Date(activeReceipt.createdAt).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-emerald-800 mt-1 font-semibold">
                    Supply Category: <span className="font-bold">Govt Free Hospital Benefit</span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">
                    Patient & Prescriber
                  </div>
                  <div className="font-bold text-slate-900">{activeReceipt.patientName}</div>
                  <div className="text-slate-600 text-[10px]">
                    Doctor: {activeReceipt.doctorName || 'General OPD'}
                  </div>
                  <div className="text-slate-500 text-[10px]">
                    Dispensed By: {activeReceipt.pharmacistName}
                  </div>
                  {activeReceipt.witnessStaffName && (
                    <div className="text-amber-800 text-[10px] font-semibold">
                      Witness: {activeReceipt.witnessStaffName}
                    </div>
                  )}
                </div>
              </div>

              {/* Items Breakdown with Batches and Expiry */}
              <div>
                <h4 className="font-bold text-slate-800 mb-1.5 uppercase text-[10px] tracking-wider">
                  Medications Dispensed (FEFO Batch Allocation)
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden print:border-slate-300">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[10px]">
                      <tr>
                        <th className="p-2">Medication Name</th>
                        <th className="p-2">Allocated Batch # & Expiry</th>
                        <th className="p-2 text-right">Quantity Dispensed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {(activeReceipt.details || []).map(item => (
                        <tr key={item.id}>
                          <td className="p-2 font-bold text-slate-900">{item.medicineName}</td>
                          <td className="p-2 font-mono text-slate-600 text-[10px]">
                            {item.batchNumber} • Exp: {formatMonthYear(item.expiryDate)}
                          </td>
                          <td className="p-2 text-right font-bold text-slate-900">
                            {item.quantity} units
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Free Government Supply Summary Banner */}
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-xl print:bg-slate-100 print:text-slate-900 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold block">Government Hospital Supply</span>
                  <span className="text-[10px] text-emerald-700 print:text-slate-600">
                    Total Drugs Dispensed: {(activeReceipt.details || []).length} items (
                    {(activeReceipt.details || []).reduce((a, b) => a + b.quantity, 0)} units)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Total Cost to Patient</span>
                  <span className="font-bold text-sm text-emerald-700">₹0.00 (Free of Cost)</span>
                </div>
              </div>

              {activeReceipt.notes && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-[11px]">
                  <span className="font-bold text-slate-900 block mb-0.5">Dosage Directions / Instructions:</span>
                  <p>{activeReceipt.notes}</p>
                </div>
              )}

              {/* Signature Block for Print */}
              <div className="pt-6 grid grid-cols-2 gap-8 text-center text-slate-600 text-[10px]">
                <div className="border-t border-slate-300 pt-1">
                  Pharmacist Signature & Hospital Stamp
                </div>
                <div className="border-t border-slate-300 pt-1">
                  Patient / Recipient Signature
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between print:hidden">
              <button
                onClick={() => {
                  const d = activeReceipt;
                  setActiveReceipt(null);
                  setDeletingDispensing(d);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-rose-600 hover:bg-rose-50 font-bold rounded-xl text-xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete / Void Dispensing
              </button>
              <button
                onClick={() => setActiveReceipt(null)}
                className="px-4 py-1.5 bg-slate-800 text-white font-bold rounded-xl text-xs"
              >
                Close Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Dispensing Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingDispensing}
        title="Delete / Void Dispensing"
        itemName={deletingDispensing ? `Slip #${deletingDispensing.dispensingNumber} for ${deletingDispensing.patientName}` : undefined}
        message="Are you sure you want to delete this dispensing record? Deleting this record will automatically restore the dispensed quantities back into their respective inventory batches."
        confirmText="Yes, Void & Restore Stock"
        onCancel={() => setDeletingDispensing(null)}
        onConfirm={async () => {
          if (!deletingDispensing) return;
          await api.deleteDispensing(deletingDispensing.id);
          setDeletingDispensing(null);
          await fetchData();
        }}
      />
    </div>
  );
};
