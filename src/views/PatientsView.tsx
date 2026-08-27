import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Patient, Medicine, Prescription } from '../types';
import { useAuth } from '../context/AuthContext';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import {
  Users2,
  Plus,
  Search,
  Stethoscope,
  FileText,
  AlertCircle,
  X,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';

export const PatientsView: React.FC = () => {
  const { user, privacyMode, togglePrivacyMode, isAdmin } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'patients' | 'prescriptions'>('patients');
  const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null);
  const [deletingRx, setDeletingRx] = useState<Prescription | null>(null);

  const maskName = (name: string) => {
    if (!privacyMode) return name;
    return name
      .split(' ')
      .map(part => (part.length > 1 ? part[0] + '•'.repeat(Math.min(part.length - 1, 5)) : part))
      .join(' ');
  };

  const maskContact = (contact: string) => {
    if (!privacyMode) return contact;
    return contact.replace(/\d(?=\d{2})/g, '•');
  };

  const maskMRN = (mrn: string) => {
    if (!privacyMode) return mrn;
    return mrn.slice(0, 3) + '••••' + mrn.slice(-2);
  };

  // Add Patient Modal
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [patientForm, setPatientForm] = useState({
    name: '',
    age: 35,
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    contact: '',
    address: '',
    allergies: '',
    bloodGroup: 'O+',
  });
  const [patientError, setPatientError] = useState<string | null>(null);
  const [submittingPatient, setSubmittingPatient] = useState(false);

  // Prescribe Modal (Doctor / Clinical)
  const [isPrescribeOpen, setIsPrescribeOpen] = useState(false);
  const [selectedPatientForRx, setSelectedPatientForRx] = useState<Patient | null>(null);
  const [rxForm, setRxForm] = useState({
    diagnosis: '',
    items: [
      {
        medicineId: '',
        dosage: '500mg',
        frequency: 'TID (3 times daily)',
        duration: '5 days',
        quantity: 15,
        instructions: 'Take after meals with a glass of water.',
      },
    ],
  });
  const [rxError, setRxError] = useState<string | null>(null);
  const [submittingRx, setSubmittingRx] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [patRes, medRes, rxRes] = await Promise.all([
        api.getPatients({ search }),
        api.getMedicines({ activeOnly: 'true' }),
        api.getPrescriptions(),
      ]);

      if (patRes.success) setPatients(patRes.patients);
      if (medRes.success) setMedicines(medRes.medicines);
      if (rxRes.success) setPrescriptions(rxRes.prescriptions);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const handleOpenAddPatient = () => {
    setPatientForm({
      name: '',
      age: 30,
      gender: 'Male',
      contact: '+1 (555) ',
      address: '',
      allergies: '',
      bloodGroup: 'O+',
    });
    setPatientError(null);
    setIsAddPatientOpen(true);
  };

  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientForm.name || !patientForm.contact) {
      setPatientError('Patient name and contact number are required.');
      return;
    }

    try {
      setSubmittingPatient(true);
      setPatientError(null);
      await api.createPatient(patientForm);
      setIsAddPatientOpen(false);
      await fetchData();
    } catch (err: any) {
      setPatientError(err.message || 'Failed to register patient.');
    } finally {
      setSubmittingPatient(false);
    }
  };

  const handleOpenPrescribe = (patient: Patient) => {
    setSelectedPatientForRx(patient);
    setRxForm({
      diagnosis: 'Acute Upper Respiratory Tract Infection',
      items: [
        {
          medicineId: medicines[0]?.id || '',
          dosage: '500mg',
          frequency: 'TID (3 times daily)',
          duration: '5 days',
          quantity: 15,
          instructions: 'Take after meals.',
        },
      ],
    });
    setRxError(null);
    setIsPrescribeOpen(true);
  };

  const handleAddRxItem = () => {
    setRxForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          medicineId: medicines[0]?.id || '',
          dosage: '10mg',
          frequency: 'OD (Once daily)',
          duration: '7 days',
          quantity: 7,
          instructions: 'Take in the morning.',
        },
      ],
    }));
  };

  const handleRemoveRxItem = (idx: number) => {
    setRxForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleUpdateRxItem = (idx: number, field: string, value: any) => {
    setRxForm(prev => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...prev, items };
    });
  };

  const handleRxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientForRx) return;
    if (!rxForm.diagnosis || rxForm.items.length === 0) {
      setRxError('Diagnosis and at least one medication are required.');
      return;
    }

    try {
      setSubmittingRx(true);
      setRxError(null);
      await api.createPrescription(selectedPatientForRx.id, rxForm);
      setIsPrescribeOpen(false);
      await fetchData();
    } catch (err: any) {
      setRxError(err.message || 'Failed to create prescription.');
    } finally {
      setSubmittingRx(false);
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
              Hospital Patients & Clinical Prescriptions
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700">
              {patients.length} Registered Patients
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Medical record numbering, allergy flags, diagnosis logs, and doctor clinical prescribing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs mr-2">
            <button
              onClick={() => setActiveTab('patients')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'patients'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Patient Directory
            </button>
            <button
              onClick={() => setActiveTab('prescriptions')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'prescriptions'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Prescription Queue ({prescriptions.length})
            </button>
          </div>

          <button
            onClick={handleOpenAddPatient}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Register Patient
          </button>
        </div>
      </div>

      {/* Privacy Mode Notice */}
      {privacyMode && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-xl px-4 py-2 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-amber-600" />
            <span>
              <strong>PHI Privacy Shield Enabled:</strong> Patient names, phone numbers, and record numbers are masked on-screen.
            </span>
          </div>
          <button
            onClick={togglePrivacyMode}
            className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
          >
            Disable Shield
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search patient name, MRN, patient ID, contact, or diagnosis..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Tab 1: Patient Directory */}
      {activeTab === 'patients' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map(patient => (
            <div
              key={patient.id}
              className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md">
                    {patient.patientId}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 font-semibold">
                    MRN: {maskMRN(patient.medicalRecordNumber)}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900">{maskName(patient.name)}</h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  {patient.age} yrs • {patient.gender} • Blood: <span className="font-bold text-slate-700">{patient.bloodGroup || 'O+'}</span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{maskContact(patient.contact)}</span>
                  </div>
                  {patient.allergies && (
                    <div className="flex items-start gap-1.5 text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>Allergies: {patient.allergies}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium">
                  {patient.dispensingsCount || 0} Dispensings
                </span>

                <div className="flex items-center gap-1.5">
                  {isAdmin && (
                    <button
                      onClick={() => setDeletingPatient(patient)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Patient Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {/* Doctor Prescription Action Button */}
                  <button
                    onClick={() => handleOpenPrescribe(patient)}
                    className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 border border-sky-200 shadow-2xs"
                  >
                    <Stethoscope className="w-3.5 h-3.5 text-sky-700" />
                    Prescribe Rx
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Prescription Queue */}
      {activeTab === 'prescriptions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Rx Number</th>
                  <th className="py-3 px-3">Patient Name</th>
                  <th className="py-3 px-3">Prescribing Doctor</th>
                  <th className="py-3 px-3">Clinical Diagnosis</th>
                  <th className="py-3 px-3">Prescribed Medications</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Loading prescriptions queue...
                    </td>
                  </tr>
                ) : prescriptions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No prescriptions created yet.
                    </td>
                  </tr>
                ) : (
                  prescriptions.map(rx => (
                    <tr key={rx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {rx.prescriptionNumber}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {maskName(rx.patientName)}
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        {rx.doctorName}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800">
                        {rx.diagnosis}
                      </td>
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          {rx.items.map((it, i) => (
                            <div key={i} className="text-[11px] text-slate-600">
                              • <span className="font-bold text-slate-900">{it.medicineName}</span> ({it.dosage}) - {it.frequency} × {it.duration}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rx.status === 'Dispensed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {rx.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-500">
                        {new Date(rx.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setDeletingRx(rx)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Prescription"
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
      )}

      {/* Register Patient Modal */}
      {isAddPatientOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                  <Users2 className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Register New Patient</h3>
              </div>
              <button
                onClick={() => setIsAddPatientOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {patientError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs">
                {patientError}
              </div>
            )}

            <form onSubmit={handlePatientSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={patientForm.name}
                  onChange={e => setPatientForm({ ...patientForm, name: e.target.value })}
                  placeholder="e.g. Robert Smith"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Age</label>
                  <input
                    type="number"
                    min="0"
                    value={patientForm.age}
                    onChange={e =>
                      setPatientForm({
                        ...patientForm,
                        age: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={patientForm.gender}
                    onChange={e =>
                      setPatientForm({ ...patientForm, gender: e.target.value as any })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={patientForm.bloodGroup}
                    onChange={e =>
                      setPatientForm({ ...patientForm, bloodGroup: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Contact Phone *</label>
                <input
                  type="text"
                  value={patientForm.contact}
                  onChange={e => setPatientForm({ ...patientForm, contact: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Known Drug Allergies</label>
                <input
                  type="text"
                  value={patientForm.allergies}
                  onChange={e =>
                    setPatientForm({ ...patientForm, allergies: e.target.value })
                  }
                  placeholder="e.g. Penicillin, Sulfa drugs (Leave blank if None)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-rose-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Home Address</label>
                <textarea
                  rows={2}
                  value={patientForm.address}
                  onChange={e => setPatientForm({ ...patientForm, address: e.target.value })}
                  placeholder="Street, City, State..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddPatientOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPatient}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm disabled:opacity-50"
                >
                  {submittingPatient ? 'Registering...' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clinical Prescribing Modal (Doctor Workflow) */}
      {isPrescribeOpen && selectedPatientForRx && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-100 text-sky-800 rounded-lg">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Clinical Prescription: {selectedPatientForRx.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    MRN: {selectedPatientForRx.medicalRecordNumber} • Age: {selectedPatientForRx.age} • Doctor: {user?.fullName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPrescribeOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {rxError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs">
                {rxError}
              </div>
            )}

            <form onSubmit={handleRxSubmit} className="space-y-4 text-xs flex-1 overflow-y-auto">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Clinical Diagnosis *
                </label>
                <input
                  type="text"
                  value={rxForm.diagnosis}
                  onChange={e => setRxForm({ ...rxForm, diagnosis: e.target.value })}
                  placeholder="e.g. Type 2 Diabetes Mellitus with Mild Hypertension"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  required
                />
              </div>

              {/* Medication Lines */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Prescribed Drug Formulations
                  </span>
                  <button
                    type="button"
                    onClick={handleAddRxItem}
                    className="px-2.5 py-1 bg-slate-800 text-white rounded-lg text-[11px] font-semibold hover:bg-slate-900 inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Medication
                  </button>
                </div>

                <div className="space-y-3">
                  {rxForm.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-700">Drug #{idx + 1}</span>
                        {rxForm.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRxItem(idx)}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Medicine
                          </label>
                          <select
                            value={item.medicineId}
                            onChange={e =>
                              handleUpdateRxItem(idx, 'medicineId', e.target.value)
                            }
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          >
                            {medicines.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.genericName})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Dosage
                          </label>
                          <input
                            type="text"
                            value={item.dosage}
                            onChange={e =>
                              handleUpdateRxItem(idx, 'dosage', e.target.value)
                            }
                            placeholder="e.g. 500mg"
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Total Units
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e =>
                              handleUpdateRxItem(
                                idx,
                                'quantity',
                                parseInt(e.target.value, 10) || 0
                              )
                            }
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Frequency & Duration
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={item.frequency}
                              onChange={e =>
                                handleUpdateRxItem(idx, 'frequency', e.target.value)
                              }
                              placeholder="e.g. TID / 3x daily"
                              className="w-1/2 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                            />
                            <input
                              type="text"
                              value={item.duration}
                              onChange={e =>
                                handleUpdateRxItem(idx, 'duration', e.target.value)
                              }
                              placeholder="e.g. 5 days"
                              className="w-1/2 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Patient Instructions
                          </label>
                          <input
                            type="text"
                            value={item.instructions}
                            onChange={e =>
                              handleUpdateRxItem(idx, 'instructions', e.target.value)
                            }
                            placeholder="e.g. Take after food"
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPrescribeOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRx}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-sm disabled:opacity-50"
                >
                  {submittingRx ? 'Submitting...' : 'Issue Prescription to Pharmacy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Patient Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingPatient}
        title="Delete Patient Record"
        itemName={deletingPatient ? `${deletingPatient.name} (${deletingPatient.patientId})` : undefined}
        message="Are you sure you want to delete this patient record? Any associated prescriptions will also be removed."
        confirmText="Yes, Delete Patient"
        onCancel={() => setDeletingPatient(null)}
        onConfirm={async () => {
          if (!deletingPatient) return;
          await api.deletePatient(deletingPatient.id);
          setDeletingPatient(null);
          await fetchData();
        }}
      />

      {/* Delete Prescription Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingRx}
        title="Delete Prescription"
        itemName={deletingRx ? `Rx #${deletingRx.prescriptionNumber} for ${deletingRx.patientName}` : undefined}
        message="Are you sure you want to delete this prescription? This will remove it from the pharmacy dispensing queue."
        confirmText="Yes, Delete Prescription"
        onCancel={() => setDeletingRx(null)}
        onConfirm={async () => {
          if (!deletingRx) return;
          await api.deletePrescription(deletingRx.id);
          setDeletingRx(null);
          await fetchData();
        }}
      />
    </div>
  );
};
