import { Router } from 'express';
import { db, Medicine, MedicineBatch, ReagentConsumptionLog, ColdChainLog, StockTransaction, AppNotification } from '../db';
import { authenticateJWT, requireRole, AuthenticatedRequest } from '../auth';

const router = Router();

// GET /api/reagents/summary
router.get('/summary', authenticateJWT, (_req, res) => {
  db.refreshBatchStatuses();

  const allReagents = db.medicines.filter(m => m.itemType === 'Reagent');
  const allReagentBatches = db.batches.filter(b => b.itemType === 'Reagent' || allReagents.some(r => r.id === b.medicineId));

  const totalReagents = allReagents.length;
  const activeReagents = allReagents.filter(r => r.status === 'Active').length;
  
  let totalKitsUnits = 0;
  let totalTestsRemaining = 0;
  let totalInventoryValue = 0;

  const validBatches = allReagentBatches.filter(b => b.status === 'Available' || b.status === 'Expiring Soon');
  
  validBatches.forEach(b => {
    totalKitsUnits += b.currentQuantity;
    const med = allReagents.find(r => r.id === b.medicineId);
    const testsPerUnit = b.testsPerUnit || med?.testsPerUnit || 1;
    totalTestsRemaining += (b.currentQuantity * testsPerUnit);
    totalInventoryValue += (b.currentQuantity * b.purchasePrice);
  });

  const lowStockReagents = allReagents.filter(reag => {
    const stock = allReagentBatches
      .filter(b => b.medicineId === reag.id && (b.status === 'Available' || b.status === 'Expiring Soon'))
      .reduce((sum, b) => sum + b.currentQuantity, 0);
    return stock <= reag.minStockLevel;
  });

  const openVials = allReagentBatches.filter(b => b.isOpenVial && (b.status === 'Available' || b.status === 'Expiring Soon'));
  const openVialsNearExpiry = openVials.filter(b => {
    if (!b.openVialExpiryDate) return false;
    const diffDays = (new Date(b.openVialExpiryDate).getTime() - Date.now()) / (1000 * 3600 * 24);
    return diffDays <= 7;
  });

  const coldChainLogs = db.coldChainLogs;
  const recentExcursions = coldChainLogs.filter(l => l.status === 'Excursion Violation' || l.status === 'Warning');

  // Department breakdown
  const departmentCounts: Record<string, number> = {};
  allReagents.forEach(r => {
    const dept = r.department || 'General Laboratory';
    departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
  });

  res.json({
    success: true,
    summary: {
      totalReagents,
      activeReagents,
      totalKitsUnits,
      totalTestsRemaining,
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
      lowStockCount: lowStockReagents.length,
      openVialsCount: openVials.length,
      openVialsNearExpiryCount: openVialsNearExpiry.length,
      temperatureAlertsCount: recentExcursions.length,
      departmentCounts,
    }
  });
});

// GET /api/reagents
router.get('/', authenticateJWT, (req, res) => {
  db.refreshBatchStatuses();
  const { search, department, storageCondition, status, lowStockOnly, qcStatus } = req.query;

  let reagents = db.medicines.filter(m => m.itemType === 'Reagent');

  if (department && department !== 'All') {
    reagents = reagents.filter(r => r.department === department);
  }

  if (storageCondition && storageCondition !== 'All') {
    reagents = reagents.filter(r => r.storageCondition === storageCondition);
  }

  if (status && status !== 'All') {
    reagents = reagents.filter(r => r.status === status);
  }

  if (search) {
    const q = (search as string).toLowerCase().trim();
    reagents = reagents.filter(
      r =>
        r.name.toLowerCase().includes(q) ||
        r.genericName.toLowerCase().includes(q) ||
        r.baseNumber.toLowerCase().includes(q) ||
        (r.analyzerCompatibility && r.analyzerCompatibility.toLowerCase().includes(q))
    );
  }

  const enriched = reagents.map(reag => {
    const medBatches = db.batches.filter(b => b.medicineId === reag.id);
    const validBatches = medBatches.filter(b => b.status === 'Available' || b.status === 'Expiring Soon');
    const totalCurrentStock = validBatches.reduce((acc, b) => acc + b.currentQuantity, 0);
    const totalTestsAvailable = validBatches.reduce((acc, b) => {
      const yieldPerUnit = b.testsPerUnit || reag.testsPerUnit || 1;
      return acc + (b.currentQuantity * yieldPerUnit);
    }, 0);

    const isLowStock = totalCurrentStock <= reag.minStockLevel;
    const hasExpiringSoon = medBatches.some(b => b.status === 'Expiring Soon');
    const hasExpired = medBatches.some(b => b.status === 'Expired');
    const hasOpenVial = medBatches.some(b => b.isOpenVial && (b.status === 'Available' || b.status === 'Expiring Soon'));

    // Earliest active expiry (FEFO priority)
    const sortedActiveBatches = [...validBatches].sort(
      (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
    );
    const earliestExpiry = sortedActiveBatches[0]?.expiryDate || 'N/A';

    return {
      ...reag,
      currentStock: totalCurrentStock,
      totalTestsAvailable,
      isLowStock,
      hasExpiringSoon,
      hasExpired,
      hasOpenVial,
      earliestExpiry,
      batches: medBatches,
    };
  });

  let finalResult = enriched;
  if (lowStockOnly === 'true') {
    finalResult = finalResult.filter(r => r.isLowStock);
  }

  if (qcStatus && qcStatus !== 'All') {
    finalResult = finalResult.filter(r => r.batches.some(b => b.qcStatus === qcStatus));
  }

  res.json({
    success: true,
    reagents: finalResult,
  });
});

// GET /api/reagents/:id
router.get('/:id', authenticateJWT, (req, res) => {
  db.refreshBatchStatuses();
  const reag = db.medicines.find(m => m.id === req.params.id && m.itemType === 'Reagent');
  if (!reag) {
    return res.status(404).json({ success: false, message: 'Reagent diagnostic item not found' });
  }

  const batches = db.batches
    .filter(b => b.medicineId === reag.id)
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  const consumptionLogs = db.reagentConsumptionLogs
    .filter(l => l.reagentId === reag.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const validBatches = batches.filter(b => b.status === 'Available' || b.status === 'Expiring Soon');
  const currentStock = validBatches.reduce((sum, b) => sum + b.currentQuantity, 0);
  const totalTests = validBatches.reduce((sum, b) => sum + (b.currentQuantity * (b.testsPerUnit || reag.testsPerUnit || 1)), 0);

  res.json({
    success: true,
    reagent: {
      ...reag,
      currentStock,
      totalTests,
      batches,
      consumptionLogs,
    },
  });
});

// POST /api/reagents
router.post('/', authenticateJWT, requireRole('Admin', 'Laboratorian'), (req: AuthenticatedRequest, res) => {
  const {
    name,
    genericName,
    categoryId,
    baseNumber,
    description,
    unit,
    minStockLevel,
    department,
    storageCondition,
    targetTemperature,
    analyzerCompatibility,
    testsPerUnit,
    openVialShelfLifeDays,
    hazardClass,
    qcFrequency,
    requiresReconstitution,
  } = req.body;

  if (!name || !categoryId || !baseNumber) {
    return res.status(400).json({ success: false, message: 'Name, Category, and Item Code are required' });
  }

  // Check unique baseNumber
  const existing = db.medicines.find(m => m.baseNumber.toLowerCase() === baseNumber.toLowerCase().trim());
  if (existing) {
    return res.status(400).json({ success: false, message: `Reagent / Item code "${baseNumber}" already exists.` });
  }

  const category = db.categories.find(c => c.id === categoryId);

  const newReagent: Medicine = {
    id: `reag-${Date.now()}`,
    name: name.trim(),
    genericName: genericName ? genericName.trim() : name.trim(),
    categoryId,
    categoryName: category ? category.name : 'Laboratory Reagents',
    baseNumber: baseNumber.trim().toUpperCase(),
    description: description ? description.trim() : '',
    unit: unit || 'Kit',
    minStockLevel: Number(minStockLevel) >= 0 ? Number(minStockLevel) : 5,
    status: 'Active',
    itemType: 'Reagent',
    department: department || 'General Laboratory',
    storageCondition: storageCondition || '2°C - 8°C (Refrigerated)',
    targetTemperature: targetTemperature || '2°C - 8°C',
    analyzerCompatibility: analyzerCompatibility || 'Automated / Manual Assays',
    testsPerUnit: Number(testsPerUnit) > 0 ? Number(testsPerUnit) : 100,
    openVialShelfLifeDays: Number(openVialShelfLifeDays) > 0 ? Number(openVialShelfLifeDays) : 30,
    hazardClass: hazardClass || 'Non-Hazardous',
    qcFrequency: qcFrequency || 'Daily Calibrator',
    requiresReconstitution: !!requiresReconstitution,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.medicines.push(newReagent);

  db.auditLogs.push({
    id: `aud-${Date.now()}`,
    userId: req.user?.id || 'system',
    userName: req.user?.fullName || 'System',
    role: req.user?.role || 'Admin',
    action: 'Create',
    table: 'reagents',
    recordId: newReagent.id,
    description: `Registered new Laboratory Reagent: ${newReagent.name} (${newReagent.baseNumber}) for ${newReagent.department}`,
    ipAddress: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  });

  db.save();

  res.status(201).json({
    success: true,
    message: 'Laboratory Reagent created successfully',
    reagent: newReagent,
  });
});

// PUT /api/reagents/:id
router.put('/:id', authenticateJWT, requireRole('Admin', 'Laboratorian'), (req: AuthenticatedRequest, res) => {
  const index = db.medicines.findIndex(m => m.id === req.params.id && m.itemType === 'Reagent');
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Reagent not found' });
  }

  const existing = db.medicines[index];
  const {
    name,
    genericName,
    categoryId,
    baseNumber,
    description,
    unit,
    minStockLevel,
    status,
    department,
    storageCondition,
    targetTemperature,
    analyzerCompatibility,
    testsPerUnit,
    openVialShelfLifeDays,
    hazardClass,
    qcFrequency,
    requiresReconstitution,
  } = req.body;

  if (baseNumber && baseNumber.trim().toUpperCase() !== existing.baseNumber) {
    const duplicate = db.medicines.find(
      m => m.id !== existing.id && m.baseNumber.toLowerCase() === baseNumber.trim().toLowerCase()
    );
    if (duplicate) {
      return res.status(400).json({ success: false, message: `Item code "${baseNumber}" is already in use.` });
    }
  }

  const category = categoryId ? db.categories.find(c => c.id === categoryId) : null;

  const updated: Medicine = {
    ...existing,
    name: name !== undefined ? name.trim() : existing.name,
    genericName: genericName !== undefined ? genericName.trim() : existing.genericName,
    categoryId: categoryId || existing.categoryId,
    categoryName: category ? category.name : existing.categoryName,
    baseNumber: baseNumber !== undefined ? baseNumber.trim().toUpperCase() : existing.baseNumber,
    description: description !== undefined ? description.trim() : existing.description,
    unit: unit || existing.unit,
    minStockLevel: minStockLevel !== undefined ? Number(minStockLevel) : existing.minStockLevel,
    status: status || existing.status,
    department: department || existing.department,
    storageCondition: storageCondition || existing.storageCondition,
    targetTemperature: targetTemperature !== undefined ? targetTemperature : existing.targetTemperature,
    analyzerCompatibility: analyzerCompatibility !== undefined ? analyzerCompatibility : existing.analyzerCompatibility,
    testsPerUnit: testsPerUnit !== undefined ? Number(testsPerUnit) : existing.testsPerUnit,
    openVialShelfLifeDays: openVialShelfLifeDays !== undefined ? Number(openVialShelfLifeDays) : existing.openVialShelfLifeDays,
    hazardClass: hazardClass || existing.hazardClass,
    qcFrequency: qcFrequency || existing.qcFrequency,
    requiresReconstitution: requiresReconstitution !== undefined ? !!requiresReconstitution : existing.requiresReconstitution,
    updatedAt: new Date().toISOString(),
  };

  db.medicines[index] = updated;

  db.auditLogs.push({
    id: `aud-${Date.now()}`,
    userId: req.user?.id || 'system',
    userName: req.user?.fullName || 'System',
    role: req.user?.role || 'Admin',
    action: 'Update',
    table: 'reagents',
    recordId: updated.id,
    description: `Updated Laboratory Reagent specifications for ${updated.name}`,
    ipAddress: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  });

  db.save();

  res.json({
    success: true,
    message: 'Reagent updated successfully',
    reagent: updated,
  });
});

// DELETE /api/reagents/:id
router.delete('/:id', authenticateJWT, requireRole('Admin', 'Laboratorian'), (req: AuthenticatedRequest, res) => {
  const index = db.medicines.findIndex(m => m.id === req.params.id && m.itemType === 'Reagent');
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Reagent not found' });
  }

  const reag = db.medicines[index];
  const hasBatches = db.batches.some(b => b.medicineId === reag.id && b.currentQuantity > 0);
  if (hasBatches) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete reagent with active inventory stock in batches. Please mark as Inactive or deplete stock first.',
    });
  }

  db.medicines.splice(index, 1);

  db.auditLogs.push({
    id: `aud-${Date.now()}`,
    userId: req.user?.id || 'system',
    userName: req.user?.fullName || 'System',
    role: req.user?.role || 'Admin',
    action: 'Delete',
    table: 'reagents',
    recordId: reag.id,
    description: `Deleted reagent item: ${reag.name} (${reag.baseNumber})`,
    ipAddress: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  });

  db.save();

  res.json({
    success: true,
    message: 'Reagent removed successfully',
  });
});

// POST /api/reagents/consume (Lab test execution / consumption deduction)
router.post('/consume', authenticateJWT, requireRole('Admin', 'Laboratorian', 'Doctor'), (req: AuthenticatedRequest, res) => {
  const {
    reagentId,
    batchId,
    testName,
    testsConsumed,
    patientId,
    patientName,
    prescribedByDoctor,
    analyzerUsed,
    qcChecked,
    remarks,
  } = req.body;

  if (!reagentId || !testName || !testsConsumed || Number(testsConsumed) <= 0) {
    return res.status(400).json({ success: false, message: 'Reagent, Test Name, and valid Tests Consumed count are required.' });
  }

  const reagent = db.medicines.find(m => m.id === reagentId && m.itemType === 'Reagent');
  if (!reagent) {
    return res.status(404).json({ success: false, message: 'Laboratory Reagent not found' });
  }

  db.refreshBatchStatuses();

  // Find candidate batch (either specified or FEFO priority)
  let candidateBatches = db.batches
    .filter(b => b.medicineId === reagent.id && (b.status === 'Available' || b.status === 'Expiring Soon') && b.currentQuantity > 0)
    .sort((a, b) => {
      // Prioritize currently unsealed / open vials first, then FEFO expiry
      if (a.isOpenVial && !b.isOpenVial) return -1;
      if (!a.isOpenVial && b.isOpenVial) return 1;
      return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
    });

  if (batchId) {
    candidateBatches = candidateBatches.filter(b => b.id === batchId);
  }

  if (candidateBatches.length === 0) {
    return res.status(400).json({
      success: false,
      message: `No active available inventory stock for reagent ${reagent.name}.`,
    });
  }

  const targetBatch = candidateBatches[0];
  const yieldPerUnit = targetBatch.testsPerUnit || reagent.testsPerUnit || 100;
  const numTests = Number(testsConsumed);
  const unitsToDeduct = Math.min(targetBatch.currentQuantity, Math.max(1, Math.ceil(numTests / yieldPerUnit)));

  targetBatch.currentQuantity = Math.max(0, targetBatch.currentQuantity - unitsToDeduct);
  targetBatch.totalTestsRemaining = targetBatch.currentQuantity * yieldPerUnit;

  if (targetBatch.currentQuantity === 0) {
    targetBatch.status = 'Depleted';
  }

  // Auto unseal if not already unsealed
  if (!targetBatch.isOpenVial) {
    targetBatch.isOpenVial = true;
    targetBatch.unsealedDate = new Date().toISOString();
    const shelfLife = reagent.openVialShelfLifeDays || 30;
    const openExp = new Date();
    openExp.setDate(openExp.getDate() + shelfLife);
    targetBatch.openVialExpiryDate = openExp.toISOString();
  }

  // Log Consumption
  const consumptionLog: ReagentConsumptionLog = {
    id: `rcl-${Date.now()}`,
    reagentId: reagent.id,
    reagentName: reagent.name,
    batchId: targetBatch.id,
    batchNumber: targetBatch.batchNumber,
    department: reagent.department || 'General Laboratory',
    testName: testName.trim(),
    testsConsumed: numTests,
    unitsDeducted: unitsToDeduct,
    patientId: patientId || undefined,
    patientName: patientName ? patientName.trim() : 'Routine / Internal Lab Test',
    prescribedByDoctor: prescribedByDoctor || undefined,
    performedByUserId: req.user?.id || 'system',
    performedByUserName: req.user?.fullName || 'System',
    analyzerUsed: analyzerUsed || reagent.analyzerCompatibility || 'Benchtop Assay',
    qcChecked: qcChecked !== undefined ? !!qcChecked : true,
    remarks: remarks ? remarks.trim() : 'Lab diagnostic test completed successfully.',
    timestamp: new Date().toISOString(),
  };

  db.reagentConsumptionLogs.unshift(consumptionLog);

  // Stock Transaction record for auditability
  const stockTx: StockTransaction = {
    id: `tx-lab-${Date.now()}`,
    transactionNumber: `LAB-TX-${Date.now().toString(36).toUpperCase()}`,
    medicineId: reagent.id,
    medicineName: reagent.name,
    batchId: targetBatch.id,
    batchNumber: targetBatch.batchNumber,
    userId: req.user?.id || 'system',
    userName: req.user?.fullName || 'System',
    transactionType: 'Adjustment',
    quantity: -unitsToDeduct,
    quantityBefore: targetBatch.currentQuantity + unitsToDeduct,
    quantityAfter: targetBatch.currentQuantity,
    referenceNumber: `RCL-${consumptionLog.id}`,
    remarks: `Laboratory Test Consumption: ${testName} (${numTests} tests performed by ${req.user?.fullName || 'User'})`,
    date: new Date().toISOString(),
  };

  db.stockTransactions.push(stockTx);

  db.auditLogs.push({
    id: `aud-${Date.now()}`,
    userId: req.user?.id || 'system',
    userName: req.user?.fullName || 'System',
    role: req.user?.role || 'Admin',
    action: 'Create',
    table: 'reagent_consumption',
    recordId: consumptionLog.id,
    description: `Lab test consumption recorded for ${reagent.name}: ${numTests} tests deducted from batch ${targetBatch.batchNumber}`,
    ipAddress: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  });

  db.save();

  res.json({
    success: true,
    message: `Recorded ${numTests} tests for ${testName}. Stock updated under FEFO lot ${targetBatch.batchNumber}.`,
    log: consumptionLog,
    batch: targetBatch,
  });
});

// POST /api/reagents/unseal-batch (Mark vial/kit opened and compute open-vial expiry)
router.post('/unseal-batch', authenticateJWT, requireRole('Admin', 'Laboratorian'), (req: AuthenticatedRequest, res) => {
  const { batchId, shelfLifeDays } = req.body;
  if (!batchId) {
    return res.status(400).json({ success: false, message: 'Batch ID is required.' });
  }

  const batch = db.batches.find(b => b.id === batchId);
  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch not found.' });
  }

  const reagent = db.medicines.find(m => m.id === batch.medicineId);
  const days = Number(shelfLifeDays) || reagent?.openVialShelfLifeDays || 30;

  const unsealDate = new Date();
  const openExpiry = new Date();
  openExpiry.setDate(unsealDate.getDate() + days);

  // If kit manufacturer expiry is sooner than open vial shelf life, cap at manufacturer expiry
  const mfgExpiry = new Date(batch.expiryDate);
  const finalOpenExpiry = openExpiry < mfgExpiry ? openExpiry : mfgExpiry;

  batch.isOpenVial = true;
  batch.unsealedDate = unsealDate.toISOString();
  batch.openVialExpiryDate = finalOpenExpiry.toISOString();
  batch.isOpenVialExpired = false;

  db.auditLogs.push({
    id: `aud-${Date.now()}`,
    userId: req.user?.id || 'system',
    userName: req.user?.fullName || 'System',
    role: req.user?.role || 'Admin',
    action: 'Update',
    table: 'reagent_batches',
    recordId: batch.id,
    description: `Unsealed reagent batch lot ${batch.batchNumber} (${batch.medicineName}). Open-vial stability active until ${finalOpenExpiry.toISOString().slice(0, 10)}.`,
    ipAddress: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  });

  db.save();

  res.json({
    success: true,
    message: `Batch ${batch.batchNumber} marked unsealed. Open-vial stability tracked until ${finalOpenExpiry.toISOString().slice(0, 10)}.`,
    batch,
  });
});

// POST /api/reagents/update-qc (Quality Control status and calibration verification)
router.post('/update-qc', authenticateJWT, requireRole('Admin', 'Laboratorian'), (req: AuthenticatedRequest, res) => {
  const { batchId, qcStatus, qcNotes } = req.body;
  if (!batchId || !qcStatus) {
    return res.status(400).json({ success: false, message: 'Batch ID and QC Status are required.' });
  }

  const batch = db.batches.find(b => b.id === batchId);
  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch lot not found.' });
  }

  batch.qcStatus = qcStatus;
  batch.lastQCDate = new Date().toISOString();
  batch.qcNotes = qcNotes ? qcNotes.trim() : `QC status verified as ${qcStatus} by ${req.user?.fullName || 'Staff'}`;

  db.auditLogs.push({
    id: `aud-${Date.now()}`,
    userId: req.user?.id || 'system',
    userName: req.user?.fullName || 'System',
    role: req.user?.role || 'Admin',
    action: 'Update',
    table: 'reagent_batches',
    recordId: batch.id,
    description: `QC Status for batch ${batch.batchNumber} updated to ${qcStatus}: ${batch.qcNotes}`,
    ipAddress: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  });

  db.save();

  res.json({
    success: true,
    message: `Quality Control verification updated to "${qcStatus}" for lot ${batch.batchNumber}.`,
    batch,
  });
});

// GET /api/reagents/cold-chain
router.get('/cold-chain', authenticateJWT, (_req, res) => {
  const logs = db.coldChainLogs.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const units = [
    {
      unitName: 'Clinical Chemistry Cold Refrigerator (2°C - 8°C)',
      recommendedRange: '2.0°C to 8.0°C',
      currentTemp: logs.find(l => l.storageUnit.includes('Clinical Chemistry'))?.recordedTemperature ?? 4.2,
      status: 'Optimal',
      lastChecked: logs.find(l => l.storageUnit.includes('Clinical Chemistry'))?.timestamp ?? new Date().toISOString(),
    },
    {
      unitName: 'Blood Bank Refrigerator (2°C - 6°C)',
      recommendedRange: '2.0°C to 6.0°C',
      currentTemp: logs.find(l => l.storageUnit.includes('Blood Bank'))?.recordedTemperature ?? 3.8,
      status: 'Optimal',
      lastChecked: logs.find(l => l.storageUnit.includes('Blood Bank'))?.timestamp ?? new Date().toISOString(),
    },
    {
      unitName: 'Deep Vaccine & Control Specimen Freezer (-20°C)',
      recommendedRange: '-25.0°C to -15.0°C',
      currentTemp: logs.find(l => l.storageUnit.includes('Deep Vaccine'))?.recordedTemperature ?? -19.5,
      status: 'Optimal',
      lastChecked: logs.find(l => l.storageUnit.includes('Deep Vaccine'))?.timestamp ?? new Date().toISOString(),
    },
    {
      unitName: 'Serology & Ambient Storage Cabinet (15°C - 25°C)',
      recommendedRange: '15.0°C to 25.0°C',
      currentTemp: 21.0,
      status: 'Optimal',
      lastChecked: new Date().toISOString(),
    },
  ];

  res.json({
    success: true,
    storageUnits: units,
    logs,
  });
});

// POST /api/reagents/cold-chain
router.post('/cold-chain', authenticateJWT, requireRole('Admin', 'Laboratorian', 'Pharmacist'), (req: AuthenticatedRequest, res) => {
  const { storageUnit, recordedTemperature, minThreshold, maxThreshold, notes } = req.body;

  if (!storageUnit || recordedTemperature === undefined) {
    return res.status(400).json({ success: false, message: 'Storage unit and recorded temperature are required.' });
  }

  const temp = Number(recordedTemperature);
  const min = minThreshold !== undefined ? Number(minThreshold) : 2.0;
  const max = maxThreshold !== undefined ? Number(maxThreshold) : 8.0;

  let status: 'Normal' | 'Warning' | 'Excursion Violation' = 'Normal';
  if (temp < min - 2 || temp > max + 2) {
    status = 'Excursion Violation';
  } else if (temp < min || temp > max) {
    status = 'Warning';
  }

  const newLog: ColdChainLog = {
    id: `ccl-${Date.now()}`,
    storageUnit,
    recordedTemperature: temp,
    minThreshold: min,
    maxThreshold: max,
    status,
    recordedBy: req.user?.fullName || 'Staff',
    timestamp: new Date().toISOString(),
    notes: notes ? notes.trim() : `Manual daily cold-chain verification logged by ${req.user?.fullName || 'Staff'}`,
  };

  db.coldChainLogs.unshift(newLog);

  if (status === 'Excursion Violation') {
    const notif: AppNotification = {
      id: `notif-temp-${Date.now()}`,
      title: '🚨 Cold Chain Temperature Excursion Alert',
      message: `Critical temperature alert in ${storageUnit}: Recorded ${temp}°C (Outside safe limit ${min}°C - ${max}°C). Inspect reagents immediately.`,
      notificationType: 'System',
      priority: 'Critical',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    db.notifications.unshift(notif);
  }

  db.save();

  res.status(201).json({
    success: true,
    message: status === 'Normal' ? 'Temperature log recorded successfully.' : 'Temperature recorded with alert status.',
    log: newLog,
  });
});

// GET /api/reagents/consumption-logs
router.get('/consumption-logs', authenticateJWT, (req, res) => {
  const { department, reagentId, search } = req.query;

  let logs = db.reagentConsumptionLogs.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (department && department !== 'All') {
    logs = logs.filter(l => l.department === department);
  }

  if (reagentId) {
    logs = logs.filter(l => l.reagentId === reagentId);
  }

  if (search) {
    const q = (search as string).toLowerCase().trim();
    logs = logs.filter(
      l =>
        l.reagentName.toLowerCase().includes(q) ||
        l.testName.toLowerCase().includes(q) ||
        l.batchNumber.toLowerCase().includes(q) ||
        (l.patientName && l.patientName.toLowerCase().includes(q)) ||
        l.performedByUserName.toLowerCase().includes(q)
    );
  }

  res.json({
    success: true,
    logs,
  });
});

// DELETE /api/reagents/consumption-logs/:id
router.delete('/consumption-logs/:id', authenticateJWT, requireRole('Admin', 'Laboratorian'), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const index = db.reagentConsumptionLogs.findIndex(l => l.id === id);
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: 'Consumption log not found.',
    });
  }

  const log = db.reagentConsumptionLogs[index];
  db.reagentConsumptionLogs.splice(index, 1);

  db.auditLogs.push({
    id: `aud-${Date.now()}`,
    userId: req.user?.id || 'system',
    userName: req.user?.fullName || 'System',
    role: req.user?.role || 'Laboratorian',
    action: 'Delete',
    table: 'reagent_consumption',
    recordId: log.id,
    description: `Deleted lab test consumption log: ${log.testName} (${log.reagentName})`,
    ipAddress: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  });

  db.save();

  res.json({
    success: true,
    message: 'Consumption log deleted successfully.',
  });
});

export default router;
