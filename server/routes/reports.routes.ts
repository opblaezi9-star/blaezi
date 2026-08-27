import { Router } from 'express';
import { db } from '../db';
import { authenticateJWT } from '../auth';

const router = Router();

// GET /api/reports/inventory
router.get('/inventory', authenticateJWT, (req, res) => {
  db.refreshBatchStatuses();
  const { categoryId, status } = req.query;

  let batches = [...db.batches];
  if (status) {
    batches = batches.filter(b => b.status === status);
  }

  const report = batches.map(b => {
    const med = db.medicines.find(m => m.id === b.medicineId);
    return {
      batchId: b.id,
      medicineId: b.medicineId,
      medicineName: b.medicineName,
      baseNumber: b.baseNumber,
      categoryName: med?.categoryName || 'General',
      batchNumber: b.batchNumber,
      manufacturingDate: b.manufacturingDate,
      expiryDate: b.expiryDate,
      quantityReceived: b.quantityReceived,
      currentQuantity: b.currentQuantity,
      purchasePrice: b.purchasePrice,
      sellingPrice: b.sellingPrice,
      inventoryValue: Math.round(b.currentQuantity * b.purchasePrice * 100) / 100,
      potentialRevenue: Math.round(b.currentQuantity * b.sellingPrice * 100) / 100,
      status: b.status,
      supplierName: b.supplierName || 'Direct',
    };
  });

  if (categoryId) {
    const targetMedIds = db.medicines.filter(m => m.categoryId === categoryId).map(m => m.id);
    const filtered = report.filter(r => targetMedIds.includes(r.medicineId));
    return res.json({
      success: true,
      totalUnits: filtered.reduce((acc, r) => acc + r.currentQuantity, 0),
      totalValue: filtered.reduce((acc, r) => acc + r.inventoryValue, 0),
      count: filtered.length,
      report: filtered,
    });
  }

  res.json({
    success: true,
    totalUnits: report.reduce((acc, r) => acc + r.currentQuantity, 0),
    totalValue: Math.round(report.reduce((acc, r) => acc + r.inventoryValue, 0) * 100) / 100,
    count: report.length,
    report,
  });
});

// GET /api/reports/expiry
router.get('/expiry', authenticateJWT, (_req, res) => {
  db.refreshBatchStatuses();
  const today = new Date();

  const expiringBatches = db.batches.map(b => {
    const exp = new Date(b.expiryDate);
    const daysRemaining = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
    let urgency = 'Safe';
    if (daysRemaining <= 0) urgency = 'Expired';
    else if (daysRemaining <= 30) urgency = 'Critical (<= 30d)';
    else if (daysRemaining <= 90) urgency = 'Warning (<= 90d)';

    return {
      batchId: b.id,
      medicineName: b.medicineName,
      baseNumber: b.baseNumber,
      batchNumber: b.batchNumber,
      expiryDate: b.expiryDate,
      daysRemaining,
      urgency,
      currentQuantity: b.currentQuantity,
      purchasePrice: b.purchasePrice,
      lossValueIfExpired: Math.round(b.currentQuantity * b.purchasePrice * 100) / 100,
      status: b.status,
    };
  });

  // Sort by days remaining ascending
  expiringBatches.sort((a, b) => a.daysRemaining - b.daysRemaining);

  res.json({
    success: true,
    count: expiringBatches.length,
    report: expiringBatches,
  });
});

// GET /api/reports/purchases
router.get('/purchases', authenticateJWT, (req, res) => {
  const { startDate, endDate, supplierId } = req.query;

  let pos = db.purchaseOrders.map(po => {
    const items = db.purchaseOrderItems.filter(i => i.purchaseOrderId === po.id);
    return {
      id: po.id,
      poNumber: po.poNumber,
      supplierName: po.supplierName,
      orderDate: po.orderDate,
      expectedDeliveryDate: po.expectedDeliveryDate,
      receivedDate: po.receivedDate || '-',
      totalAmount: po.totalAmount,
      orderStatus: po.orderStatus,
      paymentStatus: po.paymentStatus,
      itemCount: items.length,
      totalOrderedQty: items.reduce((a, b) => a + b.orderedQuantity, 0),
      totalReceivedQty: items.reduce((a, b) => a + b.receivedQuantity, 0),
      createdByName: po.createdByName,
    };
  });

  if (startDate) pos = pos.filter(p => p.orderDate >= (startDate as string));
  if (endDate) pos = pos.filter(p => p.orderDate <= (endDate as string));
  if (supplierId) pos = pos.filter(p => p.supplierName === supplierId);

  const totalSpent = pos.reduce((acc, p) => acc + p.totalAmount, 0);

  res.json({
    success: true,
    totalSpent: Math.round(totalSpent * 100) / 100,
    count: pos.length,
    report: pos,
  });
});

// GET /api/reports/dispensing
router.get('/dispensing', authenticateJWT, (req, res) => {
  const { startDate, endDate } = req.query;

  let report = db.dispensings.map(d => {
    const details = db.dispensingDetails.filter(dd => dd.dispensingId === d.id);
    return {
      dispensingNumber: d.dispensingNumber,
      patientName: d.patientName,
      doctorName: d.doctorName || 'General OPD',
      pharmacistName: d.pharmacistName,
      itemCount: details.length,
      totalQuantity: details.reduce((acc, dd) => acc + dd.quantity, 0),
      totalAmount: d.totalAmount,
      date: d.createdAt,
      medicinesList: details.map(dd => `${dd.medicineName} (${dd.quantity}) [${dd.batchNumber}]`).join(', '),
    };
  });

  if (startDate) report = report.filter(d => d.date >= (startDate as string));
  if (endDate) report = report.filter(d => d.date <= (endDate as string));

  const totalRevenue = report.reduce((acc, d) => acc + d.totalAmount, 0);
  const totalUnitsDispensed = report.reduce((acc, d) => acc + d.totalQuantity, 0);

  res.json({
    success: true,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalUnitsDispensed,
    count: report.length,
    report,
  });
});

// GET /api/reports/movements
router.get('/movements', authenticateJWT, (_req, res) => {
  res.json({
    success: true,
    count: db.stockMovements.length,
    report: db.stockMovements,
  });
});

// GET /api/reports/returns
router.get('/returns', authenticateJWT, (_req, res) => {
  const report = db.returns.map(r => {
    const details = db.returnDetails.filter(rd => rd.returnId === r.id);
    return {
      returnNumber: r.returnNumber,
      returnType: r.returnType,
      referenceNumber: r.referenceNumber,
      partyName: r.patientName || r.supplierName || 'General',
      reason: r.reason,
      processedByName: r.processedByName,
      date: r.createdAt,
      items: details.map(d => `${d.medicineName} (Qty: ${d.quantity}) - ${d.restockAction}`).join(', '),
    };
  });

  res.json({
    success: true,
    count: report.length,
    report,
  });
});

export default router;
