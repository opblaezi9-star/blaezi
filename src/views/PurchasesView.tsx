import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { PurchaseOrder, Supplier, Medicine, PurchaseOrderItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { toMonthInputValue, monthInputToIso, formatMonthYear } from '../utils/formatters';
import {
  ShoppingCart,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  DollarSign,
  Boxes,
  Trash2,
  X,
  Eye,
  PackageCheck,
  AlertTriangle,
  FileSpreadsheet,
  FlaskConical,
  Pill,
  ThermometerSnowflake,
  Printer,
  Sparkles,
  ShieldCheck,
  Layers,
  Building2,
  Calendar,
  Info,
  Check,
} from 'lucide-react';

export const PurchasesView: React.FC = () => {
  const { user, isDoctor, isAdmin } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Medicine' | 'Reagent'>('all');
  const [deletingPo, setDeletingPo] = useState<PurchaseOrder | null>(null);

  // Create PO Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [itemTypeFilterInModal, setItemTypeFilterInModal] = useState<'all' | 'Medicine' | 'Reagent'>('all');
  const [poForm, setPoForm] = useState({
    supplierId: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
    paymentStatus: 'Pending' as 'Pending' | 'Paid' | 'Partial',
    notes: '',
    items: [] as Array<{
      medicineId: string;
      orderedQuantity: number;
      purchasePrice: number;
      sellingPrice: number;
    }>,
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Receive Goods Modal
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [receivingPo, setReceivingPo] = useState<PurchaseOrder | null>(null);
  const [receiveItems, setReceiveItems] = useState<
    Array<{
      itemId: string;
      medicineId: string;
      medicineName: string;
      itemType: 'Medicine' | 'Reagent';
      orderedQuantity: number;
      alreadyReceived: number;
      receivingQuantity: number;
      batchNumber: string;
      expiryDate: string;
      manufacturingDate: string;
      purchasePrice: number;
      sellingPrice: number;
      storageCondition?: string;
      storageLocation?: string;
      qcStatus?: 'QC Passed' | 'Pending QC' | 'Failed QC' | 'Calibrated' | 'Not Required';
      testsPerUnit?: number;
    }>
  >([]);
  const [receiveError, setReceiveError] = useState<string | null>(null);
  const [submittingReceive, setSubmittingReceive] = useState(false);

  // Detail Modal & Print
  const [selectedPoForDetail, setSelectedPoForDetail] = useState<PurchaseOrder | null>(null);
  const [isPrintSlipOpen, setIsPrintSlipOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [poRes, supRes, medRes] = await Promise.all([
        api.getPurchases({
          search,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          itemType: typeFilter !== 'all' ? typeFilter : undefined,
        }),
        api.getSuppliers(),
        api.getMedicines(),
      ]);

      if (poRes.success) setPurchaseOrders(poRes.purchaseOrders);
      if (supRes.success) setSuppliers(supRes.suppliers);
      if (medRes.success) setMedicines(medRes.medicines);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, statusFilter, typeFilter]);

  // Filtered medicines in Create PO modal dropdown
  const filteredCatalogItems = useMemo(() => {
    if (itemTypeFilterInModal === 'all') return medicines;
    return medicines.filter(m => (m.itemType || 'Medicine') === itemTypeFilterInModal);
  }, [medicines, itemTypeFilterInModal]);

  // Low stock detection for quick reorder
  const lowStockItems = useMemo(() => {
    return medicines.filter(m => (m.totalStock ?? 0) <= (m.minStockLevel ?? 10));
  }, [medicines]);

  const handleOpenCreate = (prefillType?: 'all' | 'Medicine' | 'Reagent') => {
    const defaultType = prefillType || 'all';
    setItemTypeFilterInModal(defaultType);

    const initialItem = defaultType === 'all' 
      ? medicines[0] 
      : medicines.find(m => (m.itemType || 'Medicine') === defaultType) || medicines[0];

    setPoForm({
      supplierId: suppliers[0]?.id || '',
      orderDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
      paymentStatus: 'Pending',
      notes: defaultType === 'Reagent' 
        ? 'Diagnostic reagent replenishment for clinical pathology lab.' 
        : '',
      items: initialItem
        ? [
            {
              medicineId: initialItem.id,
              orderedQuantity: (initialItem.itemType === 'Reagent' ? 5 : 50),
              purchasePrice: initialItem.purchasePrice || (initialItem.itemType === 'Reagent' ? 850 : 25),
              sellingPrice: initialItem.sellingPrice || 0,
            },
          ]
        : [],
    });
    setCreateError(null);
    setIsCreateModalOpen(true);
  };

  const handleAddItemRow = (selectedMedId?: string) => {
    const medToAdd = selectedMedId 
      ? medicines.find(m => m.id === selectedMedId) 
      : filteredCatalogItems[0] || medicines[0];

    if (!medToAdd) return;

    setPoForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          medicineId: medToAdd.id,
          orderedQuantity: medToAdd.itemType === 'Reagent' ? 5 : 50,
          purchasePrice: medToAdd.purchasePrice || (medToAdd.itemType === 'Reagent' ? 850 : 20),
          sellingPrice: medToAdd.sellingPrice || 0,
        },
      ],
    }));
  };

  const handleQuickAddLowStock = (type: 'Medicine' | 'Reagent') => {
    const targetItems = lowStockItems.filter(i => (i.itemType || 'Medicine') === type);
    if (targetItems.length === 0) {
      alert(`No low-stock ${type.toLowerCase()}s found in inventory!`);
      return;
    }

    const newRows = targetItems.map(item => ({
      medicineId: item.id,
      orderedQuantity: Math.max(item.minStockLevel * 2 - (item.totalStock || 0), item.itemType === 'Reagent' ? 5 : 50),
      purchasePrice: item.purchasePrice || (item.itemType === 'Reagent' ? 900 : 25),
      sellingPrice: item.sellingPrice || 0,
    }));

    setPoForm(prev => ({
      ...prev,
      items: [...prev.items.filter(row => !targetItems.some(ti => ti.id === row.medicineId)), ...newRows],
      notes: (prev.notes ? prev.notes + ' • ' : '') + `Auto-added ${newRows.length} low-stock ${type.toLowerCase()} items.`,
    }));
  };

  const handleRemoveItemRow = (idx: number) => {
    setPoForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleUpdateItemRow = (idx: number, field: string, value: any) => {
    setPoForm(prev => {
      const items = [...prev.items];
      if (field === 'medicineId') {
        const found = medicines.find(m => m.id === value);
        items[idx] = {
          ...items[idx],
          medicineId: value,
          purchasePrice: found?.purchasePrice || (found?.itemType === 'Reagent' ? 850 : 20),
          sellingPrice: found?.sellingPrice || 0,
          orderedQuantity: found?.itemType === 'Reagent' ? 5 : 50,
        };
      } else {
        items[idx] = { ...items[idx], [field]: value };
      }
      return { ...prev, items };
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poForm.supplierId || poForm.items.length === 0) {
      setCreateError('Please select a supplier and add at least one line item.');
      return;
    }

    try {
      setSubmittingCreate(true);
      setCreateError(null);
      await api.createPurchase(poForm);
      setIsCreateModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create Purchase Order.');
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleOpenReceive = async (po: PurchaseOrder) => {
    try {
      setLoading(true);
      const res = await api.getPurchaseById(po.id);
      if (res.success && res.purchaseOrder) {
        const fullPo: PurchaseOrder = res.purchaseOrder;
        setReceivingPo(fullPo);

        const itemsToReceive = (fullPo.items || []).map(item => {
          const matchedMed = medicines.find(m => m.id === item.medicineId);
          const isReag = item.itemType === 'Reagent' || matchedMed?.itemType === 'Reagent';
          const remaining = item.orderedQuantity - item.receivedQuantity;

          return {
            itemId: item.id,
            medicineId: item.medicineId,
            medicineName: item.medicineName,
            itemType: isReag ? ('Reagent' as const) : ('Medicine' as const),
            orderedQuantity: item.orderedQuantity,
            alreadyReceived: item.receivedQuantity,
            receivingQuantity: remaining > 0 ? remaining : 0,
            batchNumber: `LOT-${item.baseNumber || 'LOT'}-${Date.now().toString().slice(-4)}`,
            expiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000 * 2).toISOString().split('T')[0],
            manufacturingDate: new Date().toISOString().split('T')[0],
            purchasePrice: item.purchasePrice,
            sellingPrice: item.sellingPrice,
            storageCondition: item.storageCondition || matchedMed?.storageCondition || (isReag ? '2°C - 8°C (Refrigerated)' : '15°C - 25°C (Room Temp)'),
            storageLocation: isReag ? 'Main Pathology Lab Refrigerator A (Shelf 2)' : 'Central Pharmacy Shelf A',
            qcStatus: isReag ? ('QC Passed' as const) : undefined,
            testsPerUnit: item.testsPerUnit || matchedMed?.testsPerUnit || (isReag ? 100 : undefined),
          };
        });

        setReceiveItems(itemsToReceive);
        setReceiveError(null);
        setIsReceiveModalOpen(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivingPo) return;

    const hasAny = receiveItems.some(i => i.receivingQuantity > 0);
    if (!hasAny) {
      setReceiveError('Please enter a receiving quantity (>0) for at least one item.');
      return;
    }

    for (const item of receiveItems) {
      if (item.receivingQuantity > 0) {
        if (!item.batchNumber || !item.expiryDate) {
          setReceiveError(`Lot/Batch number and expiry date are required for ${item.medicineName}.`);
          return;
        }
      }
    }

    try {
      setSubmittingReceive(true);
      setReceiveError(null);

      await api.receivePurchase(receivingPo.id, {
        items: receiveItems.filter(i => i.receivingQuantity > 0),
      });

      setIsReceiveModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setReceiveError(err.message || 'Failed to receive goods.');
    } finally {
      setSubmittingReceive(false);
    }
  };

  const handleViewDetail = async (po: PurchaseOrder) => {
    try {
      setLoading(true);
      const res = await api.getPurchaseById(po.id);
      if (res.success && res.purchaseOrder) {
        setSelectedPoForDetail(res.purchaseOrder);
      }
    } finally {
      setLoading(false);
    }
  };

  // Metrics calculation
  const totalAmountSum = purchaseOrders.reduce((acc, po) => acc + (po.totalAmount || 0), 0);
  const medicineOrdersCount = purchaseOrders.filter(po => po.hasMedicines || (po.items && po.items.some(i => i.itemType === 'Medicine' || !i.itemType))).length;
  const reagentOrdersCount = purchaseOrders.filter(po => po.hasReagents || (po.items && po.items.some(i => i.itemType === 'Reagent'))).length;
  const pendingReceivingCount = purchaseOrders.filter(po => po.orderStatus === 'Ordered' || po.orderStatus === 'Partially Received').length;

  const computedTotal = poForm.items.reduce(
    (acc, item) => acc + (item.orderedQuantity || 0) * (item.purchasePrice || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Purchases & Goods Receiving (GRN)
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700">
              {purchaseOrders.length} Orders
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Procure medicines and clinical diagnostic reagents, manage supplier POs, and verify cold-chain stock deliveries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenCreate('Reagent')}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <FlaskConical className="w-4 h-4 text-emerald-600" />
            + Order Reagents
          </button>
          <button
            onClick={() => handleOpenCreate('Medicine')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + New Purchase Order
          </button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">Total PO Value</span>
            <span className="text-lg font-black text-slate-900">₹{totalAmountSum.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
          </div>
          <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">Medicine Orders</span>
            <span className="text-lg font-black text-indigo-900">{medicineOrdersCount} POs</span>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <Pill className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">Diagnostic Reagents</span>
            <span className="text-lg font-black text-emerald-800">{reagentOrdersCount} POs</span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <FlaskConical className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">Awaiting Receiving (GRN)</span>
            <span className="text-lg font-black text-amber-700">{pendingReceivingCount} Orders</span>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Truck className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center gap-3">
        {/* Search */}
        <div className="flex-1 w-full relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search PO number, supplier, medicine, or reagent lot..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-slate-400 focus:outline-none"
          />
        </div>

        {/* Item Type Segment Filter */}
        <div className="flex items-center gap-1 text-xs bg-slate-100 p-1 rounded-lg border border-slate-200 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1 rounded-md font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              typeFilter === 'all'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            All Items
          </button>
          <button
            onClick={() => setTypeFilter('Medicine')}
            className={`px-3 py-1 rounded-md font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              typeFilter === 'Medicine'
                ? 'bg-white text-indigo-800 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Pill className="w-3.5 h-3.5 text-indigo-600" />
            Medicines
          </button>
          <button
            onClick={() => setTypeFilter('Reagent')}
            className={`px-3 py-1 rounded-md font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              typeFilter === 'Reagent'
                ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5 text-emerald-600" />
            Lab Reagents
          </button>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 text-xs bg-slate-100 p-1 rounded-lg border border-slate-200 w-full sm:w-auto overflow-x-auto">
          {['all', 'Ordered', 'Partially Received', 'Received'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-2.5 py-1 rounded-md font-medium transition-all whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status === 'all' ? 'All Status' : status}
            </button>
          ))}
        </div>
      </div>

      {/* PO Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-3">Category & Items</th>
                <th className="py-3 px-3">Supplier Name</th>
                <th className="py-3 px-3">Order Date</th>
                <th className="py-3 px-3">Expected Date</th>
                <th className="py-3 px-3 text-right">Total Amount</th>
                <th className="py-3 px-3 text-center">Fulfillment</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Loading purchase orders...
                  </td>
                </tr>
              ) : purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Boxes className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No purchase orders found matching criteria.</p>
                    <p className="text-slate-400 text-[11px] mt-1">Create a new purchase order for medicines or diagnostic reagents above.</p>
                  </td>
                </tr>
              ) : (
                purchaseOrders.map(po => {
                  const isPending =
                    po.orderStatus === 'Ordered' || po.orderStatus === 'Partially Received';

                  const hasReagents = po.hasReagents || (po.items && po.items.some(i => i.itemType === 'Reagent'));
                  const hasMedicines = po.hasMedicines || (po.items && po.items.some(i => i.itemType === 'Medicine' || !i.itemType));

                  return (
                    <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* PO Number */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900">{po.poNumber}</div>
                        <div className="text-[10px] text-slate-400">By {po.createdByName}</div>
                      </td>

                      {/* Category & Item Badges */}
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1 items-center">
                          {hasReagents && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <FlaskConical className="w-3 h-3" /> Reagent
                            </span>
                          )}
                          {hasMedicines && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Pill className="w-3 h-3" /> Medicine
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 mt-1 font-medium truncate max-w-[200px]">
                          {(po.items || []).map(i => i.medicineName).join(', ') || `${po.itemCount || 0} line items`}
                        </div>
                      </td>

                      {/* Supplier */}
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {po.supplierName}
                      </td>

                      {/* Dates */}
                      <td className="py-3 px-3 text-slate-600">{po.orderDate}</td>
                      <td className="py-3 px-3 text-slate-600">{po.expectedDeliveryDate}</td>

                      {/* Total Amount */}
                      <td className="py-3 px-3 text-right font-black text-slate-900">
                        ₹{po.totalAmount.toFixed(2)}
                      </td>

                      {/* Progress */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-bold text-slate-800">
                          {po.totalReceivedQuantity || 0} / {po.totalOrderedQuantity || 0} units
                        </span>
                        <div className="text-[10px] text-slate-400">
                          {po.itemCount || (po.items ? po.items.length : 0)} line items
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            po.orderStatus === 'Received'
                              ? 'bg-emerald-100 text-emerald-800'
                              : po.orderStatus === 'Partially Received'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {po.orderStatus}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleViewDetail(po)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg inline-flex items-center"
                          title="View PO Overview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {isPending && (
                          <button
                            onClick={() => handleOpenReceive(po)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Receive Stock"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            Receive GRN
                          </button>
                        )}

                        <button
                          onClick={() => setDeletingPo(po)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center cursor-pointer"
                          title="Delete Purchase Order"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Purchase Order Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">New Purchase Order</h3>
                  <p className="text-xs text-slate-500">
                    Procure pharmaceuticals and clinical laboratory reagents from authorized distributors
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Supplier *</label>
                  <select
                    value={poForm.supplierId}
                    onChange={e => setPoForm({ ...poForm, supplierId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden font-medium"
                    required
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.contactPerson})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Order Date</label>
                  <input
                    type="date"
                    value={poForm.orderDate}
                    onChange={e => setPoForm({ ...poForm, orderDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expected Delivery</label>
                  <input
                    type="date"
                    value={poForm.expectedDeliveryDate}
                    onChange={e => setPoForm({ ...poForm, expectedDeliveryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Quick Helper Bar */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Fast Reorder Assist:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuickAddLowStock('Reagent')}
                    className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 border border-emerald-300"
                  >
                    <FlaskConical className="w-3 h-3 text-emerald-700" />
                    + Low Stock Reagents
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAddLowStock('Medicine')}
                    className="px-2.5 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 border border-indigo-300"
                  >
                    <Pill className="w-3 h-3 text-indigo-700" />
                    + Low Stock Medicines
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-500 font-medium">Filter Catalog:</span>
                  <div className="inline-flex bg-white rounded-lg border border-slate-200 p-0.5">
                    <button
                      type="button"
                      onClick={() => setItemTypeFilterInModal('all')}
                      className={`px-2 py-0.5 text-[10px] rounded font-medium ${itemTypeFilterInModal === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-600'}`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemTypeFilterInModal('Medicine')}
                      className={`px-2 py-0.5 text-[10px] rounded font-medium ${itemTypeFilterInModal === 'Medicine' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600'}`}
                    >
                      Medicines
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemTypeFilterInModal('Reagent')}
                      className={`px-2 py-0.5 text-[10px] rounded font-medium ${itemTypeFilterInModal === 'Reagent' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600'}`}
                    >
                      Reagents
                    </button>
                  </div>
                </div>
              </div>

              {/* Order Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Line Items ({poForm.items.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddItemRow()}
                    className="px-3 py-1 bg-slate-800 text-white rounded-lg text-[11px] font-bold hover:bg-slate-900 inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Item (Medicine / Reagent)</th>
                        <th className="p-2.5 w-24 text-right">Order Qty</th>
                        <th className="p-2.5 w-28 text-right">Buy Price (₹)</th>
                        <th className="p-2.5 w-24 text-right">Subtotal</th>
                        <th className="p-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {poForm.items.map((item, idx) => {
                        const subtotal = (item.orderedQuantity || 0) * (item.purchasePrice || 0);
                        const selectedMedicine = medicines.find(m => m.id === item.medicineId);
                        const isReagent = selectedMedicine?.itemType === 'Reagent';

                        return (
                          <tr key={idx} className={isReagent ? 'bg-emerald-50/20' : ''}>
                            <td className="p-2">
                              <div className="space-y-1">
                                <select
                                  value={item.medicineId}
                                  onChange={e => handleUpdateItemRow(idx, 'medicineId', e.target.value)}
                                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                                >
                                  {filteredCatalogItems.map(m => (
                                    <option key={m.id} value={m.id}>
                                      {m.itemType === 'Reagent' ? '🧪 [REAGENT]' : '💊 [MED]'} {m.name} ({m.baseNumber}) {m.unit ? `• ${m.unit}` : ''}
                                    </option>
                                  ))}
                                </select>

                                {selectedMedicine && (
                                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 pt-0.5">
                                    {isReagent ? (
                                      <>
                                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                                          <FlaskConical className="w-2.5 h-2.5" />
                                          {selectedMedicine.department || 'Diagnostic Lab'}
                                        </span>
                                        {selectedMedicine.storageCondition && (
                                          <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 font-medium flex items-center gap-0.5">
                                            <ThermometerSnowflake className="w-2.5 h-2.5" />
                                            {selectedMedicine.storageCondition}
                                          </span>
                                        )}
                                        {selectedMedicine.testsPerUnit && (
                                          <span className="text-slate-600 font-medium">
                                            🧪 {selectedMedicine.testsPerUnit} tests / pack
                                          </span>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold flex items-center gap-1">
                                          <Pill className="w-2.5 h-2.5" />
                                          {selectedMedicine.categoryName || 'General Medicine'}
                                        </span>
                                        {selectedMedicine.genericName && (
                                          <span className="italic text-slate-400">
                                            ({selectedMedicine.genericName})
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>

                            <td className="p-2 align-top">
                              <input
                                type="number"
                                min="1"
                                value={item.orderedQuantity}
                                onChange={e =>
                                  handleUpdateItemRow(
                                    idx,
                                    'orderedQuantity',
                                    parseInt(e.target.value, 10) || 0
                                  )
                                }
                                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-right font-bold text-slate-900"
                              />
                              <div className="text-[10px] text-slate-400 text-right mt-0.5">
                                {selectedMedicine?.unit || 'units'}
                              </div>
                            </td>

                            <td className="p-2 align-top">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.purchasePrice}
                                onChange={e =>
                                  handleUpdateItemRow(
                                    idx,
                                    'purchasePrice',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-right font-semibold"
                              />
                            </td>

                            <td className="p-2 text-right font-black text-slate-900 align-top pt-3">
                              ₹{subtotal.toFixed(2)}
                            </td>

                            <td className="p-2 text-center align-top pt-2">
                              {poForm.items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItemRow(idx)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50"
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

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-700">Estimated Total Order Cost:</span>
                    <p className="text-[10px] text-slate-400">Includes all medicines and laboratory diagnostic kits</p>
                  </div>
                  <span className="text-base font-black text-slate-900">
                    ₹{computedTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Procurement Notes & Delivery Terms</label>
                <textarea
                  rows={2}
                  value={poForm.notes}
                  onChange={e => setPoForm({ ...poForm, notes: e.target.value })}
                  placeholder="Special instructions, cold-chain courier requirements, laboratory priority restock..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {submittingCreate ? 'Saving...' : 'Place Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Goods Receiving Modal (GRN) */}
      {isReceiveModalOpen && receivingPo && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Receive Stock: {receivingPo.poNumber}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Supplier: {receivingPo.supplierName} • Register incoming batch lots, QC calibration & cold chain
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReceiveModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {receiveError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{receiveError}</span>
              </div>
            )}

            <form onSubmit={handleReceiveSubmit} className="space-y-4 text-xs flex-1 overflow-y-auto">
              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-emerald-950 text-xs flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Automated Stock & Batch Integration:</span>
                  Entering received quantities creates active inventory batches. Diagnostic reagents are automatically assigned to refrigerator storage locations and flagged for QC calibration.
                </div>
              </div>

              <div className="space-y-3">
                {receiveItems.map((item, idx) => {
                  const maxRemaining = item.orderedQuantity - item.alreadyReceived;
                  const isReagent = item.itemType === 'Reagent';

                  return (
                    <div
                      key={item.itemId}
                      className={`p-3.5 rounded-xl border ${
                        isReagent
                          ? 'border-emerald-200 bg-emerald-50/30'
                          : 'border-slate-200 bg-slate-50/50'
                      } space-y-3`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`p-1.5 rounded-lg ${
                              isReagent
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {isReagent ? <FlaskConical className="w-4 h-4" /> : <Pill className="w-4 h-4" />}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 text-sm block">
                              {item.medicineName}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Ordered: <strong>{item.orderedQuantity}</strong> • Received: <strong>{item.alreadyReceived}</strong> • Outstanding: <strong>{maxRemaining}</strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-slate-600 font-bold text-[11px]">Receive Now:</label>
                          <input
                            type="number"
                            min="0"
                            max={maxRemaining}
                            value={item.receivingQuantity}
                            onChange={e => {
                              const val = parseInt(e.target.value, 10) || 0;
                              setReceiveItems(prev => {
                                const updated = [...prev];
                                updated[idx].receivingQuantity = val;
                                return updated;
                              });
                            }}
                            className="w-24 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-right font-black text-emerald-800 text-sm focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      {item.receivingQuantity > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1 animate-in fade-in-50">
                          <div>
                            <label className="block font-bold text-slate-600 mb-0.5 text-[10px]">
                              Batch / Lot Number *
                            </label>
                            <input
                              type="text"
                              value={item.batchNumber}
                              onChange={e => {
                                const val = e.target.value.toUpperCase();
                                setReceiveItems(prev => {
                                  const updated = [...prev];
                                  updated[idx].batchNumber = val;
                                  return updated;
                                });
                              }}
                              placeholder="LOT-NUMBER"
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-mono uppercase text-xs"
                              required
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-slate-600 mb-0.5 text-[10px]">
                              Expiry Date (MM/YY) *
                            </label>
                            <input
                              type="month"
                              value={toMonthInputValue(item.expiryDate)}
                              onChange={e => {
                                const val = monthInputToIso(e.target.value);
                                setReceiveItems(prev => {
                                  const updated = [...prev];
                                  updated[idx].expiryDate = val;
                                  return updated;
                                });
                              }}
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                              required
                            />
                          </div>

                          {isReagent ? (
                            <>
                              <div>
                                <label className="block font-bold text-emerald-800 mb-0.5 text-[10px] flex items-center gap-1">
                                  <ThermometerSnowflake className="w-3 h-3" /> Cold Chain Storage Shelf
                                </label>
                                <input
                                  type="text"
                                  value={item.storageLocation || ''}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setReceiveItems(prev => {
                                      const updated = [...prev];
                                      updated[idx].storageLocation = val;
                                      return updated;
                                    });
                                  }}
                                  placeholder="Lab Refrigerator A - Shelf 2"
                                  className="w-full px-2 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs"
                                />
                              </div>

                              <div>
                                <label className="block font-bold text-emerald-800 mb-0.5 text-[10px]">
                                  QC Status On Arrival
                                </label>
                                <select
                                  value={item.qcStatus || 'QC Passed'}
                                  onChange={e => {
                                    const val = e.target.value as any;
                                    setReceiveItems(prev => {
                                      const updated = [...prev];
                                      updated[idx].qcStatus = val;
                                      return updated;
                                    });
                                  }}
                                  className="w-full px-2 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-semibold"
                                >
                                  <option value="QC Passed">QC Passed</option>
                                  <option value="Pending QC">Pending QC Calibration</option>
                                  <option value="Calibrated">Calibrated on Analyzer</option>
                                </select>
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <label className="block font-bold text-slate-600 mb-0.5 text-[10px]">
                                  Manufacturing Date (MM/YY)
                                </label>
                                <input
                                  type="month"
                                  value={toMonthInputValue(item.manufacturingDate)}
                                  onChange={e => {
                                    const val = monthInputToIso(e.target.value);
                                    setReceiveItems(prev => {
                                      const updated = [...prev];
                                      updated[idx].manufacturingDate = val;
                                      return updated;
                                    });
                                  }}
                                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                                />
                              </div>

                              <div>
                                <label className="block font-bold text-slate-600 mb-0.5 text-[10px]">
                                  Unit Buy Price (₹)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.purchasePrice}
                                  onChange={e => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setReceiveItems(prev => {
                                      const updated = [...prev];
                                      updated[idx].purchasePrice = val;
                                      return updated;
                                    });
                                  }}
                                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-right text-xs"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReceiveModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReceive}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  <PackageCheck className="w-4 h-4" />
                  {submittingReceive ? 'Processing Delivery...' : 'Confirm Goods Received (GRN)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PO Detail Overview & Printable Slip Modal */}
      {selectedPoForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-100 text-slate-800 rounded-xl">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Purchase Order: {selectedPoForDetail.poNumber}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Supplier: {selectedPoForDetail.supplierName} • Created by {selectedPoForDetail.createdByName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Order Slip
                </button>
                <button
                  onClick={() => setSelectedPoForDetail(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4 text-xs flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold">Order Date</span>
                  <span className="font-bold text-slate-900">{selectedPoForDetail.orderDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold">Expected Date</span>
                  <span className="font-bold text-slate-900">{selectedPoForDetail.expectedDeliveryDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold">Order Status</span>
                  <span className="font-bold text-emerald-700">{selectedPoForDetail.orderStatus}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold">Total Amount</span>
                  <span className="font-bold text-slate-900">₹{selectedPoForDetail.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2 uppercase text-[11px] tracking-wider">
                  Order Line Items
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Type & Item Name</th>
                        <th className="p-2.5">Details / Storage</th>
                        <th className="p-2.5 text-right">Ordered</th>
                        <th className="p-2.5 text-right">Received</th>
                        <th className="p-2.5 text-right">Unit Price</th>
                        <th className="p-2.5 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedPoForDetail.items || []).map(i => {
                        const isReagent = i.itemType === 'Reagent';

                        return (
                          <tr key={i.id} className={isReagent ? 'bg-emerald-50/20' : ''}>
                            <td className="p-2.5 font-bold text-slate-900">
                              <div className="flex items-center gap-1.5">
                                {isReagent ? (
                                  <FlaskConical className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                ) : (
                                  <Pill className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                )}
                                <span>{i.medicineName}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {i.baseNumber || 'ID: ' + i.medicineId}
                              </div>
                            </td>

                            <td className="p-2.5 text-slate-600">
                              {isReagent ? (
                                <div className="space-y-0.5 text-[10px]">
                                  <span className="font-bold text-emerald-800">{i.department || 'Pathology'}</span>
                                  {i.storageCondition && (
                                    <div className="text-sky-700 flex items-center gap-1">
                                      <ThermometerSnowflake className="w-2.5 h-2.5" />
                                      {i.storageCondition}
                                    </div>
                                  )}
                                  {i.testsPerUnit && <div>{i.testsPerUnit} tests / unit</div>}
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-500">
                                  {i.categoryName || 'Pharmaceutical'}
                                </div>
                              )}
                            </td>

                            <td className="p-2.5 text-right font-medium">{i.orderedQuantity}</td>
                            <td className="p-2.5 text-right font-bold text-emerald-700">{i.receivedQuantity}</td>
                            <td className="p-2.5 text-right">₹{i.purchasePrice}</td>
                            <td className="p-2.5 text-right font-black text-slate-900">₹{i.subtotal.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedPoForDetail.notes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-700 block mb-1 text-[11px]">Procurement Notes:</span>
                  <p className="text-slate-600">{selectedPoForDetail.notes}</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  const p = selectedPoForDetail;
                  setSelectedPoForDetail(null);
                  setDeletingPo(p);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Delete Order
              </button>
              <button
                onClick={() => setSelectedPoForDetail(null)}
                className="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl text-xs hover:bg-slate-900 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete PO Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingPo}
        title="Delete Purchase Order"
        itemName={deletingPo ? `PO #${deletingPo.poNumber} (${deletingPo.supplierName})` : undefined}
        message="Are you sure you want to delete this purchase order? This action will permanently remove the procurement record."
        warningNote={
          deletingPo?.orderStatus === 'Received' || deletingPo?.orderStatus === 'Partially Received'
            ? `Note: This PO has status "${deletingPo.orderStatus}". Deleting the PO record will not revert inventory already received unless manually adjusted.`
            : undefined
        }
        confirmText="Yes, Delete PO"
        onCancel={() => setDeletingPo(null)}
        onConfirm={async () => {
          if (!deletingPo) return;
          await api.deletePurchase(deletingPo.id);
          setDeletingPo(null);
          await fetchData();
        }}
      />
    </div>
  );
};
