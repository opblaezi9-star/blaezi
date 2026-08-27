import { Router } from 'express';
import { db, MedicineBatch, StockTransaction, StockMovement } from '../db';
import { authenticateJWT, requireRole, logAudit, AuthenticatedRequest } from '../auth';

const router = Router();

// GET /api/batches
router.get('/', authenticateJWT, (req, res) => {
  db.refreshBatchStatuses();
  const { medicineId, status, search, expiringDays, itemType } = req.query;

  let list = [...db.batches];

  if (itemType) {
    if (itemType === 'Medicine') {
      list = list.filter(b => b.itemType !== 'Reagent');
    } else if (itemType === 'Reagent') {
      list = list.filter(b => b.itemType === 'Reagent');
    }
  }

  if (medicineId) {
    list = list.filter(b => b.medicineId === medicineId);
  }

  if (status) {
    list = list.filter(b => b.status === status);
  }

  if (search) {
    const q = (search as string).toLowerCase().trim();
    list = list.filter(b =>
      b.batchNumber.toLowerCase().includes(q) ||
      b.medicineName.toLowerCase().includes(q) ||
      b.baseNumber.toLowerCase().includes(q) ||
      (b.storageLocation && b.storageLocation.toLowerCase().includes(q))
    );
  }

  if (expiringDays) {
    const days = parseInt(expiringDays as string, 10);
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    list = list.filter(b => {
      const exp = new Date(b.expiryDate);
      return exp <= targetDate && b.currentQuantity > 0;
    });
  }

  res.json({
    success: true,
    count: list.length,
    batches: list,
  });
});

// GET /api/batches/:id
router.get('/:id', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const batch = db.batches.find(b => b.id === id);

  if (!batch) {
    return res.status(404).json({
      success: false,
      message: 'Batch not found.',
    });
  }

  // Get transactions and movements for this batch
  const transactions = db.stockTransactions.filter(t => t.batchId === id);
  const movements = db.stockMovements.filter(m => m.batchId === id);

  res.json({
    success: true,
    batch,
    transactions,
    movements,
  });
});

// POST /api/batches (Admin, Pharmacist, Laboratorian)
router.post('/', authenticateJWT, requireRole(['Admin', 'Pharmacist', 'Laboratorian']), (req: AuthenticatedRequest, res) => {
  const {
    medicineId,
    batchNumber,
    manufacturingDate,
    expiryDate,
    quantityReceived,
    purchasePrice,
    sellingPrice,
    supplierId,
    itemType,
    testsPerUnit,
    storageLocation,
    qcStatus,
  } = req.body;

  if (!medicineId || !batchNumber || !expiryDate || quantityReceived === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Medicine, Batch Number, Expiry Date, and Initial Quantity are required.',
    });
  }

  const medicine = db.medicines.find(m => m.id === medicineId);
  if (!medicine) {
    return res.status(400).json({
      success: false,
      message: 'Specified medicine does not exist.',
    });
  }

  // Check duplicate batch number for the same medicine
  const existing = db.batches.find(
    b => b.medicineId === medicineId && b.batchNumber.toLowerCase() === batchNumber.trim().toLowerCase()
  );
  if (existing) {
    return res.status(400).json({
      success: false,
      message: `Batch "${batchNumber}" already exists for medicine ${medicine.name}.`,
    });
  }

  const qty = Math.max(0, parseInt(quantityReceived, 10));
  const supplier = db.suppliers.find(s => s.id === supplierId);

  const exp = new Date(expiryDate);
  const today = new Date();
  let status: MedicineBatch['status'] = 'Available';
  if (qty <= 0) {
    status = 'Depleted';
  } else if (exp <= today) {
    status = 'Expired';
  } else {
    const soon = new Date();
    soon.setDate(today.getDate() + 30);
    if (exp <= soon) {
      status = 'Expiring Soon';
    }
  }

  const isReagent = medicine.itemType === 'Reagent' || itemType === 'Reagent';
  const tpu = testsPerUnit ? Number(testsPerUnit) : (medicine.testsPerUnit || (isReagent ? 100 : undefined));

  const newBatch: MedicineBatch = {
    id: `bat-${Date.now()}`,
    medicineId: medicine.id,
    medicineName: medicine.name,
    baseNumber: medicine.baseNumber,
    batchNumber: batchNumber.trim().toUpperCase(),
    manufacturingDate: manufacturingDate || new Date().toISOString().split('T')[0],
    expiryDate,
    quantityReceived: qty,
    currentQuantity: qty,
    purchasePrice: Number(purchasePrice) || 0,
    sellingPrice: Number(sellingPrice) || 0,
    supplierId: supplier?.id,
    supplierName: supplier?.name,
    status,
    itemType: isReagent ? 'Reagent' : 'Medicine',
    testsPerUnit: tpu,
    totalTestsRemaining: isReagent && tpu ? qty * tpu : undefined,
    storageLocation: storageLocation || (isReagent ? medicine.storageCondition || '2°C - 8°C (Cold Storage)' : undefined),
    qcStatus: isReagent ? (qcStatus || 'QC Passed') : undefined,
    createdAt: new Date().toISOString(),
  };

  db.batches.unshift(newBatch);

  // If quantity > 0, create stock transaction and movement
  if (qty > 0) {
    const user = req.user!;
    const tx: StockTransaction = {
      id: `st-${Date.now()}`,
      transactionNumber: `ST-${Date.now().toString().slice(-6)}`,
      batchId: newBatch.id,
      batchNumber: newBatch.batchNumber,
      medicineId: medicine.id,
      medicineName: medicine.name,
      userId: user.id,
      userName: user.fullName,
      transactionType: 'Purchase',
      quantity: qty,
      quantityBefore: 0,
      quantityAfter: qty,
      referenceNumber: 'MANUAL-BATCH-ADD',
      remarks: 'Manually added batch initial stock',
      date: new Date().toISOString(),
    };
    db.stockTransactions.unshift(tx);

    const mov: StockMovement = {
      id: `sm-${Date.now()}`,
      movementNumber: `MOV-${Date.now().toString().slice(-6)}`,
      batchId: newBatch.id,
      batchNumber: newBatch.batchNumber,
      medicineId: medicine.id,
      medicineName: medicine.name,
      userId: user.id,
      userName: user.fullName,
      movementType: 'Purchase',
      quantityIn: qty,
      quantityOut: 0,
      balanceAfter: qty,
      referenceNumber: 'MANUAL-BATCH-ADD',
      remarks: 'Manually added batch initial stock',
      createdAt: new Date().toISOString(),
    };
    db.stockMovements.unshift(mov);
  }

  db.save();

  logAudit(
    req,
    'Create',
    'medicine_batches',
    newBatch.id,
    `Added batch ${newBatch.batchNumber} for ${medicine.name} with ${qty} units.`
  );

  res.status(201).json({
    success: true,
    message: 'Batch created successfully.',
    batch: newBatch,
  });
});

// POST /api/batches/:id/adjust (Admin & Pharmacist only)
router.post('/:id/adjust', authenticateJWT, requireRole(['Admin', 'Pharmacist']), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { newQuantity, remarks, reason } = req.body;

  const batch = db.batches.find(b => b.id === id);
  if (!batch) {
    return res.status(404).json({
      success: false,
      message: 'Batch not found.',
    });
  }

  const targetQty = parseInt(newQuantity, 10);
  if (isNaN(targetQty) || targetQty < 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid non-negative integer for quantity.',
    });
  }

  const user = req.user!;
  const qtyBefore = batch.currentQuantity;
  const delta = targetQty - qtyBefore;

  batch.currentQuantity = targetQty;
  if (batch.currentQuantity === 0) {
    batch.status = 'Depleted';
  } else {
    db.refreshBatchStatuses();
  }

  // Record transaction & movement
  const tx: StockTransaction = {
    id: `st-${Date.now()}`,
    transactionNumber: `ST-${Date.now().toString().slice(-6)}`,
    batchId: batch.id,
    batchNumber: batch.batchNumber,
    medicineId: batch.medicineId,
    medicineName: batch.medicineName,
    userId: user.id,
    userName: user.fullName,
    transactionType: 'Adjustment',
    quantity: delta,
    quantityBefore: qtyBefore,
    quantityAfter: targetQty,
    referenceNumber: `ADJ-${Date.now().toString().slice(-6)}`,
    remarks: remarks || reason || 'Manual inventory stock reconciliation',
    date: new Date().toISOString(),
  };
  db.stockTransactions.unshift(tx);

  const mov: StockMovement = {
    id: `sm-${Date.now()}`,
    movementNumber: `MOV-${Date.now().toString().slice(-6)}`,
    batchId: batch.id,
    batchNumber: batch.batchNumber,
    medicineId: batch.medicineId,
    medicineName: batch.medicineName,
    userId: user.id,
    userName: user.fullName,
    movementType: 'Adjustment',
    quantityIn: delta > 0 ? delta : 0,
    quantityOut: delta < 0 ? Math.abs(delta) : 0,
    balanceAfter: targetQty,
    referenceNumber: tx.referenceNumber,
    remarks: tx.remarks,
    createdAt: new Date().toISOString(),
  };
  db.stockMovements.unshift(mov);

  db.save();

  logAudit(
    req,
    'Stock Update',
    'medicine_batches',
    batch.id,
    `Stock adjusted for batch ${batch.batchNumber} (${batch.medicineName}) from ${qtyBefore} to ${targetQty}. Reason: ${remarks || reason || 'Adjustment'}`
  );

  res.json({
    success: true,
    message: 'Batch stock adjusted successfully.',
    batch,
    transaction: tx,
  });
});

// DELETE /api/batches/:id (Admin, Pharmacist, Laboratorian)
router.delete('/:id', authenticateJWT, requireRole(['Admin', 'Pharmacist', 'Laboratorian']), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const index = db.batches.findIndex(b => b.id === id);
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: 'Batch not found.',
    });
  }

  const batch = db.batches[index];
  db.batches.splice(index, 1);
  db.save();

  logAudit(
    req,
    'Delete',
    'medicine_batches',
    batch.id,
    `Deleted batch ${batch.batchNumber} for medicine ${batch.medicineName} (${batch.currentQuantity} units removed)`
  );

  res.json({
    success: true,
    message: `Batch "${batch.batchNumber}" deleted successfully.`,
  });
});

export default router;
