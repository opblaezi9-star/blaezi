import { Router } from 'express';
import { db } from '../db';
import { authenticateJWT } from '../auth';

const router = Router();

// GET /api/inventory/summary
router.get('/summary', authenticateJWT, (_req, res) => {
  db.refreshBatchStatuses();

  const totalMedicines = db.medicines.length;
  const activeMedicines = db.medicines.filter(m => m.status === 'Active').length;
  const totalBatches = db.batches.length;
  const availableBatches = db.batches.filter(b => b.status === 'Available').length;
  const expiringSoonBatches = db.batches.filter(b => b.status === 'Expiring Soon').length;
  const expiredBatches = db.batches.filter(b => b.status === 'Expired').length;

  let totalStockUnits = 0;
  let totalInventoryValue = 0;

  db.batches.forEach(b => {
    if (b.status === 'Available' || b.status === 'Expiring Soon') {
      totalStockUnits += b.currentQuantity;
      totalInventoryValue += b.currentQuantity * b.purchasePrice;
    }
  });

  const lowStockMedicines = db.medicines.filter(med => {
    const medStock = db.batches
      .filter(b => b.medicineId === med.id && (b.status === 'Available' || b.status === 'Expiring Soon'))
      .reduce((sum, b) => sum + b.currentQuantity, 0);
    return medStock <= med.minStockLevel;
  });

  res.json({
    success: true,
    summary: {
      totalMedicines,
      activeMedicines,
      totalBatches,
      availableBatches,
      expiringSoonBatches,
      expiredBatches,
      totalStockUnits,
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
      lowStockCount: lowStockMedicines.length,
      lowStockMedicines: lowStockMedicines.map(m => ({
        id: m.id,
        name: m.name,
        baseNumber: m.baseNumber,
        categoryName: m.categoryName,
        minStockLevel: m.minStockLevel,
      })),
    },
  });
});

// GET /api/inventory/items
router.get('/items', authenticateJWT, (req, res) => {
  db.refreshBatchStatuses();
  const { search, categoryId, filterType } = req.query;

  let items = db.medicines.map(med => {
    const medBatches = db.batches.filter(b => b.medicineId === med.id);
    const validBatches = medBatches.filter(b => b.status === 'Available' || b.status === 'Expiring Soon');
    const totalCurrentStock = validBatches.reduce((acc, b) => acc + b.currentQuantity, 0);
    const totalExpiredStock = medBatches.filter(b => b.status === 'Expired').reduce((acc, b) => acc + b.currentQuantity, 0);
    const isLowStock = totalCurrentStock <= med.minStockLevel;
    const hasExpiringSoon = medBatches.some(b => b.status === 'Expiring Soon');
    const hasExpired = medBatches.some(b => b.status === 'Expired');

    // Earliest active expiry
    const earliestExpiry = validBatches
      .map(b => b.expiryDate)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] || 'N/A';

    return {
      medicineId: med.id,
      medicineName: med.name,
      genericName: med.genericName,
      baseNumber: med.baseNumber,
      categoryId: med.categoryId,
      categoryName: med.categoryName,
      unit: med.unit,
      minStockLevel: med.minStockLevel,
      currentStock: totalCurrentStock,
      expiredStock: totalExpiredStock,
      isLowStock,
      hasExpiringSoon,
      hasExpired,
      earliestExpiry,
      batches: medBatches,
    };
  });

  if (search) {
    const q = (search as string).toLowerCase().trim();
    items = items.filter(
      i =>
        i.medicineName.toLowerCase().includes(q) ||
        i.baseNumber.toLowerCase().includes(q) ||
        i.genericName.toLowerCase().includes(q) ||
        i.batches.some(b => b.batchNumber.toLowerCase().includes(q))
    );
  }

  if (categoryId) {
    items = items.filter(i => i.categoryId === categoryId);
  }

  if (filterType === 'low-stock') {
    items = items.filter(i => i.isLowStock);
  } else if (filterType === 'expiring-soon') {
    items = items.filter(i => i.hasExpiringSoon);
  } else if (filterType === 'expired') {
    items = items.filter(i => i.hasExpired);
  }

  res.json({
    success: true,
    count: items.length,
    items,
  });
});

// GET /api/inventory/transactions
router.get('/transactions', authenticateJWT, (req, res) => {
  const { medicineId, batchId, transactionType, search } = req.query;

  let list = [...db.stockTransactions];

  if (medicineId) {
    list = list.filter(t => t.medicineId === medicineId);
  }
  if (batchId) {
    list = list.filter(t => t.batchId === batchId);
  }
  if (transactionType) {
    list = list.filter(t => t.transactionType === transactionType);
  }
  if (search) {
    const q = (search as string).toLowerCase().trim();
    list = list.filter(
      t =>
        t.medicineName.toLowerCase().includes(q) ||
        t.batchNumber.toLowerCase().includes(q) ||
        t.transactionNumber.toLowerCase().includes(q) ||
        t.referenceNumber.toLowerCase().includes(q) ||
        t.userName.toLowerCase().includes(q)
    );
  }

  res.json({
    success: true,
    count: list.length,
    transactions: list,
  });
});

// GET /api/inventory/movements
router.get('/movements', authenticateJWT, (req, res) => {
  const { medicineId, batchId, movementType, search } = req.query;

  let list = [...db.stockMovements];

  if (medicineId) {
    list = list.filter(m => m.medicineId === medicineId);
  }
  if (batchId) {
    list = list.filter(m => m.batchId === batchId);
  }
  if (movementType) {
    list = list.filter(m => m.movementType === movementType);
  }
  if (search) {
    const q = (search as string).toLowerCase().trim();
    list = list.filter(
      m =>
        m.medicineName.toLowerCase().includes(q) ||
        m.batchNumber.toLowerCase().includes(q) ||
        m.movementNumber.toLowerCase().includes(q) ||
        m.referenceNumber.toLowerCase().includes(q) ||
        m.userName.toLowerCase().includes(q)
    );
  }

  res.json({
    success: true,
    count: list.length,
    movements: list,
  });
});

// POST /api/inventory/spoilage (Pharmacist & Admin - Record Damaged, Broken, Expired or Discrepant Stock)
router.post('/spoilage', authenticateJWT, (req: any, res) => {
  const { batchId, quantity, reason, remarks, actionType } = req.body;
  // reason: 'Damaged / Broken Container' | 'Expired Stock Write-Off' | 'Cold-Chain Temperature Breach' | 'Physical Count Discrepancy' | 'Supplier Recall' | 'Clinical Spoilage'
  // actionType: 'Deduction' | 'Disposal' | 'Correction'

  if (!batchId || !quantity || quantity <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Batch selection and a positive quantity are required.',
    });
  }

  const batch = db.batches.find(b => b.id === batchId);
  if (!batch) {
    return res.status(404).json({
      success: false,
      message: 'Specified medication batch not found.',
    });
  }

  const writeOffQty = parseInt(quantity, 10);
  if (writeOffQty > batch.currentQuantity) {
    return res.status(400).json({
      success: false,
      message: `Cannot write off ${writeOffQty} units. Current batch balance is only ${batch.currentQuantity} units.`,
    });
  }

  const user = req.user;
  const qtyBefore = batch.currentQuantity;
  const qtyAfter = qtyBefore - writeOffQty;
  batch.currentQuantity = qtyAfter;
  if (batch.currentQuantity === 0) {
    batch.status = 'Depleted';
  }

  const refNumber = `ADJ-${Date.now().toString().slice(-6)}`;

  // Record Stock Transaction
  db.stockTransactions.unshift({
    id: `st-adj-${Date.now()}`,
    transactionNumber: `ST-${Date.now().toString().slice(-6)}`,
    batchId: batch.id,
    batchNumber: batch.batchNumber,
    medicineId: batch.medicineId,
    medicineName: batch.medicineName,
    userId: user.id,
    userName: user.fullName,
    transactionType: 'Adjustment',
    quantity: -writeOffQty,
    quantityBefore: qtyBefore,
    quantityAfter: qtyAfter,
    referenceNumber: refNumber,
    remarks: `[${reason || 'Stock Adjustment'}] ${remarks || 'Write-off / spoilage logged'}`,
    date: new Date().toISOString(),
  });

  // Record Stock Movement
  db.stockMovements.unshift({
    id: `mov-adj-${Date.now()}`,
    movementNumber: `MOV-${Date.now().toString().slice(-6)}`,
    batchId: batch.id,
    batchNumber: batch.batchNumber,
    medicineId: batch.medicineId,
    medicineName: batch.medicineName,
    userId: user.id,
    userName: user.fullName,
    movementType: 'Adjustment',
    quantityIn: 0,
    quantityOut: writeOffQty,
    balanceAfter: qtyAfter,
    referenceNumber: refNumber,
    remarks: `[${reason || 'Waste'}] ${remarks || ''}`,
    createdAt: new Date().toISOString(),
  });

  // Audit log
  db.auditLogs.unshift({
    id: `aud-spoil-${Date.now()}`,
    userId: user.id,
    userName: user.fullName,
    role: user.role,
    action: 'Stock Update',
    table: 'inventory_batches',
    recordId: batch.id,
    description: `Logged stock write-off of ${writeOffQty} units for ${batch.medicineName} (Batch: ${batch.batchNumber}). Reason: ${reason}.`,
    ipAddress: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  });

  db.save();

  res.json({
    success: true,
    message: `Successfully recorded write-off of ${writeOffQty} units. New batch balance is ${qtyAfter}.`,
    batch,
  });
});

export default router;
