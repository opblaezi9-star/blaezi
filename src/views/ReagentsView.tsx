import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Medicine, MedicineBatch, Category, ReagentConsumptionLog, ColdChainLog } from '../types';
import { useAuth } from '../context/AuthContext';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { formatMonthYear } from '../utils/formatters';
import {
  FlaskConical,
  Search,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  XCircle,
  X,
  Layers,
  Filter,
  ThermometerSnowflake,
  Activity,
  ClipboardCheck,
  History,
  FileSpreadsheet,
  TestTubes,
  Clock,
  Sparkles,
  ShieldCheck,
  Microscope,
  Info,
  Calendar,
  UserCheck,
  Check,
} from 'lucide-react';

export const ReagentsView: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [reagents, setReagents] = useState<Medicine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeViewTab, setActiveViewTab] = useState<'catalog' | 'batches' | 'consumption' | 'coldChain'>('catalog');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedStorage, setSelectedStorage] = useState('All');
  const [selectedQC, setSelectedQC] = useState('All');
  const [stockFilter, setStockFilter] = useState<'all' | 'lowStock' | 'active'>('all');

  // Deletion States
  const [deletingReagent, setDeletingReagent] = useState<Medicine | null>(null);
  const [deletingBatch, setDeletingBatch] = useState<{ reagent: Medicine; batch: MedicineBatch } | null>(null);
  const [deletingLog, setDeletingLog] = useState<ReagentConsumptionLog | null>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReagent, setEditingReagent] = useState<Medicine | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    name: '',
    genericName: '',
    categoryId: '',
    baseNumber: '',
    description: '',
    unit: 'Kit',
    minStockLevel: 5,
    status: 'Active' as 'Active' | 'Inactive',
    department: 'Biochemistry' as any,
    storageCondition: '2°C - 8°C (Refrigerated)' as any,
    targetTemperature: '4°C ± 2°C',
    analyzerCompatibility: '',
    testsPerUnit: 100,
    openVialShelfLifeDays: 30,
    hazardClass: 'Non-Hazardous' as any,
    qcFrequency: 'Daily Calibrator' as any,
    requiresReconstitution: false,
  });

  // Batch Detail Modal
  const [selectedReagentForBatches, setSelectedReagentForBatches] = useState<Medicine | null>(null);

  // Consumption Modal
  const [isConsumeModalOpen, setIsConsumeModalOpen] = useState(false);
  const [consumeReagent, setConsumeReagent] = useState<Medicine | null>(null);
  const [consumeFormData, setConsumeFormData] = useState({
    reagentId: '',
    batchId: '',
    testName: '',
    testsConsumed: 1,
    patientId: '',
    patientName: '',
    prescribedByDoctor: '',
    analyzerUsed: '',
    qcChecked: true,
    remarks: '',
  });

  // Cold Chain Modal
  const [isColdChainModalOpen, setIsColdChainModalOpen] = useState(false);
  const [coldChainData, setColdChainData] = useState<{ storageUnits: any[]; logs: ColdChainLog[] }>({
    storageUnits: [],
    logs: [],
  });
  const [newColdChainLog, setNewColdChainLog] = useState({
    storageUnit: 'Clinical Chemistry Cold Refrigerator (2°C - 8°C)',
    recordedTemperature: 4.0,
    minThreshold: 2.0,
    maxThreshold: 8.0,
    notes: '',
  });

  // Consumption Logs Modal
  const [isConsumptionLogsModalOpen, setIsConsumptionLogsModalOpen] = useState(false);
  const [consumptionLogs, setConsumptionLogs] = useState<ReagentConsumptionLog[]>([]);

  // QC Update Modal
  const [qcModalBatch, setQcModalBatch] = useState<MedicineBatch | null>(null);
  const [qcUpdateData, setQcUpdateData] = useState({
    qcStatus: 'QC Passed',
    qcNotes: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reagRes, catRes, sumRes] = await Promise.all([
        api.getReagents({
          search,
          department: selectedDepartment !== 'All' ? selectedDepartment : undefined,
          storageCondition: selectedStorage !== 'All' ? selectedStorage : undefined,
          qcStatus: selectedQC !== 'All' ? selectedQC : undefined,
          lowStockOnly: stockFilter === 'lowStock' ? 'true' : undefined,
        }),
        api.getCategories(),
        api.getReagentsSummary(),
      ]);

      if (reagRes.success) {
        setReagents(reagRes.reagents);
      }
      if (catRes.success) {
        const reagentCats = catRes.categories.filter((c: Category) => c.type === 'Reagent' || c.name.toLowerCase().includes('reagent') || c.name.toLowerCase().includes('diagnostic') || c.name.toLowerCase().includes('stain'));
        setCategories(reagentCats.length > 0 ? reagentCats : catRes.categories);
      }
      if (sumRes.success) {
        setSummary(sumRes.summary);
      }
    } catch (e) {
      console.error('Error fetching reagents data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, selectedDepartment, selectedStorage, selectedQC, stockFilter]);

  const loadColdChainData = async () => {
    try {
      const res = await api.getColdChain();
      if (res.success) {
        setColdChainData({
          storageUnits: res.storageUnits || [],
          logs: res.logs || [],
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadConsumptionLogs = async () => {
    try {
      const res = await api.getReagentConsumptionLogs();
      if (res.success) {
        setConsumptionLogs(res.logs || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenAdd = () => {
    setEditingReagent(null);
    setFormData({
      name: '',
      genericName: '',
      categoryId: categories[0]?.id || '',
      baseNumber: `REAG-LAB-${Date.now().toString().slice(-4)}`,
      description: '',
      unit: 'Kit',
      minStockLevel: 5,
      status: 'Active',
      department: 'Biochemistry',
      storageCondition: '2°C - 8°C (Refrigerated)',
      targetTemperature: '4°C ± 2°C',
      analyzerCompatibility: '',
      testsPerUnit: 100,
      openVialShelfLifeDays: 30,
      hazardClass: 'Non-Hazardous',
      qcFrequency: 'Daily Calibrator',
      requiresReconstitution: false,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (reag: Medicine) => {
    setEditingReagent(reag);
    setFormData({
      name: reag.name,
      genericName: reag.genericName || reag.name,
      categoryId: reag.categoryId,
      baseNumber: reag.baseNumber,
      description: reag.description || '',
      unit: reag.unit || 'Kit',
      minStockLevel: reag.minStockLevel || 5,
      status: reag.status,
      department: reag.department || 'General Laboratory',
      storageCondition: reag.storageCondition || '2°C - 8°C (Refrigerated)',
      targetTemperature: reag.targetTemperature || '2°C - 8°C',
      analyzerCompatibility: reag.analyzerCompatibility || '',
      testsPerUnit: reag.testsPerUnit || 100,
      openVialShelfLifeDays: reag.openVialShelfLifeDays || 30,
      hazardClass: reag.hazardClass || 'Non-Hazardous',
      qcFrequency: reag.qcFrequency || 'Daily Calibrator',
      requiresReconstitution: !!reag.requiresReconstitution,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim() || !formData.categoryId || !formData.baseNumber.trim()) {
      setFormError('Please fill in all mandatory fields (Name, Category, Item Code).');
      return;
    }

    try {
      setSubmitting(true);
      if (editingReagent) {
        const res = await api.updateReagent(editingReagent.id, formData);
        if (res.success) {
          setIsModalOpen(false);
          fetchData();
        } else {
          setFormError(res.message || 'Failed to update reagent.');
        }
      } else {
        const res = await api.createReagent(formData);
        if (res.success) {
          setIsModalOpen(false);
          fetchData();
        } else {
          setFormError(res.message || 'Failed to create reagent.');
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReagent = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove reagent "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await api.deleteReagent(id);
      if (res.success) {
        fetchData();
      } else {
        alert(res.message || 'Failed to remove reagent.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to remove reagent.');
    }
  };

  const handleOpenConsumeModal = (reag: Medicine) => {
    setConsumeReagent(reag);
    const validBatches = (reag.batches || []).filter(
      b => (b.status === 'Available' || b.status === 'Expiring Soon') && b.currentQuantity > 0
    );
    const defaultBatch = validBatches[0];

    // Quick test name presets based on department
    let defaultTestName = `${reag.name} Diagnostic Test`;
    if (reag.department === 'Hematology') defaultTestName = 'Complete Blood Count (CBC) with 5-Part Diff';
    else if (reag.department === 'Biochemistry' && reag.name.toLowerCase().includes('glucose')) defaultTestName = 'Fasting Blood Glucose (FBG)';
    else if (reag.department === 'Biochemistry' && reag.name.toLowerCase().includes('lipid')) defaultTestName = 'Lipid Profile Panel (Cholesterol / Triglycerides)';
    else if (reag.department === 'Blood Bank') defaultTestName = 'ABO & Rh Blood Grouping & Crossmatch';
    else if (reag.name.toLowerCase().includes('malaria')) defaultTestName = 'Rapid Malaria Antigen Card (Pf/Pv)';
    else if (reag.department === 'Urinalysis') defaultTestName = 'Routine Urinalysis 10-Parameter Dipstick';
    else if (reag.department === 'Microbiology') defaultTestName = 'Gram Stain Microscopic Smear Examination';

    setConsumeFormData({
      reagentId: reag.id,
      batchId: defaultBatch?.id || '',
      testName: defaultTestName,
      testsConsumed: reag.department === 'Hematology' ? 10 : 1,
      patientId: 'PAT-2026-001',
      patientName: 'James Wilson',
      prescribedByDoctor: 'Dr. Gregory House, MD',
      analyzerUsed: reag.analyzerCompatibility || 'Benchtop Lab Station',
      qcChecked: true,
      remarks: 'Internal control valid. Routine clinical diagnostic run.',
    });
    setIsConsumeModalOpen(true);
  };

  const handleConsumeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consumeFormData.reagentId || !consumeFormData.testName.trim() || Number(consumeFormData.testsConsumed) <= 0) {
      alert('Please provide a valid test name and test consumption count.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.consumeReagent(consumeFormData);
      if (res.success) {
        setIsConsumeModalOpen(false);
        fetchData();
      } else {
        alert(res.message || 'Failed to record consumption.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to record consumption.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnsealBatch = async (batchId: string, days?: number) => {
    try {
      const res = await api.unsealReagentBatch({ batchId, shelfLifeDays: days });
      if (res.success) {
        alert(res.message);
        fetchData();
        if (selectedReagentForBatches) {
          const updatedMed = await api.getReagentById(selectedReagentForBatches.id);
          if (updatedMed.success) setSelectedReagentForBatches(updatedMed.reagent);
        }
      } else {
        alert(res.message || 'Failed to unseal batch.');
      }
    } catch (e: any) {
      alert(e.message || 'Failed to unseal batch.');
    }
  };

  const handleOpenQcModal = (batch: MedicineBatch) => {
    setQcModalBatch(batch);
    setQcUpdateData({
      qcStatus: batch.qcStatus || 'QC Passed',
      qcNotes: batch.qcNotes || 'Calibration curve and control run verified within ±1.5 SD.',
    });
  };

  const handleQcSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qcModalBatch) return;

    try {
      const res = await api.updateReagentQC({
        batchId: qcModalBatch.id,
        qcStatus: qcUpdateData.qcStatus,
        qcNotes: qcUpdateData.qcNotes,
      });
      if (res.success) {
        setQcModalBatch(null);
        fetchData();
        if (selectedReagentForBatches) {
          const updatedMed = await api.getReagentById(selectedReagentForBatches.id);
          if (updatedMed.success) setSelectedReagentForBatches(updatedMed.reagent);
        }
      } else {
        alert(res.message || 'Failed to update QC status.');
      }
    } catch (e: any) {
      alert(e.message || 'Failed to update QC status.');
    }
  };

  const handleColdChainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.logColdChainTemperature(newColdChainLog);
      if (res.success) {
        alert(res.message);
        loadColdChainData();
        fetchData();
      } else {
        alert(res.message || 'Failed to log temperature.');
      }
    } catch (e: any) {
      alert(e.message || 'Failed to log temperature.');
    }
  };

  const exportReagentsCSV = () => {
    const headers = [
      'Reagent Code',
      'Name',
      'Generic Name',
      'Department',
      'Storage Condition',
      'Target Temp',
      'Current Stock (Kits)',
      'Tests Available',
      'Min Stock Level',
      'Earliest Expiry (FEFO)',
      'Analyzer Compatibility',
      'Status',
    ];

    const rows = reagents.map(r => [
      r.baseNumber,
      `"${r.name.replace(/"/g, '""')}"`,
      `"${(r.genericName || '').replace(/"/g, '""')}"`,
      r.department || 'General Laboratory',
      r.storageCondition || 'Refrigerated',
      r.targetTemperature || '2-8°C',
      r.currentStock ?? 0,
      r.totalTestsAvailable ?? 0,
      r.minStockLevel,
      formatMonthYear(r.earliestExpiry),
      `"${(r.analyzerCompatibility || '').replace(/"/g, '""')}"`,
      r.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `laboratory_reagents_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDepartmentBadgeColor = (dept?: string) => {
    switch (dept) {
      case 'Hematology':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Biochemistry':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Blood Bank':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Immunology / Serology':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Microbiology':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Urinalysis':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStorageBadge = (storage?: string) => {
    if (storage?.includes('2°C - 8°C')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
          <ThermometerSnowflake className="w-3 h-3 text-blue-600 shrink-0" />
          2°C - 8°C (Cold)
        </span>
      );
    }
    if (storage?.includes('-20°C')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
          <ThermometerSnowflake className="w-3 h-3 text-indigo-600 shrink-0" />
          -20°C (Deep Freeze)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-50 text-slate-700 border border-slate-200">
        15°C - 25°C (Ambient)
      </span>
    );
  };

  const getQcBadge = (qc?: string) => {
    switch (qc) {
      case 'QC Passed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            QC Passed
          </span>
        );
      case 'Calibrated':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Sparkles className="w-3 h-3 text-blue-600" />
            Calibrated
          </span>
        );
      case 'Pending QC':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Pending QC
          </span>
        );
      case 'Failed QC':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            Failed QC
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-50 text-slate-600 border border-slate-200">
            Ready-to-Use
          </span>
        );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Laboratory Reagents & Diagnostic Kits
              </h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
                FEFO & Cold Chain
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive inventory tracking for clinical reagents, test yields, open-vial stability, quality calibrators, and cold storage.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              loadColdChainData();
              setIsColdChainModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors shadow-2xs"
          >
            <ThermometerSnowflake className="w-4 h-4 text-blue-600" />
            Cold Chain Status
          </button>

          <button
            onClick={() => {
              loadConsumptionLogs();
              setIsConsumptionLogsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors shadow-2xs"
          >
            <History className="w-4 h-4 text-slate-600" />
            Consumption Audit
          </button>

          <button
            onClick={exportReagentsCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export CSV
          </button>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-sky-600 text-white hover:bg-sky-700 shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Register New Reagent
          </button>
        </div>
      </div>

      {/* KPI Highlights Bar */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <TestTubes className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Reagents</div>
              <div className="text-xl font-black text-slate-900 leading-tight">
                {summary.totalReagents}{' '}
                <span className="text-xs font-normal text-slate-400">({summary.activeReagents} active)</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Stock In Kits</div>
              <div className="text-xl font-black text-emerald-700 leading-tight">
                {summary.totalKitsUnits}{' '}
                <span className="text-xs font-normal text-emerald-600">packs</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Est. Test Capacity</div>
              <div className="text-xl font-black text-indigo-700 leading-tight">
                {summary.totalTestsRemaining.toLocaleString()}{' '}
                <span className="text-xs font-normal text-indigo-500">tests</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Open Vials Active</div>
              <div className="text-xl font-black text-amber-700 leading-tight">
                {summary.openVialsCount}{' '}
                <span className="text-xs font-normal text-amber-600">
                  ({summary.openVialsNearExpiryCount} near exp)
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ThermometerSnowflake className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cold Chain Stability</div>
              <div className="text-sm font-black text-blue-700 leading-tight flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Optimal (2°-8°C)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Primary Category Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 shadow-2xs overflow-x-auto">
        <button
          onClick={() => setActiveViewTab('catalog')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeViewTab === 'catalog'
              ? 'bg-white text-sky-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FlaskConical className="w-4 h-4 text-sky-600" />
          <span>Reagents Catalog</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-100 text-sky-800">
            {reagents.length}
          </span>
        </button>

        <button
          onClick={() => setActiveViewTab('batches')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeViewTab === 'batches'
              ? 'bg-white text-indigo-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Boxes className="w-4 h-4 text-indigo-600" />
          <span>Batch Lots & Expirations (FEFO)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-100 text-indigo-800">
            {reagents.reduce((acc, r) => acc + (r.batches?.length || 0), 0)}
          </span>
        </button>

        <button
          onClick={() => {
            loadConsumptionLogs();
            setActiveViewTab('consumption');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeViewTab === 'consumption'
              ? 'bg-white text-emerald-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4 text-emerald-600" />
          <span>Diagnostic Test Runs</span>
        </button>

        <button
          onClick={() => {
            loadColdChainData();
            setActiveViewTab('coldChain');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeViewTab === 'coldChain'
              ? 'bg-white text-blue-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ThermometerSnowflake className="w-4 h-4 text-blue-600" />
          <span>Cold Chain & Storage Units</span>
        </button>
      </div>

      {/* VIEW TAB 1: REAGENTS CATALOG */}
      {activeViewTab === 'catalog' && (
        <>
          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by reagent name, code (REAG-...), analyzer, or formula..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-slate-900"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              {/* Department Filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedDepartment}
                  onChange={e => setSelectedDepartment(e.target.value)}
                  className="px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium text-slate-800"
                >
                  <option value="All">All Departments</option>
                  <option value="Biochemistry">Biochemistry</option>
                  <option value="Hematology">Hematology</option>
                  <option value="Blood Bank">Blood Bank</option>
                  <option value="Immunology / Serology">Immunology / Serology</option>
                  <option value="Microbiology">Microbiology</option>
                  <option value="Urinalysis">Urinalysis</option>
                  <option value="General Laboratory">General Laboratory</option>
                </select>
              </div>

              {/* Storage Filter */}
              <select
                value={selectedStorage}
                onChange={e => setSelectedStorage(e.target.value)}
                className="px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium text-slate-800"
              >
                <option value="All">All Storage Conditions</option>
                <option value="2°C - 8°C (Refrigerated)">2°C - 8°C (Refrigerated)</option>
                <option value="-20°C (Deep Freezer)">-20°C (Deep Freezer)</option>
                <option value="15°C - 25°C (Room Temp)">15°C - 25°C (Room Temp)</option>
                <option value="2°C - 30°C (Cool & Dry)">2°C - 30°C (Cool & Dry)</option>
              </select>

              {/* Stock Filter Switcher */}
              <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200/80">
                <button
                  onClick={() => setStockFilter('all')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    stockFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All Items
                </button>
                <button
                  onClick={() => setStockFilter('lowStock')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                    stockFilter === 'lowStock'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-rose-600 hover:bg-rose-50'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  Low Stock
                </button>
              </div>
            </div>
          </div>

          {/* Main Reagents Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
                <FlaskConical className="w-8 h-8 animate-bounce text-sky-500" />
                <span className="text-sm font-medium">Loading laboratory reagent catalog and batch yields...</span>
              </div>
            ) : reagents.length === 0 ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-3">
                <FlaskConical className="w-10 h-10 text-slate-300" />
                <div className="text-base font-semibold text-slate-700">No Laboratory Reagents Found</div>
                <p className="text-xs text-slate-400 max-w-md">
                  No reagents match your current search filters. Clear filters or register a new diagnostic reagent.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Item Code & Name</th>
                      <th className="py-3.5 px-4">Department & Storage</th>
                      <th className="py-3.5 px-4">Stock & Test Yield</th>
                      <th className="py-3.5 px-4">FEFO Expiry (MM/YY)</th>
                      <th className="py-3.5 px-4">Open-Vial & QC State</th>
                      <th className="py-3.5 px-4">Analyzer</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {reagents.map(reag => {
                      const activeBatches = reag.batches || [];
                      const openBatch = activeBatches.find(b => b.isOpenVial && b.status !== 'Expired' && b.status !== 'Depleted');

                      return (
                        <tr key={reag.id} className="hover:bg-slate-50/60 transition-colors group">
                          <td className="py-3.5 px-4">
                            <div className="flex items-start gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 border border-sky-100">
                                <FlaskConical className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                                    {reag.name}
                                  </span>
                                  {reag.isLowStock && (
                                    <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase rounded bg-rose-100 text-rose-700 border border-rose-200">
                                      Low Stock
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500">{reag.genericName}</div>
                                <div className="text-[10px] font-mono text-slate-400 mt-0.5">{reag.baseNumber}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <span
                                className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full border ${getDepartmentBadgeColor(
                                  reag.department
                                )}`}
                              >
                                {reag.department || 'General Lab'}
                              </span>
                              <div>{getStorageBadge(reag.storageCondition)}</div>
                              {reag.targetTemperature && (
                                <div className="text-[10px] text-slate-400 font-mono">
                                  Target: {reag.targetTemperature}
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div>
                              <div className="font-bold text-slate-900 text-sm">
                                {reag.currentStock ?? 0}{' '}
                                <span className="text-xs font-normal text-slate-500">{reag.unit}</span>
                              </div>
                              <div className="text-[11px] font-semibold text-indigo-600 flex items-center gap-1 mt-0.5">
                                <Activity className="w-3 h-3" />
                                ~{(reag.totalTestsAvailable ?? 0).toLocaleString()} tests
                              </div>
                              <div className="text-[10px] text-slate-400">Min Threshold: {reag.minStockLevel} kits</div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div>
                              <div className="font-mono font-medium text-slate-800">
                                {formatMonthYear(reag.earliestExpiry)}
                              </div>
                              {reag.hasExpiringSoon && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-1">
                                  <AlertTriangle className="w-3 h-3" /> Expiring Soon
                                </span>
                              )}
                              {reag.hasExpired && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 mt-1">
                                  <XCircle className="w-3 h-3" /> Expired Lots
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="space-y-1.5">
                              {openBatch ? (
                                <div className="p-1.5 rounded-lg bg-amber-50/80 border border-amber-200/80">
                                  <div className="flex items-center gap-1 text-[10px] font-bold text-amber-900">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    Open Lot: {openBatch.batchNumber}
                                  </div>
                                  <div className="text-[10px] text-amber-700">
                                    Stability: {formatMonthYear(openBatch.openVialExpiryDate) !== 'N/A' ? formatMonthYear(openBatch.openVialExpiryDate) : 'Active'}
                                  </div>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                  <ShieldCheck className="w-3 h-3 text-slate-400" /> All Lots Sealed
                                </span>
                              )}

                              <div>
                                {getQcBadge(
                                  activeBatches[0]?.qcStatus || 'QC Passed'
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="max-w-[140px] truncate text-[11px] text-slate-600" title={reag.analyzerCompatibility}>
                              {reag.analyzerCompatibility || 'Manual / Universal'}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenConsumeModal(reag)}
                                title="Record Test Consumption"
                                className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-2xs font-semibold text-[11px] flex items-center gap-1"
                              >
                                <FlaskConical className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Run Test</span>
                              </button>

                              <button
                                onClick={() => setSelectedReagentForBatches(reag)}
                                title="View Batch Lots & FEFO"
                                className="p-1.5 rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-2xs"
                              >
                                <Boxes className="w-3.5 h-3.5" />
                              </button>

                          <button
                            onClick={() => handleOpenEdit(reag)}
                            title="Edit Specifications"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDeletingReagent(reag)}
                            title="Delete Reagent"
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* VIEW TAB 2: ACTIVE BATCH LOTS (FEFO) */}
      {activeViewTab === 'batches' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Active Laboratory Reagent Lots & FEFO Schedule</h3>
              <p className="text-xs text-slate-500">First-Expiry First-Out rotation with live open-vial stability tracking</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Lot # & Item Code</th>
                  <th className="py-3 px-3">Reagent Name & Dept</th>
                  <th className="py-3 px-3">Manufacturer Expiry (MM/YY)</th>
                  <th className="py-3 px-3">Open-Vial Status</th>
                  <th className="py-3 px-3 text-right">Available Kits</th>
                  <th className="py-3 px-3 text-right">Est. Test Capacity</th>
                  <th className="py-3 px-3 text-center">QC Status</th>
                  <th className="py-3 px-3">Storage Unit</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {reagents.flatMap(r => (r.batches || []).map(b => ({ ...b, reagent: r }))).length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No active reagent lots found in the system.
                    </td>
                  </tr>
                ) : (
                  reagents.flatMap(r => (r.batches || []).map(b => ({ ...b, reagent: r }))).map(b => (
                    <tr key={b.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900">{b.batchNumber}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{b.reagent.baseNumber}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{b.reagent.name}</div>
                        <span className={`inline-block px-1.5 py-0.2 text-[9px] font-bold rounded border ${getDepartmentBadgeColor(b.reagent.department)}`}>
                          {b.reagent.department || 'General'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold">
                        <span className={b.status === 'Expired' ? 'text-rose-600 font-bold' : b.status === 'Expiring Soon' ? 'text-amber-600 font-bold' : 'text-slate-800'}>
                          {formatMonthYear(b.expiryDate)}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {b.isOpenVial ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" /> Unsealed
                            </span>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Exp: {formatMonthYear(b.openVialExpiryDate)}
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleUnsealBatch(b.id, b.reagent.openVialShelfLifeDays)}
                            className="px-2 py-1 text-[10px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded border border-sky-200 transition-colors"
                          >
                            Unseal Kit
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900">
                        {b.currentQuantity} / {b.quantityReceived} kits
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-indigo-600">
                        ~{((b.currentQuantity) * (b.testsPerUnit || b.reagent.testsPerUnit || 1)).toLocaleString()} tests
                      </td>
                      <td className="py-3 px-3 text-center">
                        {getQcBadge(b.qcStatus)}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {b.storageLocation || b.reagent.storageCondition}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenQcModal(b)}
                          className="px-2 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors"
                        >
                          QC Notes
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

      {/* VIEW TAB 3: DIAGNOSTIC CONSUMPTION LOGS */}
      {activeViewTab === 'consumption' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Laboratory Diagnostic Test Consumption Audit</h3>
              <p className="text-xs text-slate-500">Live ledger of clinical test executions and lot subtractions</p>
            </div>
            <button
              onClick={() => {
                const first = reagents[0];
                if (first) handleOpenConsumeModal(first);
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              Log Diagnostic Test
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Reagent & Batch</th>
                  <th className="py-3 px-3">Test Name & Dept</th>
                  <th className="py-3 px-3">Tests Consumed</th>
                  <th className="py-3 px-3">Patient / Case</th>
                  <th className="py-3 px-3">Performed By</th>
                  <th className="py-3 px-3">QC Verified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {consumptionLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No consumption records logged yet. Click "Log Diagnostic Test" to execute test runs.
                    </td>
                  </tr>
                ) : (
                  consumptionLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3 font-mono text-slate-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{log.reagentName}</div>
                        <div className="text-[10px] font-mono text-slate-400">Lot: {log.batchNumber}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{log.testName}</div>
                        <span className={`inline-block px-1.5 py-0.2 text-[9px] font-bold rounded border mt-0.5 ${getDepartmentBadgeColor(log.department)}`}>
                          {log.department}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-black text-emerald-700">{log.testsConsumed} tests</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-800 font-medium">{log.patientName || 'Routine Lab Test'}</div>
                        {log.prescribedByDoctor && (
                          <div className="text-[10px] text-slate-400">Rx: {log.prescribedByDoctor}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-medium">{log.performedByUserName}</td>
                      <td className="py-3 px-3">
                        {log.qcChecked ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" /> QC Valid
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Unchecked</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW TAB 4: COLD CHAIN & STORAGE UNITS */}
      {activeViewTab === 'coldChain' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {coldChainData.storageUnits.map((unit, idx) => (
              <div key={idx} className="p-4 rounded-2xl border border-blue-100 bg-white shadow-2xs space-y-2">
                <div className="text-xs font-bold text-slate-800 truncate" title={unit.unitName}>
                  {unit.unitName}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-blue-900">{unit.currentTemp}°C</span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    {unit.status}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500">Target Spec: {unit.recommendedRange}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <form onSubmit={handleColdChainSubmit} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                Log Manual Temperature Reading
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Storage Unit</label>
                  <select
                    value={newColdChainLog.storageUnit}
                    onChange={e => setNewColdChainLog({ ...newColdChainLog, storageUnit: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-medium text-slate-800"
                  >
                    <option value="Clinical Chemistry Cold Refrigerator (2°C - 8°C)">Clinical Chemistry Fridge (2-8°C)</option>
                    <option value="Blood Bank Refrigerator (2°C - 6°C)">Blood Bank Refrigerator (2-6°C)</option>
                    <option value="Deep Vaccine & Control Specimen Freezer (-20°C)">Deep Freezer (-20°C)</option>
                    <option value="Serology & Ambient Storage Cabinet (15°C - 25°C)">Ambient Cabinet (15-25°C)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Recorded Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newColdChainLog.recordedTemperature}
                    onChange={e => setNewColdChainLog({ ...newColdChainLog, recordedTemperature: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Notes / Action</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newColdChainLog.notes}
                      onChange={e => setNewColdChainLog({ ...newColdChainLog, notes: e.target.value })}
                      placeholder="Routine check..."
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shrink-0"
                    >
                      Log Reading
                    </button>
                  </div>
                </div>
              </div>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Storage Unit</th>
                    <th className="py-2.5 px-3">Temperature</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Logged By</th>
                    <th className="py-2.5 px-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {coldChainData.logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{log.storageUnit}</td>
                      <td className="py-2.5 px-3 font-black text-slate-900">{log.recordedTemperature}°C</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.status === 'Normal'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{log.recordedBy}</td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">{log.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT REAGENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingReagent ? 'Edit Laboratory Reagent Specifications' : 'Register New Diagnostic Reagent'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configure clinical properties, storage criteria, test yield, and open-vial shelf life.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Reagent Name & Pack Size <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Sysmex Cellpack DCL Hematology Diluent 20L"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Generic / Chemical Formula</label>
                  <input
                    type="text"
                    value={formData.genericName}
                    onChange={e => setFormData({ ...formData, genericName: e.target.value })}
                    placeholder="e.g. Buffered Isotonic Electrolyte Solution"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Item / Catalog Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.baseNumber}
                    onChange={e => setFormData({ ...formData, baseNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. REAG-HEM-DCL"
                    className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Laboratory Department <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.department}
                    onChange={e => setFormData({ ...formData, department: e.target.value as any })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 font-medium text-slate-800"
                  >
                    <option value="Biochemistry">Biochemistry</option>
                    <option value="Hematology">Hematology</option>
                    <option value="Blood Bank">Blood Bank</option>
                    <option value="Immunology / Serology">Immunology / Serology</option>
                    <option value="Microbiology">Microbiology</option>
                    <option value="Urinalysis">Urinalysis</option>
                    <option value="Clinical Pathology">Clinical Pathology</option>
                    <option value="Molecular Diagnostics">Molecular Diagnostics</option>
                    <option value="General Laboratory">General Laboratory</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 font-medium text-slate-800"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Storage Condition</label>
                  <select
                    value={formData.storageCondition}
                    onChange={e => setFormData({ ...formData, storageCondition: e.target.value as any })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 font-medium text-slate-800"
                  >
                    <option value="2°C - 8°C (Refrigerated)">2°C - 8°C (Refrigerated Cold Room / Fridge)</option>
                    <option value="-20°C (Deep Freezer)">-20°C (Deep Freezer)</option>
                    <option value="15°C - 25°C (Room Temp)">15°C - 25°C (Ambient Room Temperature)</option>
                    <option value="2°C - 30°C (Cool & Dry)">2°C - 30°C (Cool & Dry Cabinet)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Temperature Spec</label>
                  <input
                    type="text"
                    value={formData.targetTemperature}
                    onChange={e => setFormData({ ...formData, targetTemperature: e.target.value })}
                    placeholder="e.g. 4°C ± 2°C (Lab Fridge A)"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tests Per Pack / Yield</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.testsPerUnit}
                    onChange={e => setFormData({ ...formData, testsPerUnit: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Open-Vial Shelf Life (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.openVialShelfLifeDays}
                    onChange={e => setFormData({ ...formData, openVialShelfLifeDays: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Minimum Stock Level (Kits)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStockLevel}
                    onChange={e => setFormData({ ...formData, minStockLevel: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">QC & Calibration Cadence</label>
                  <select
                    value={formData.qcFrequency}
                    onChange={e => setFormData({ ...formData, qcFrequency: e.target.value as any })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 font-medium text-slate-800"
                  >
                    <option value="Daily Calibrator">Daily Calibrator (Every 24h)</option>
                    <option value="Per Batch Run">Per Batch Run</option>
                    <option value="Weekly">Weekly Multi-Level Control</option>
                    <option value="Ready-to-Use">Ready-to-Use / Internal Control Pad</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Analyzer & Machine Compatibility</label>
                  <input
                    type="text"
                    value={formData.analyzerCompatibility}
                    onChange={e => setFormData({ ...formData, analyzerCompatibility: e.target.value })}
                    placeholder="e.g. Sysmex XN-550 / Cobas c311 / Mindray BS-240 / Manual Staining"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Clinical Instructions & Notes</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Specific reconstitution, safety, or storage details..."
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-900"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">Operational Status</div>
                  <div className="text-[11px] text-slate-500">Active reagents are available for test consumption</div>
                </div>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                  className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive / Suspended</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-between gap-2.5">
                {editingReagent ? (
                  <button
                    type="button"
                    onClick={() => {
                      const r = editingReagent;
                      setIsModalOpen(false);
                      setDeletingReagent(r);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Reagent
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                  >
                    {submitting ? 'Saving Reagent...' : editingReagent ? 'Save Changes' : 'Register Reagent'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD LAB TEST CONSUMPTION MODAL */}
      {isConsumeModalOpen && consumeReagent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-emerald-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Record Test Consumption</h3>
                  <p className="text-xs text-slate-500">
                    Deduct tests executed under FEFO lot priority with clinical traceability.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConsumeModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConsumeSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs font-bold text-slate-800">{consumeReagent.name}</div>
                <div className="text-[11px] text-slate-500">
                  Department: <span className="font-semibold text-slate-700">{consumeReagent.department}</span> |
                  Stock: <span className="font-semibold text-emerald-600">{consumeReagent.currentStock} kits</span> (~
                  {(consumeReagent.totalTestsAvailable ?? 0).toLocaleString()} tests available)
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Diagnostic Test Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={consumeFormData.testName}
                    onChange={e => setConsumeFormData({ ...consumeFormData, testName: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tests Performed (Count) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={consumeFormData.testsConsumed}
                    onChange={e => setConsumeFormData({ ...consumeFormData, testsConsumed: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900 font-black text-emerald-700 text-base"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Lot / Batch</label>
                  <select
                    value={consumeFormData.batchId}
                    onChange={e => setConsumeFormData({ ...consumeFormData, batchId: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
                  >
                    {(consumeReagent.batches || []).map(b => (
                      <option key={b.id} value={b.id}>
                        {b.batchNumber} (Exp: {formatMonthYear(b.expiryDate)}{b.isOpenVial ? ' - Open' : ''}) - {b.currentQuantity} in stock
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Patient Name / Record</label>
                  <input
                    type="text"
                    value={consumeFormData.patientName}
                    onChange={e => setConsumeFormData({ ...consumeFormData, patientName: e.target.value })}
                    placeholder="e.g. James Wilson (or Routine OPD)"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ordering Doctor</label>
                  <input
                    type="text"
                    value={consumeFormData.prescribedByDoctor}
                    onChange={e => setConsumeFormData({ ...consumeFormData, prescribedByDoctor: e.target.value })}
                    placeholder="e.g. Dr. Gregory House, MD"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Analyzer / Lab Bench Station</label>
                  <input
                    type="text"
                    value={consumeFormData.analyzerUsed}
                    onChange={e => setConsumeFormData({ ...consumeFormData, analyzerUsed: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">Quality Control (QC) Verified</div>
                  <div className="text-[11px] text-slate-500">Internal run controls and calibrators valid</div>
                </div>
                <input
                  type="checkbox"
                  checked={consumeFormData.qcChecked}
                  onChange={e => setConsumeFormData({ ...consumeFormData, qcChecked: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsConsumeModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                >
                  {submitting ? 'Recording...' : 'Deduct & Record Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REAGENT BATCHES / LOTS DRAWER MODAL */}
      {selectedReagentForBatches && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Batch Lots & Quality Control: {selectedReagentForBatches.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Item Code: {selectedReagentForBatches.baseNumber} | Department: {selectedReagentForBatches.department}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReagentForBatches(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-3">Batch Lot #</th>
                      <th className="py-3 px-3">Expiry Date (MM/YY)</th>
                      <th className="py-3 px-3">Stock Units</th>
                      <th className="py-3 px-3">Open-Vial Status</th>
                      <th className="py-3 px-3">QC Status</th>
                      <th className="py-3 px-3">Storage Location</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {(selectedReagentForBatches.batches || []).map(b => (
                      <tr key={b.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">
                          {b.batchNumber}
                        </td>
                        <td className="py-3 px-3 font-mono">
                          <span
                            className={`font-semibold ${
                              b.status === 'Expired'
                                ? 'text-rose-600'
                                : b.status === 'Expiring Soon'
                                ? 'text-amber-600'
                                : 'text-slate-800'
                            }`}
                          >
                            {formatMonthYear(b.expiryDate)}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">
                            {b.currentQuantity} / {b.quantityReceived} kits
                          </div>
                          <div className="text-[10px] text-slate-400">
                            ~{((b.currentQuantity) * (b.testsPerUnit || selectedReagentForBatches.testsPerUnit || 1)).toLocaleString()} tests
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {b.isOpenVial ? (
                            <div className="text-[11px]">
                              <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <Clock className="w-3 h-3" /> Unsealed
                              </span>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                Exp: {formatMonthYear(b.openVialExpiryDate)}
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleUnsealBatch(b.id, selectedReagentForBatches.openVialShelfLifeDays)}
                              className="px-2 py-1 text-[11px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded border border-sky-200 transition-colors"
                            >
                              Unseal / Open Kit
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div>
                            {getQcBadge(b.qcStatus)}
                            {b.qcNotes && (
                              <div className="text-[10px] text-slate-500 max-w-xs truncate mt-0.5" title={b.qcNotes}>
                                {b.qcNotes}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600 text-[11px]">
                          {b.storageLocation || selectedReagentForBatches.storageCondition}
                        </td>
                        <td className="py-3 px-3 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenQcModal(b)}
                            className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors"
                          >
                            Update QC
                          </button>
                          <button
                            onClick={() => setDeletingBatch({ reagent: selectedReagentForBatches, batch: b })}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors inline-flex items-center"
                            title="Delete Batch Lot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QC STATUS UPDATE MODAL */}
      {qcModalBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-indigo-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Update QC Verification</h3>
                  <p className="text-xs text-slate-500">Batch Lot: {qcModalBatch.batchNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setQcModalBatch(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQcSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Quality Control Status</label>
                <select
                  value={qcUpdateData.qcStatus}
                  onChange={e => setQcUpdateData({ ...qcUpdateData, qcStatus: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                >
                  <option value="QC Passed">QC Passed (Within 2 SD Control Range)</option>
                  <option value="Calibrated">Calibrated (Multi-Point Baseline Valid)</option>
                  <option value="Pending QC">Pending QC Run</option>
                  <option value="Failed QC">Failed QC (Out of Calibration / Excluded)</option>
                  <option value="Ready-to-Use">Ready-to-Use / Standard</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Calibrator / Control Notes</label>
                <textarea
                  rows={3}
                  value={qcUpdateData.qcNotes}
                  onChange={e => setQcUpdateData({ ...qcUpdateData, qcNotes: e.target.value })}
                  placeholder="Record commercial control standard results, optical density, or calibration factor..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setQcModalBatch(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-all"
                >
                  Save QC Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COLD CHAIN MONITORING MODAL */}
      {isColdChainModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-blue-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <ThermometerSnowflake className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Cold Chain Temperature Management</h3>
                  <p className="text-xs text-slate-500">
                    Live laboratory refrigerator status and digital temperature excursion log.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsColdChainModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Storage Units Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {coldChainData.storageUnits.map((unit, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-blue-100 bg-blue-50/40 space-y-2">
                    <div className="text-[11px] font-bold text-slate-800 truncate" title={unit.unitName}>
                      {unit.unitName}
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-blue-900">{unit.currentTemp}°C</span>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        {unit.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">Target Range: {unit.recommendedRange}</div>
                  </div>
                ))}
              </div>

              {/* Log New Temperature Form */}
              <form onSubmit={handleColdChainSubmit} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  Log Manual Temperature Reading
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Storage Unit</label>
                    <select
                      value={newColdChainLog.storageUnit}
                      onChange={e => setNewColdChainLog({ ...newColdChainLog, storageUnit: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-medium text-slate-800"
                    >
                      <option value="Clinical Chemistry Cold Refrigerator (2°C - 8°C)">Clinical Chemistry Fridge (2-8°C)</option>
                      <option value="Blood Bank Refrigerator (2°C - 6°C)">Blood Bank Refrigerator (2-6°C)</option>
                      <option value="Deep Vaccine & Control Specimen Freezer (-20°C)">Deep Freezer (-20°C)</option>
                      <option value="Serology & Ambient Storage Cabinet (15°C - 25°C)">Ambient Cabinet (15-25°C)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Recorded Temp (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={newColdChainLog.recordedTemperature}
                      onChange={e => setNewColdChainLog({ ...newColdChainLog, recordedTemperature: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Notes / Action</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newColdChainLog.notes}
                        onChange={e => setNewColdChainLog({ ...newColdChainLog, notes: e.target.value })}
                        placeholder="Routine morning check..."
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shrink-0"
                      >
                        Log
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              {/* Historical Logs Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Storage Unit</th>
                      <th className="py-2.5 px-3">Temperature</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Logged By</th>
                      <th className="py-2.5 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {coldChainData.logs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{log.storageUnit}</td>
                        <td className="py-2.5 px-3 font-black text-slate-900">{log.recordedTemperature}°C</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.status === 'Normal'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{log.recordedBy}</td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">{log.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONSUMPTION AUDIT LOGS MODAL */}
      {isConsumptionLogsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-xs">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Laboratory Consumption Audit Ledger</h3>
                  <p className="text-xs text-slate-500">
                    Comprehensive log of all laboratory diagnostic test consumption and FEFO lot deductions.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConsumptionLogsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-3">Date & Time</th>
                      <th className="py-3 px-3">Reagent & Batch</th>
                      <th className="py-3 px-3">Test Name & Dept</th>
                      <th className="py-3 px-3">Tests Consumed</th>
                      <th className="py-3 px-3">Patient / Case</th>
                      <th className="py-3 px-3">Performed By</th>
                      <th className="py-3 px-3">QC Verified</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {consumptionLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3 font-mono text-slate-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{log.reagentName}</div>
                          <div className="text-[10px] font-mono text-slate-400">Lot: {log.batchNumber}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">{log.testName}</div>
                          <span
                            className={`inline-block px-1.5 py-0.2 text-[9px] font-bold rounded border mt-0.5 ${getDepartmentBadgeColor(
                              log.department
                            )}`}
                          >
                            {log.department}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-black text-emerald-700">{log.testsConsumed} tests</span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-slate-800 font-medium">{log.patientName || 'Routine Lab Test'}</div>
                          {log.prescribedByDoctor && (
                            <div className="text-[10px] text-slate-400">Rx: {log.prescribedByDoctor}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">{log.performedByUserName}</td>
                        <td className="py-3 px-3">
                          {log.qcChecked ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-600" /> QC Valid
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Unchecked</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => setDeletingLog(log)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center"
                            title="Delete Consumption Log Entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Reagent Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingReagent}
        title="Delete Laboratory Reagent"
        itemName={deletingReagent?.name}
        message="Are you sure you want to delete this reagent from the laboratory catalog? All associated batch lots, open vial tracking, and test yields will be removed."
        confirmText="Yes, Delete Reagent"
        onCancel={() => setDeletingReagent(null)}
        onConfirm={async () => {
          if (!deletingReagent) return;
          await api.deleteReagent(deletingReagent.id);
          setDeletingReagent(null);
          await fetchData();
        }}
      />

      {/* Delete Batch Lot Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingBatch}
        title="Delete Batch Lot"
        itemName={deletingBatch ? `Lot #${deletingBatch.batch.batchNumber} (${deletingBatch.reagent.name})` : undefined}
        message="Are you sure you want to delete this batch lot? This will remove the inventory record and deduction history."
        confirmText="Yes, Delete Lot"
        onCancel={() => setDeletingBatch(null)}
        onConfirm={async () => {
          if (!deletingBatch) return;
          await api.deleteBatch(deletingBatch.batch.id);
          const currentReagentId = deletingBatch.reagent.id;
          setDeletingBatch(null);
          await fetchData();
          if (selectedReagentForBatches && selectedReagentForBatches.id === currentReagentId) {
            const updated = await api.getReagentById(currentReagentId);
            if (updated.success) setSelectedReagentForBatches(updated.reagent);
          }
        }}
      />

      {/* Delete Consumption Log Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingLog}
        title="Delete Test Consumption Record"
        itemName={deletingLog ? `${deletingLog.testName} (${deletingLog.testsConsumed} tests)` : undefined}
        message="Are you sure you want to delete this test consumption record from the audit ledger?"
        confirmText="Yes, Delete Record"
        onCancel={() => setDeletingLog(null)}
        onConfirm={async () => {
          if (!deletingLog) return;
          await api.deleteReagentConsumptionLog(deletingLog.id);
          setDeletingLog(null);
          await loadConsumptionLogs();
          await fetchData();
        }}
      />
    </div>
  );
};
