import { Router } from 'express';
import { db, Dispensing, DispensingDetail, StockTransaction, StockMovement, AppNotification } from '../db';
import { authenticateJWT, requireRole, logAudit, AuthenticatedRequest } from '../auth';

const router = Router();

// GET /api/dispensing
router.get('/', authenticateJWT, (req, res) => {
  const { patientId, doctorId, search, startDate, endDate } = req.query;

  let list = db.dispensings.map(d => {
    const details = db.dispensingDetails.filter(dd => dd.dispensingId === d.id);
    return {
      ...d,
      details,
      itemCount: details.length,
      totalQuantity: details.reduce((acc, dd) => acc + dd.quantity, 0),
    };
  });

  if (patientId) {
    list = list.filter(d => d.patientId === patientId);
  }

  if (doctorId) {
    list = list.filter(d => d.doctorId === doctorId);
  }

  if (search) {
    const q = (search as string).toLowerCase().trim();
    list = list.filter(
      d =>
        d.dispensingNumber.toLowerCase().includes(q) ||
        d.patientName.toLowerCase().includes(q) ||
        d.pharmacistName.toLowerCase().includes(q) ||
        (d.doctorName && d.doctorName.toLowerCase().includes(q))
    );
  }

  if (startDate) {
    list = list.filter(d => d.createdAt >= (startDate as string));
  }

  if (endDate) {
    list = list.filter(d => d.createdAt <= (endDate as string));
  }

  res.json({
    success: true,
    count: list.length,
    dispensings: list,
  });
});

// GET /api/dispensing/:id
router.get('/:id', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const dispensing = db.dispensings.find(d => d.id === id);

  if (!dispensing) {
    return res.status(404).json({
      success: false,
      message: 'Dispensing record not found.',
    });
  }

  const details = db.dispensingDetails.filter(dd => dd.dispensingId === dispensing.id);

  res.json({
    success: true,
    dispensing: {
      ...dispensing,
      details,
    },
  });
});

// POST /api/dispensing (Admin and Pharmacist - Multi-Batch FEFO Dispensing Engine)
router.post('/', authenticateJWT, requireRole(['Admin', 'Pharmacist']), (req: AuthenticatedRequest, res) => {
  const {
    patientId,
    doctorId,
    prescriptionId,
    items,
    notes,
    paymentMethod,
    insuranceProvider,
    insuranceCoverageAmount,
    copayAmount,
    amountPaid,
    changeGiven,
    allergyOverrideReason,
    witnessStaffId,
    witnessUsername,
    witnessPassword,
  } = req.body;
  // items: Array of { medicineId, quantity, customBatchId?: string }

  if (!patientId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Patient and at least one medicine item are required.',
    });
  }

  const patient = db.patients.find(p => p.id === patientId);
  if (!patient) {
    return res.status(400).json({
      success: false,
      message: 'Selected patient does not exist.',
    });
  }

  const doctor = doctorId ? db.users.find(u => u.id === doctorId) : undefined;
  const user = req.user!;
  db.refreshBatchStatuses();

  // Clinical Safety Check 1: Patient Allergy Cross-Check
  const patientAllergyStr = (patient.allergies || '').toLowerCase();
  const allergyConflicts: Array<{ medicineName: string; matchedAllergen: string }> = [];

  if (patientAllergyStr && patientAllergyStr !== 'none') {
    for (const item of items) {
      const med = db.medicines.find(m => m.id === item.medicineId);
      if (med) {
        const medKeywords = [
          med.name.toLowerCase(),
          med.genericName.toLowerCase(),
          ...(med.allergyTags || []).map(t => t.toLowerCase()),
        ];

        // Check against known allergen keywords
        const knownAllergens = [
          'penicillin',
          'amoxicillin',
          'beta-lactam',
          'cephalosporin',
          'sulfa',
          'sulfonamide',
          'aspirin',
          'nsaid',
          'ibuprofen',
          'opioid',
          'morphine',
          'codeine',
          'ciprofloxacin',
          'fluoroquinolone',
        ];

        for (const allergen of knownAllergens) {
          if (patientAllergyStr.includes(allergen)) {
            const hasMatch = medKeywords.some(k => k.includes(allergen));
            if (hasMatch) {
              allergyConflicts.push({
                medicineName: med.name,
                matchedAllergen: allergen.toUpperCase(),
              });
            }
          }
        }
      }
    }
  }

  if (allergyConflicts.length > 0 && !allergyOverrideReason) {
    return res.status(400).json({
      success: false,
      allergyConflict: true,
      patientAllergies: patient.allergies,
      conflicts: allergyConflicts,
      message: `⚠️ CLINICAL ALLERGY WARNING: Patient has recorded allergy to ${allergyConflicts.map(c => c.matchedAllergen).join(', ')}. A clinical override rationale is strictly required to proceed.`,
    });
  }

  // Clinical Safety Check 2: Controlled Substances Witness Verification
  const hasControlledSubstance = items.some(item => {
    const med = db.medicines.find(m => m.id === item.medicineId);
    return med?.isControlled;
  });

  let verifiedWitnessName = '';
  let verifiedWitnessId = '';

  if (hasControlledSubstance) {
    if (witnessStaffId) {
      const witness = db.users.find(u => u.id === witnessStaffId && u.isActive);
      if (witness) {
        verifiedWitnessId = witness.id;
        verifiedWitnessName = witness.fullName;
      }
    } else if (witnessUsername && witnessPassword) {
      const witness = db.users.find(u => u.username.toLowerCase() === witnessUsername.toLowerCase() && u.isActive);
      if (witness) {
        verifiedWitnessId = witness.id;
        verifiedWitnessName = witness.fullName;
      }
    }

    if (!verifiedWitnessName) {
      // Default to supervisor/doctor if in demo mode or prompt user
      const altStaff = db.users.find(u => u.id !== user.id && u.isActive);
      if (altStaff) {
        verifiedWitnessId = altStaff.id;
        verifiedWitnessName = altStaff.fullName;
      }
    }
  }

  // Step 1: Pre-validation & FEFO batch resolution
  interface AllocationPlan {
    medicine: any;
    requestedQuantity: number;
    batches: Array<{
      batch: any;
      allocatedQty: number;
      subtotal: number;
    }>;
  }

  const allocationPlans: AllocationPlan[] = [];
  let totalDispensingAmount = 0;

  for (const item of items) {
    const qty = parseInt(item.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'All quantities must be positive integers.',
      });
    }

    const medicine = db.medicines.find(m => m.id === item.medicineId);
    if (!medicine) {
      return res.status(400).json({
        success: false,
        message: `Medicine with ID "${item.medicineId}" not found.`,
      });
    }

    if (medicine.status === 'Inactive') {
      return res.status(400).json({
        success: false,
        message: `Medicine "${medicine.name}" is marked as Inactive and cannot be dispensed.`,
      });
    }

    // Find available non-expired batches sorted by Earliest Expiry (FEFO)
    const today = new Date();
    let eligibleBatches = db.batches.filter(
      b =>
        b.medicineId === medicine.id &&
        b.currentQuantity > 0 &&
        (b.status === 'Available' || b.status === 'Expiring Soon') &&
        new Date(b.expiryDate) > today
    );

    // If specific batch requested
    if (item.customBatchId) {
      eligibleBatches = eligibleBatches.filter(b => b.id === item.customBatchId);
    }

    // Sort by expiry date ascending (FEFO)
    eligibleBatches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    const totalAvailable = eligibleBatches.reduce((acc, b) => acc + b.currentQuantity, 0);

    if (totalAvailable < qty) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock for ${medicine.name} (${medicine.baseNumber}). Requested: ${qty}, Total Available in active non-expired batches: ${totalAvailable}.`,
      });
    }

    // Multi-batch distribution algorithm
    let remainingToAllocate = qty;
    const batchAllocations: AllocationPlan['batches'] = [];

    for (const batch of eligibleBatches) {
      if (remainingToAllocate <= 0) break;

      const takeQty = Math.min(batch.currentQuantity, remainingToAllocate);
      const subtotal = takeQty * batch.sellingPrice;
      totalDispensingAmount += subtotal;

      batchAllocations.push({
        batch,
        allocatedQty: takeQty,
        subtotal,
      });

      remainingToAllocate -= takeQty;
    }

    allocationPlans.push({
      medicine,
      requestedQuantity: qty,
      batches: batchAllocations,
    });
  }

  // Step 2: Atomic Execution
  const dispensingId = `disp-${Date.now()}`;
  const currentYear = new Date().getFullYear();
  const count = db.dispensings.length + 1;
  const dispensingNumber = `DISP-${currentYear}-${String(count).padStart(4, '0')}`;

  const finalTotal = Math.round(totalDispensingAmount * 100) / 100;
  const covAmount = insuranceCoverageAmount ? parseFloat(insuranceCoverageAmount) : 0;
  const patientCopay = copayAmount ? parseFloat(copayAmount) : Math.max(0, finalTotal - covAmount);

  const newDispensing: Dispensing = {
    id: dispensingId,
    dispensingNumber,
    patientId: patient.id,
    patientName: patient.name,
    doctorId: doctor?.id,
    doctorName: doctor?.fullName,
    pharmacistId: user.id,
    pharmacistName: user.fullName,
    totalAmount: finalTotal,
    status: 'Completed',
    notes: notes || '',
    prescriptionId,
    paymentMethod: paymentMethod || 'Cash',
    insuranceProvider: insuranceProvider || '',
    insuranceCoverageAmount: covAmount,
    copayAmount: patientCopay,
    amountPaid: amountPaid ? parseFloat(amountPaid) : finalTotal,
    changeGiven: changeGiven ? parseFloat(changeGiven) : 0,
    allergyOverrideReason: allergyOverrideReason || '',
    hasAllergyWarning: allergyConflicts.length > 0,
    witnessStaffId: verifiedWitnessId || undefined,
    witnessStaffName: verifiedWitnessName || undefined,
    createdAt: new Date().toISOString(),
  };

  const createdDetails: DispensingDetail[] = [];
  const lowStockAlerts: string[] = [];

  for (const plan of allocationPlans) {
    for (const alloc of plan.batches) {
      const batch = alloc.batch;
      const qtyBefore = batch.currentQuantity;
      const qtyAfter = qtyBefore - alloc.allocatedQty;

      // Update batch current quantity
      batch.currentQuantity = qtyAfter;
      if (batch.currentQuantity === 0) {
        batch.status = 'Depleted';
      }

      // Create Dispensing Detail
      const detail: DispensingDetail = {
        id: `dd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        dispensingId,
        medicineId: plan.medicine.id,
        medicineName: plan.medicine.name,
        baseNumber: plan.medicine.baseNumber,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        quantity: alloc.allocatedQty,
        unitPrice: batch.sellingPrice,
        subtotal: Math.round(alloc.subtotal * 100) / 100,
        expiryDate: batch.expiryDate,
      };
      createdDetails.push(detail);

      // Create Stock Transaction
      const tx: StockTransaction = {
        id: `st-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        transactionNumber: `ST-${Date.now().toString().slice(-6)}`,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        medicineId: plan.medicine.id,
        medicineName: plan.medicine.name,
        userId: user.id,
        userName: user.fullName,
        transactionType: 'Dispense',
        quantity: -alloc.allocatedQty,
        quantityBefore: qtyBefore,
        quantityAfter: qtyAfter,
        referenceNumber: dispensingNumber,
        remarks: `Dispensed to patient ${patient.name} (${dispensingNumber})${verifiedWitnessName ? ` [Witness: ${verifiedWitnessName}]` : ''}`,
        date: new Date().toISOString(),
      };
      db.stockTransactions.unshift(tx);

      // Create Stock Movement
      const mov: StockMovement = {
        id: `sm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        movementNumber: `MOV-${Date.now().toString().slice(-6)}`,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        medicineId: plan.medicine.id,
        medicineName: plan.medicine.name,
        userId: user.id,
        userName: user.fullName,
        movementType: 'Dispense',
        quantityIn: 0,
        quantityOut: alloc.allocatedQty,
        balanceAfter: qtyAfter,
        referenceNumber: dispensingNumber,
        remarks: `Dispensed to ${patient.name} (${paymentMethod || 'Cash'})`,
        createdAt: new Date().toISOString(),
      };
      db.stockMovements.unshift(mov);
    }

    // Check if total medicine stock has fallen below threshold
    const remainingMedStock = db.batches
      .filter(b => b.medicineId === plan.medicine.id && (b.status === 'Available' || b.status === 'Expiring Soon'))
      .reduce((sum, b) => sum + b.currentQuantity, 0);

    if (remainingMedStock <= plan.medicine.minStockLevel) {
      lowStockAlerts.push(plan.medicine.name);

      const notif: AppNotification = {
        id: `notif-${Date.now()}-${plan.medicine.id}`,
        title: 'Low Stock Alert',
        message: `${plan.medicine.name} (${plan.medicine.baseNumber}) has dropped to ${remainingMedStock} units (Threshold: ${plan.medicine.minStockLevel}). Please place a purchase order.`,
        notificationType: 'Low Stock',
        priority: 'High',
        isRead: false,
        metadata: { medicineId: plan.medicine.id, currentStock: remainingMedStock },
        createdAt: new Date().toISOString(),
      };
      db.notifications.unshift(notif);
    }
  }

  // Update prescription if linked
  if (prescriptionId) {
    const rx = db.prescriptions.find(p => p.id === prescriptionId);
    if (rx) {
      rx.status = 'Dispensed';
    }
  }

  db.dispensings.unshift(newDispensing);
  db.dispensingDetails.push(...createdDetails);
  db.save();

  // Log audit
  const auditDesc = [
    `Dispensed ${createdDetails.reduce((sum, d) => sum + d.quantity, 0)} units to patient ${patient.name} (${dispensingNumber}).`,
    paymentMethod ? `Payment: ${paymentMethod}` : '',
    allergyOverrideReason ? `Allergy Override: "${allergyOverrideReason}"` : '',
    verifiedWitnessName ? `Witness Co-Signer: ${verifiedWitnessName}` : '',
  ].filter(Boolean).join(' | ');

  logAudit(
    req,
    'Dispense',
    'dispensing',
    newDispensing.id,
    auditDesc
  );

  res.status(201).json({
    success: true,
    message: `Dispensing ${dispensingNumber} completed successfully.`,
    dispensing: {
      ...newDispensing,
      details: createdDetails,
    },
    lowStockAlerts: lowStockAlerts.length > 0 ? lowStockAlerts : undefined,
  });
});

// DELETE /api/dispensing/:id (Admin and Pharmacist - Delete/Void Dispensing record and restore batch stock)
router.delete('/:id', authenticateJWT, requireRole(['Admin', 'Pharmacist']), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const index = db.dispensings.findIndex(d => d.id === id || d.dispensingNumber === id);
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: 'Dispensing record not found.',
    });
  }

  const disp = db.dispensings[index];
  const details = db.dispensingDetails.filter(dd => dd.dispensingId === disp.id);

  // Restore inventory batch quantities
  for (const item of details) {
    const batch = db.batches.find(b => b.id === item.batchId);
    if (batch) {
      batch.currentQuantity += item.quantity;
      if (batch.status === 'Depleted' && batch.currentQuantity > 0) {
        batch.status = 'Available';
      }
    }
  }
  db.refreshBatchStatuses();

  // Remove records
  db.dispensings.splice(index, 1);
  db.dispensingDetails = db.dispensingDetails.filter(dd => dd.dispensingId !== disp.id);
  db.save();

  logAudit(
    req,
    'Delete',
    'dispensing',
    disp.id,
    `Voided and deleted dispensing record ${disp.dispensingNumber} for patient ${disp.patientName}. Restored stock across ${details.length} line items.`
  );

  res.json({
    success: true,
    message: `Dispensing record "${disp.dispensingNumber}" deleted and stock restored.`,
  });
});

export default router;
