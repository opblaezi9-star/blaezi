import { Router } from 'express';
import { db, PurchaseOrder, PurchaseOrderItem, MedicineBatch, StockTransaction, StockMovement, AppNotification } from '../db';
import { authenticateJWT, requireRole, logAudit, AuthenticatedRequest } from '../auth';

const router = Router();

// GET /api/purchases
router.get('/', authenticateJWT, (req, res) => {
  const { status, supplierId, search, itemType } = req.query;

  let list = db.purchaseOrders.map(po => {
    const rawItems = db.purchaseOrderItems.filter(poi => poi.purchaseOrderId === po.id);
    const items = rawItems.map(poi => {
      const medicine = db.medicines.find(m => m.id === poi.medicineId);
      return {
        ...poi,
        itemType: (poi.itemType || medicine?.itemType || 'Medicine') as 'Medicine' | 'Reagent',
        categoryName: poi.categoryName || medicine?.categoryName,
        department: poi.department || medicine?.department,
        storageCondition: poi.storageCondition || medicine?.storageCondition,
        unit: poi.unit || medicine?.unit || 'Unit',
        testsPerUnit: poi.testsPerUnit || medicine?.testsPerUnit,
        analyzerCompatibility: poi.analyzerCompatibility || medicine?.analyzerCompatibility,
      };
    });

    const hasMedicines = items.some(i => i.itemType === 'Medicine');
    const hasReagents = items.some(i => i.itemType === 'Reagent');

    return {
      ...po,
      items,
      itemCount: items.length,
      hasMedicines,
      hasReagents,
      totalOrderedQuantity: items.reduce((acc, i) => acc + i.orderedQuantity, 0),
      totalReceivedQuantity: items.reduce((acc, i) => acc + i.receivedQuantity, 0),
    };
  });

  if (itemType === 'Medicine') {
    list = list.filter(po => po.hasMedicines);
  } else if (itemType === 'Reagent') {
    list = list.filter(po => po.hasReagents);
  }

  if (status) {
    list = list.filter(po => po.orderStatus === status);
  }

  if (supplierId) {
    list = list.filter(po => po.supplierId === supplierId);
  }

  if (search) {
    const q = (search as string).toLowerCase().trim();
    list = list.filter(
      po =>
        po.poNumber.toLowerCase().includes(q) ||
        po.supplierName.toLowerCase().includes(q) ||
        po.createdByName.toLowerCase().includes(q) ||
        (po.items && po.items.some(i => i.medicineName.toLowerCase().includes(q) || i.baseNumber.toLowerCase().includes(q)))
    );
  }

  res.json({
    success: true,
    count: list.length,
    purchaseOrders: list,
  });
});

// GET /api/purchases/:id
router.get('/:id', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const po = db.purchaseOrders.find(p => p.id === id);

  if (!po) {
    return res.status(404).json({
      success: false,
      message: 'Purchase order not found.',
    });
  }

  const rawItems = db.purchaseOrderItems.filter(i => i.purchaseOrderId === po.id);
  const items = rawItems.map(poi => {
    const medicine = db.medicines.find(m => m.id === poi.medicineId);
    return {
      ...poi,
      itemType: (poi.itemType || medicine?.itemType || 'Medicine') as 'Medicine' | 'Reagent',
      categoryName: poi.categoryName || medicine?.categoryName,
      department: poi.department || medicine?.department,
      storageCondition: poi.storageCondition || medicine?.storageCondition,
      unit: poi.unit || medicine?.unit || 'Unit',
      testsPerUnit: poi.testsPerUnit || medicine?.testsPerUnit,
      analyzerCompatibility: poi.analyzerCompatibility || medicine?.analyzerCompatibility,
    };
  });

  const hasMedicines = items.some(i => i.itemType === 'Medicine');
  const hasReagents = items.some(i => i.itemType === 'Reagent');

  res.json({
    success: true,
    purchaseOrder: {
      ...po,
      items,
      hasMedicines,
      hasReagents,
    },
  });
});

// POST /api/purchases (Admin and Pharmacist only; DOCTOR gets 403 Access Denied)
router.post('/', authenticateJWT, requireRole(['Admin', 'Pharmacist']), (req: AuthenticatedRequest, res) => {
  const { supplierId, expectedDeliveryDate, notes, items } = req.body;

  if (!supplierId || !expectedDeliveryDate || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Supplier, expected delivery date, and at least one purchase item are required.',
    });
  }

  const supplier = db.suppliers.find(s => s.id === supplierId);
  if (!supplier) {
    return res.status(400).json({
      success: false,
      message: 'Specified supplier does not exist.',
    });
  }

  // Validate items
  let totalAmount = 0;
  const processedItems: Array<{
    medicine: any;
    orderedQuantity: number;
    purchasePrice: number;
    sellingPrice: number;
    subtotal: number;
    batchNumber?: string;
    expiryDate?: string;
    itemType?: 'Medicine' | 'Reagent';
    categoryName?: string;
    department?: string;
    storageCondition?: string;
    unit?: string;
    testsPerUnit?: number;
    analyzerCompatibility?: string;
  }> = [];

  for (const item of items) {
    if (!item.medicineId || !item.orderedQuantity || item.orderedQuantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Each item must have a valid medicine/reagent and ordered quantity greater than zero.',
      });
    }

    const medicine = db.medicines.find(m => m.id === item.medicineId);
    if (!medicine) {
      return res.status(400).json({
        success: false,
        message: `Item with ID "${item.medicineId}" does not exist.`,
      });
    }

    const pPrice = Number(item.purchasePrice) >= 0 ? Number(item.purchasePrice) : 0;
    const sPrice = Number(item.sellingPrice) >= 0 ? Number(item.sellingPrice) : pPrice * 1.5;
    const subtotal = pPrice * Number(item.orderedQuantity);
    totalAmount += subtotal;

    processedItems.push({
      medicine,
      orderedQuantity: Number(item.orderedQuantity),
      purchasePrice: pPrice,
      sellingPrice: sPrice,
      subtotal,
      batchNumber: item.batchNumber?.trim() || undefined,
      expiryDate: item.expiryDate || undefined,
      itemType: medicine.itemType || 'Medicine',
      categoryName: medicine.categoryName,
      department: medicine.department,
      storageCondition: medicine.storageCondition,
      unit: medicine.unit,
      testsPerUnit: medicine.testsPerUnit,
      analyzerCompatibility: medicine.analyzerCompatibility,
    });
  }

  const user = req.user!;
  const poId = `po-${Date.now()}`;
  const poCount = db.purchaseOrders.length + 1;
  const currentYear = new Date().getFullYear();
  const poNumber = `PO-${currentYear}-${String(poCount).padStart(4, '0')}`;

  const hasMedicines = processedItems.some(i => i.itemType === 'Medicine');
  const hasReagents = processedItems.some(i => i.itemType === 'Reagent');

  const newPO: PurchaseOrder = {
    id: poId,
    poNumber,
    supplierId: supplier.id,
    supplierName: supplier.name,
    orderDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate,
    totalAmount: Math.round(totalAmount * 100) / 100,
    paymentStatus: 'Pending',
    orderStatus: 'Ordered',
    createdBy: user.id,
    createdByName: user.fullName,
    notes: notes || '',
    hasMedicines,
    hasReagents,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const createdItems: PurchaseOrderItem[] = processedItems.map((pi, idx) => ({
    id: `poi-${Date.now()}-${idx}`,
    purchaseOrderId: poId,
    medicineId: pi.medicine.id,
    medicineName: pi.medicine.name,
    baseNumber: pi.medicine.baseNumber,
    orderedQuantity: pi.orderedQuantity,
    receivedQuantity: 0,
    purchasePrice: pi.purchasePrice,
    sellingPrice: pi.sellingPrice,
    subtotal: Math.round(pi.subtotal * 100) / 100,
    batchNumber: pi.batchNumber,
    expiryDate: pi.expiryDate,
    itemType: pi.itemType,
    categoryName: pi.categoryName,
    department: pi.department,
    storageCondition: pi.storageCondition,
    unit: pi.unit,
    testsPerUnit: pi.testsPerUnit,
    analyzerCompatibility: pi.analyzerCompatibility,
  }));

  // Transactional append
  db.purchaseOrders.unshift(newPO);
  db.purchaseOrderItems.push(...createdItems);
  db.save();

  logAudit(
    req,
    'Create',
    'purchase_orders',
    newPO.id,
    `Created Purchase Order ${newPO.poNumber} with ${createdItems.length} items (${hasReagents ? 'Includes Diagnostic Reagents' : 'Medicines'}) (Total: ₹${newPO.totalAmount.toFixed(2)}) for ${supplier.name}`
  );

  // In-app notification
  const notif: AppNotification = {
    id: `notif-${Date.now()}`,
    title: 'New Purchase Order Created',
    message: `Purchase Order ${newPO.poNumber} for ${supplier.name} has been placed. Amount: ₹${newPO.totalAmount.toFixed(2)}.`,
    notificationType: 'Purchase',
    priority: 'Medium',
    isRead: false,
    metadata: { poId: newPO.id, poNumber: newPO.poNumber },
    createdAt: new Date().toISOString(),
  };
  db.notifications.unshift(notif);
  db.save();

  res.status(201).json({
    success: true,
    message: 'Purchase Order created successfully.',
    purchaseOrder: {
      ...newPO,
      items: createdItems,
    },
  });
});

// POST /api/purchases/:id/receive (Admin and Pharmacist only - Purchase Receiving with Partial Support & Transaction Audit)
router.post('/:id/receive', authenticateJWT, requireRole(['Admin', 'Pharmacist']), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { items } = req.body; // array of { itemId, receivedQuantity, batchNumber, expiryDate, manufacturingDate, purchasePrice, sellingPrice, qcStatus, storageLocation, testsPerUnit }

  const po = db.purchaseOrders.find(p => p.id === id);
  if (!po) {
    return res.status(404).json({
      success: false,
      message: 'Purchase order not found.',
    });
  }

  if (po.orderStatus === 'Received') {
    return res.status(400).json({
      success: false,
      message: `Purchase order ${po.poNumber} has already been fully received.`,
    });
  }

  if (po.orderStatus === 'Cancelled') {
    return res.status(400).json({
      success: false,
      message: `Cannot receive items for a cancelled purchase order (${po.poNumber}).`,
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide items to receive.',
    });
  }

  const poItems = db.purchaseOrderItems.filter(i => i.purchaseOrderId === po.id);
  const user = req.user!;

  // Verification phase (ensure no over-receiving)
  for (const itemPayload of items) {
    const poItem = poItems.find(i => i.id === itemPayload.itemId);
    if (!poItem) {
      return res.status(400).json({
        success: false,
        message: `Item with ID ${itemPayload.itemId} not found in this purchase order.`,
      });
    }

    const qtyToReceive = Number(itemPayload.receivedQuantity);
    if (isNaN(qtyToReceive) || qtyToReceive <= 0) {
      continue; // skip zero/invalid entries
    }

    const remainingAllowed = poItem.orderedQuantity - poItem.receivedQuantity;
    if (qtyToReceive > remainingAllowed) {
      return res.status(400).json({
        success: false,
        message: `Over-receiving error for ${poItem.medicineName}: Ordered ${poItem.orderedQuantity}, already received ${poItem.receivedQuantity}, remaining outstanding is ${remainingAllowed}. You cannot receive ${qtyToReceive}.`,
      });
    }
  }

  // Execution phase inside simulated transaction
  const updatedBatches: MedicineBatch[] = [];
  const createdTransactions: StockTransaction[] = [];
  const createdMovements: StockMovement[] = [];
  let anyReceived = false;

  for (const itemPayload of items) {
    const poItem = poItems.find(i => i.id === itemPayload.itemId);
    if (!poItem) continue;

    const qtyToReceive = Number(itemPayload.receivedQuantity);
    if (isNaN(qtyToReceive) || qtyToReceive <= 0) continue;

    anyReceived = true;

    const medicine = db.medicines.find(m => m.id === poItem.medicineId);
    const isReagent = (medicine?.itemType === 'Reagent' || poItem.itemType === 'Reagent');

    // Generate batch number if not provided
    const batchNo = (itemPayload.batchNumber || poItem.batchNumber || `BATCH-${po.poNumber.slice(-4)}-${Date.now().toString().slice(-4)}`).trim().toUpperCase();
    const expiryDate = itemPayload.expiryDate || poItem.expiryDate || new Date(Date.now() + 365 * 24 * 3600 * 1000 * 2).toISOString().split('T')[0];
    const mfgDate = itemPayload.manufacturingDate || new Date().toISOString().split('T')[0];
    const pPrice = Number(itemPayload.purchasePrice) || poItem.purchasePrice;
    const sPrice = Number(itemPayload.sellingPrice) || poItem.sellingPrice;

    // Check if batch already exists
    let batch = db.batches.find(b => b.medicineId === poItem.medicineId && b.batchNumber === batchNo);
    let qtyBefore = 0;

    if (batch) {
      qtyBefore = batch.currentQuantity;
      batch.currentQuantity += qtyToReceive;
      batch.quantityReceived += qtyToReceive;
      batch.status = 'Available';
      if (isReagent) {
        if (itemPayload.testsPerUnit) batch.testsPerUnit = Number(itemPayload.testsPerUnit);
        if (batch.testsPerUnit) batch.totalTestsRemaining = (batch.totalTestsRemaining || 0) + (qtyToReceive * batch.testsPerUnit);
        if (itemPayload.storageLocation) batch.storageLocation = itemPayload.storageLocation;
        if (itemPayload.qcStatus) batch.qcStatus = itemPayload.qcStatus;
      }
    } else {
      const testsPerUnit = Number(itemPayload.testsPerUnit) || medicine?.testsPerUnit || (isReagent ? 100 : undefined);
      batch = {
        id: `bat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        medicineId: poItem.medicineId,
        medicineName: poItem.medicineName,
        baseNumber: poItem.baseNumber,
        batchNumber: batchNo,
        manufacturingDate: mfgDate,
        expiryDate: expiryDate,
        quantityReceived: qtyToReceive,
        currentQuantity: qtyToReceive,
        purchasePrice: pPrice,
        sellingPrice: sPrice,
        supplierId: po.supplierId,
        supplierName: po.supplierName,
        status: 'Available',
        itemType: isReagent ? 'Reagent' : 'Medicine',
        testsPerUnit: isReagent ? testsPerUnit : undefined,
        totalTestsRemaining: isReagent && testsPerUnit ? (qtyToReceive * testsPerUnit) : undefined,
        storageLocation: isReagent ? (itemPayload.storageLocation || (medicine?.storageCondition ? `${medicine.storageCondition} Shelf` : 'Main Lab Refrigerator (2-8°C)')) : undefined,
        qcStatus: isReagent ? (itemPayload.qcStatus || 'QC Passed') : undefined,
        isOpenVial: isReagent ? false : undefined,
        createdAt: new Date().toISOString(),
      };
      db.batches.unshift(batch);
    }
    updatedBatches.push(batch);

    // Update PO Item
    poItem.receivedQuantity += qtyToReceive;
    poItem.batchNumber = batchNo;
    poItem.expiryDate = expiryDate;

    // Create Stock Transaction
    const tx: StockTransaction = {
      id: `st-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      transactionNumber: `ST-${Date.now().toString().slice(-6)}`,
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      medicineId: poItem.medicineId,
      medicineName: poItem.medicineName,
      userId: user.id,
      userName: user.fullName,
      transactionType: 'Purchase',
      quantity: qtyToReceive,
      quantityBefore: qtyBefore,
      quantityAfter: batch.currentQuantity,
      referenceNumber: po.poNumber,
      remarks: `Goods receipt for PO ${po.poNumber} (${qtyToReceive} units${isReagent ? ' - Diagnostic Reagent Lot' : ''})`,
      date: new Date().toISOString(),
    };
    db.stockTransactions.unshift(tx);
    createdTransactions.push(tx);

    // Create Stock Movement
    const mov: StockMovement = {
      id: `sm-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      movementNumber: `MOV-${Date.now().toString().slice(-6)}`,
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      medicineId: poItem.medicineId,
      medicineName: poItem.medicineName,
      userId: user.id,
      userName: user.fullName,
      movementType: 'Purchase',
      quantityIn: qtyToReceive,
      quantityOut: 0,
      balanceAfter: batch.currentQuantity,
      referenceNumber: po.poNumber,
      remarks: `Received via PO ${po.poNumber} (${isReagent ? 'Reagent Lot Restock' : 'Medicine Batch Restock'})`,
      createdAt: new Date().toISOString(),
    };
    db.stockMovements.unshift(mov);
    createdMovements.push(mov);
  }

  if (!anyReceived) {
    return res.status(400).json({
      success: false,
      message: 'No valid quantities were provided to receive.',
    });
  }

  // Update PO Overall Status
  const totalOrdered = poItems.reduce((acc, i) => acc + i.orderedQuantity, 0);
  const totalReceived = poItems.reduce((acc, i) => acc + i.receivedQuantity, 0);

  if (totalReceived >= totalOrdered) {
    po.orderStatus = 'Received';
    po.receivedDate = new Date().toISOString().split('T')[0];
  } else if (totalReceived > 0) {
    po.orderStatus = 'Partially Received';
  }
  po.updatedAt = new Date().toISOString();

  db.save();

  // Audit log
  logAudit(
    req,
    'Purchase',
    'purchase_orders',
    po.id,
    `Purchase order ${po.poNumber} received by ${user.fullName}. Status is now ${po.orderStatus}. Total items received: ${totalReceived}/${totalOrdered}.`
  );

  // In-app notification
  const notif: AppNotification = {
    id: `notif-${Date.now()}`,
    title: 'Purchase Order Stock Received',
    message: `PO ${po.poNumber} from ${po.supplierName} was processed. Stock has been updated in inventory.`,
    notificationType: 'Purchase',
    priority: 'Medium',
    isRead: false,
    metadata: { poId: po.id, poNumber: po.poNumber },
    createdAt: new Date().toISOString(),
  };
  db.notifications.unshift(notif);
  db.save();

  res.json({
    success: true,
    message: `Purchase Order ${po.poNumber} successfully processed. Status: ${po.orderStatus}.`,
    purchaseOrder: {
      ...po,
      items: poItems,
    },
    updatedBatches,
  });
});

// DELETE /api/purchases/:id (Admin and Pharmacist)
router.delete('/:id', authenticateJWT, requireRole(['Admin', 'Pharmacist']), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const index = db.purchaseOrders.findIndex(p => p.id === id || p.poNumber === id);
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: 'Purchase order not found.',
    });
  }

  const po = db.purchaseOrders[index];
  db.purchaseOrders.splice(index, 1);
  db.purchaseOrderItems = db.purchaseOrderItems.filter(poi => poi.purchaseOrderId !== po.id);
  db.save();

  logAudit(
    req,
    'Delete',
    'purchase_orders',
    po.id,
    `Deleted purchase order ${po.poNumber} (Supplier: ${po.supplierName})`
  );

  res.json({
    success: true,
    message: `Purchase order "${po.poNumber}" deleted successfully.`,
  });
});

export default router;
