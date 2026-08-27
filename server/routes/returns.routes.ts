import { Router } from 'express';
import { db, MedicineReturn, MedicineReturnDetail, StockTransaction, StockMovement } from '../db';
import { authenticateJWT, requireRole, logAudit, AuthenticatedRequest } from '../auth';

const router = Router();

// GET /api/returns
router.get('/', authenticateJWT, (req, res) => {
  const { returnType, search } = req.query;

  let list = db.returns.map(ret => {
    const details = db.returnDetails.filter(rd => rd.returnId === ret.id);
    return {
      ...ret,
      details,
      itemCount: details.length,
      totalQuantity: details.reduce((acc, rd) => acc + rd.quantity, 0),
    };
  });

  if (returnType) {
    list = list.filter(r => r.returnType === returnType);
  }

  if (search) {
    const q = (search as string).toLowerCase().trim();
    list = list.filter(
      r =>
        r.returnNumber.toLowerCase().includes(q) ||
        r.referenceNumber.toLowerCase().includes(q) ||
        (r.patientName && r.patientName.toLowerCase().includes(q)) ||
        (r.supplierName && r.supplierName.toLowerCase().includes(q)) ||
        r.processedByName.toLowerCase().includes(q)
    );
  }

  res.json({
    success: true,
    count: list.length,
    returns: list,
  });
});

// POST /api/returns (Admin and Pharmacist only)
router.post('/', authenticateJWT, requireRole(['Admin', 'Pharmacist']), (req: AuthenticatedRequest, res) => {
  const { returnType, referenceNumber, patientId, supplierId, reason, items } = req.body;
  // items: Array of { medicineId, batchId, quantity, reason, restockAction: 'Restocked' | 'Quarantined' | 'Disposed' }

  if (!returnType || !referenceNumber || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Return type, reference number, and at least one item are required.',
    });
  }

  const patient = patientId ? db.patients.find(p => p.id === patientId) : undefined;
  const supplier = supplierId ? db.suppliers.find(s => s.id === supplierId) : undefined;
  const user = req.user!;

  const returnId = `ret-${Date.now()}`;
  const count = db.returns.length + 1;
  const returnNumber = `RET-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

  const newReturn: MedicineReturn = {
    id: returnId,
    returnNumber,
    returnType,
    referenceNumber,
    patientId: patient?.id,
    patientName: patient?.name,
    supplierId: supplier?.id,
    supplierName: supplier?.name,
    reason: reason || 'Return of medication',
    status: 'Processed',
    processedBy: user.id,
    processedByName: user.fullName,
    createdAt: new Date().toISOString(),
  };

  const createdDetails: MedicineReturnDetail[] = [];

  for (const item of items) {
    const qty = parseInt(item.quantity, 10);
    if (isNaN(qty) || qty <= 0) continue;

    const medicine = db.medicines.find(m => m.id === item.medicineId);
    const batch = db.batches.find(b => b.id === item.batchId);

    if (!medicine || !batch) continue;

    const restockAction = item.restockAction || 'Restocked';

    const detail: MedicineReturnDetail = {
      id: `rd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      returnId,
      medicineId: medicine.id,
      medicineName: medicine.name,
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      quantity: qty,
      reason: item.reason || reason || 'Returned',
      restockAction,
    };
    createdDetails.push(detail);

    // If restocked and patient return, add back to batch stock
    if (returnType === 'Patient Return' && restockAction === 'Restocked') {
      const qtyBefore = batch.currentQuantity;
      batch.currentQuantity += qty;
      if (batch.status === 'Depleted') {
        batch.status = 'Available';
      }

      // Stock transaction
      const tx: StockTransaction = {
        id: `st-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        transactionNumber: `ST-${Date.now().toString().slice(-6)}`,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        medicineId: medicine.id,
        medicineName: medicine.name,
        userId: user.id,
        userName: user.fullName,
        transactionType: 'Return',
        quantity: qty,
        quantityBefore: qtyBefore,
        quantityAfter: batch.currentQuantity,
        referenceNumber: returnNumber,
        remarks: `Patient Return Restocked (${returnNumber})`,
        date: new Date().toISOString(),
      };
      db.stockTransactions.unshift(tx);

      // Stock Movement
      const mov: StockMovement = {
        id: `sm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        movementNumber: `MOV-${Date.now().toString().slice(-6)}`,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        medicineId: medicine.id,
        medicineName: medicine.name,
        userId: user.id,
        userName: user.fullName,
        movementType: 'Return',
        quantityIn: qty,
        quantityOut: 0,
        balanceAfter: batch.currentQuantity,
        referenceNumber: returnNumber,
        remarks: `Restocked returned items from ${patient?.name || 'Patient'}`,
        createdAt: new Date().toISOString(),
      };
      db.stockMovements.unshift(mov);
    } else if (returnType === 'Supplier Return') {
      // Returning to supplier: decrement batch stock
      const qtyBefore = batch.currentQuantity;
      batch.currentQuantity = Math.max(0, batch.currentQuantity - qty);
      if (batch.currentQuantity === 0) batch.status = 'Depleted';

      const tx: StockTransaction = {
        id: `st-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        transactionNumber: `ST-${Date.now().toString().slice(-6)}`,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        medicineId: medicine.id,
        medicineName: medicine.name,
        userId: user.id,
        userName: user.fullName,
        transactionType: 'Return',
        quantity: -qty,
        quantityBefore: qtyBefore,
        quantityAfter: batch.currentQuantity,
        referenceNumber: returnNumber,
        remarks: `Supplier Return to ${supplier?.name || 'Supplier'} (${returnNumber})`,
        date: new Date().toISOString(),
      };
      db.stockTransactions.unshift(tx);

      const mov: StockMovement = {
        id: `sm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        movementNumber: `MOV-${Date.now().toString().slice(-6)}`,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        medicineId: medicine.id,
        medicineName: medicine.name,
        userId: user.id,
        userName: user.fullName,
        movementType: 'Return',
        quantityIn: 0,
        quantityOut: qty,
        balanceAfter: batch.currentQuantity,
        referenceNumber: returnNumber,
        remarks: `Returned to supplier ${supplier?.name || ''}`,
        createdAt: new Date().toISOString(),
      };
      db.stockMovements.unshift(mov);
    }
  }

  db.returns.unshift(newReturn);
  db.returnDetails.push(...createdDetails);
  db.save();

  logAudit(
    req,
    'Return',
    'medicine_returns',
    newReturn.id,
    `Processed ${returnType} ${returnNumber} with ${createdDetails.length} items.`
  );

  res.status(201).json({
    success: true,
    message: `Return ${returnNumber} processed successfully.`,
    return: {
      ...newReturn,
      details: createdDetails,
    },
  });
});

// DELETE /api/returns/:id (Admin and Pharmacist)
router.delete('/:id', authenticateJWT, requireRole(['Admin', 'Pharmacist']), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const index = db.returns.findIndex(r => r.id === id || r.returnNumber === id);
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: 'Return record not found.',
    });
  }

  const ret = db.returns[index];
  db.returns.splice(index, 1);
  db.returnDetails = db.returnDetails.filter(rd => rd.returnId !== ret.id);
  db.save();

  logAudit(
    req,
    'Delete',
    'medicine_returns',
    ret.id,
    `Deleted return record ${ret.returnNumber}`
  );

  res.json({
    success: true,
    message: `Return record "${ret.returnNumber}" deleted successfully.`,
  });
});

export default router;
