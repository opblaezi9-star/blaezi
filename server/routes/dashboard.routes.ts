import { Router } from 'express';
import { db } from '../db';
import { authenticateJWT } from '../auth';

const router = Router();

// GET /api/dashboard
router.get('/', authenticateJWT, (_req, res) => {
  db.refreshBatchStatuses();

  // Medicines vs Reagents segregation
  const allMedicines = db.medicines.filter(m => (m.itemType || 'Medicine') === 'Medicine');
  const allReagents = db.medicines.filter(m => m.itemType === 'Reagent');

  const totalMedicines = allMedicines.length;
  const activeMedicines = allMedicines.filter(m => m.status === 'Active').length;

  const totalReagents = allReagents.length;
  const activeReagents = allReagents.filter(r => r.status === 'Active').length;

  const totalBatches = db.batches.length;
  const availableBatches = db.batches.filter(b => b.status === 'Available').length;
  const expiringSoonBatches = db.batches.filter(b => b.status === 'Expiring Soon').length;
  const expiredBatches = db.batches.filter(b => b.status === 'Expired').length;

  // Reagent batch metrics
  const reagentBatches = db.batches.filter(b => b.itemType === 'Reagent' || allReagents.some(r => r.id === b.medicineId));
  const medicineBatches = db.batches.filter(b => (b.itemType || 'Medicine') === 'Medicine' && !allReagents.some(r => r.id === b.medicineId));

  let totalReagentKits = 0;
  let totalTestsAvailable = 0;
  let reagentInventoryValue = 0;

  reagentBatches.forEach(b => {
    if (b.status === 'Available' || b.status === 'Expiring Soon') {
      totalReagentKits += b.currentQuantity;
      const med = allReagents.find(r => r.id === b.medicineId);
      const testsPerUnit = b.testsPerUnit || med?.testsPerUnit || 1;
      const tests = b.totalTestsRemaining !== undefined ? b.totalTestsRemaining : (b.currentQuantity * testsPerUnit);
      totalTestsAvailable += tests;
      reagentInventoryValue += (b.currentQuantity * b.purchasePrice);
    }
  });

  const openVials = reagentBatches.filter(b => b.isOpenVial && (b.status === 'Available' || b.status === 'Expiring Soon'));
  const openVialsNearExpiry = openVials.filter(b => {
    if (!b.openVialExpiryDate) return false;
    const diffDays = (new Date(b.openVialExpiryDate).getTime() - Date.now()) / (1000 * 3600 * 24);
    return diffDays <= 7;
  });

  // Calculate current stock and low stock items (Medicines)
  let totalStockUnits = 0;
  let totalInventoryValue = 0;

  db.batches.forEach(b => {
    if (b.status === 'Available' || b.status === 'Expiring Soon') {
      totalStockUnits += b.currentQuantity;
      totalInventoryValue += b.currentQuantity * b.purchasePrice;
    }
  });

  const lowStockMedicines = allMedicines.filter(med => {
    const medStock = medicineBatches
      .filter(b => b.medicineId === med.id && (b.status === 'Available' || b.status === 'Expiring Soon'))
      .reduce((sum, b) => sum + b.currentQuantity, 0);
    return medStock <= med.minStockLevel;
  });

  const lowStockReagents = allReagents.filter(reag => {
    const reagStock = reagentBatches
      .filter(b => b.medicineId === reag.id && (b.status === 'Available' || b.status === 'Expiring Soon'))
      .reduce((sum, b) => sum + b.currentQuantity, 0);
    return reagStock <= reag.minStockLevel;
  });

  // Expiring counts
  const expiringMedicineBatches = medicineBatches.filter(b => b.status === 'Expiring Soon' && b.currentQuantity > 0);
  const expiringReagentBatches = reagentBatches.filter(b => b.status === 'Expiring Soon' && b.currentQuantity > 0);

  const expiredMedicineBatches = medicineBatches.filter(b => b.status === 'Expired' && b.currentQuantity > 0);
  const expiredReagentBatches = reagentBatches.filter(b => b.status === 'Expired' && b.currentQuantity > 0);

  // Today's dispensing
  const todayStr = new Date().toISOString().split('T')[0];
  const todayDispensings = db.dispensings.filter(d => d.createdAt.startsWith(todayStr));
  const todayDispensingUnits = db.dispensingDetails
    .filter(dd => {
      const parent = db.dispensings.find(d => d.id === dd.dispensingId);
      return parent && parent.createdAt.startsWith(todayStr);
    })
    .reduce((sum, dd) => sum + dd.quantity, 0);

  const todayDispensingAmount = todayDispensings.reduce((sum, d) => sum + d.totalAmount, 0);

  // Today's Reagent Consumption
  const todayReagentLogs = (db.reagentConsumptionLogs || []).filter(l => l.timestamp.startsWith(todayStr));
  const todayReagentTestsRun = todayReagentLogs.reduce((sum, l) => sum + (l.testsConsumed || 0), 0);

  // Pending Purchases (Ordered or Partially Received)
  const pendingPurchases = db.purchaseOrders.filter(
    po => po.orderStatus === 'Ordered' || po.orderStatus === 'Partially Received'
  );
  const pendingReagentPurchases = pendingPurchases.filter(
    po => po.hasReagents || (po.items && po.items.some(i => i.itemType === 'Reagent'))
  );

  // Cold Chain Status
  const coldChainLogs = db.coldChainLogs || [];
  const coldChainNormalCount = coldChainLogs.filter(l => l.status === 'Normal').length;
  const coldChainAlertCount = coldChainLogs.filter(l => l.status === 'Excursion Violation' || l.status === 'Warning').length;

  // Recent 5 entries
  const recentPurchases = db.purchaseOrders.slice(0, 5);
  const recentDispensing = db.dispensings.slice(0, 5);
  const recentReturns = db.returns.slice(0, 5);
  const recentReagentConsumptions = (db.reagentConsumptionLogs || []).slice(0, 6);
  const unreadNotifications = db.notifications.filter(n => !n.isRead).slice(0, 5);
  const recentActivity = db.auditLogs.slice(0, 8);

  // Chart data: Category distribution of stock (Medicines)
  const categoryStats = db.categories.map(cat => {
    const medIds = allMedicines.filter(m => m.categoryId === cat.id).map(m => m.id);
    const stock = medicineBatches
      .filter(b => medIds.includes(b.medicineId) && (b.status === 'Available' || b.status === 'Expiring Soon'))
      .reduce((sum, b) => sum + b.currentQuantity, 0);
    return {
      name: cat.name,
      stock,
      medicineCount: medIds.length,
    };
  }).filter(c => c.stock > 0 || c.medicineCount > 0);

  // Chart data: Lab Department distribution of Reagents
  const labDepartments = [
    'Hematology',
    'Biochemistry',
    'Microbiology',
    'Serology / Infectious Disease',
    'Blood Bank & Transfusion',
    'Histopathology / Cytology',
    'Urinalysis & Clinical Microscopy',
    'Molecular Diagnostics & PCR',
  ];

  const departmentReagentStats = labDepartments.map(dept => {
    const deptReagents = allReagents.filter(r => (r.department || 'Biochemistry') === dept);
    const deptReagentIds = deptReagents.map(r => r.id);
    
    let stockKits = 0;
    let testsAvailable = 0;

    reagentBatches
      .filter(b => deptReagentIds.includes(b.medicineId) && (b.status === 'Available' || b.status === 'Expiring Soon'))
      .forEach(b => {
        stockKits += b.currentQuantity;
        const med = deptReagents.find(r => r.id === b.medicineId);
        const tests = b.totalTestsRemaining !== undefined ? b.totalTestsRemaining : (b.currentQuantity * (b.testsPerUnit || med?.testsPerUnit || 1));
        testsAvailable += tests;
      });

    return {
      name: dept.split('/')[0].trim(),
      fullName: dept,
      stockKits,
      testsAvailable,
      reagentCount: deptReagents.length,
    };
  }).filter(d => d.stockKits > 0 || d.reagentCount > 0);

  // Stock status breakdown for pie chart
  const batchStatusBreakdown = [
    { name: 'Available', value: availableBatches, color: '#10B981' },
    { name: 'Expiring Soon', value: expiringSoonBatches, color: '#F59E0B' },
    { name: 'Expired', value: expiredBatches, color: '#EF4444' },
    { name: 'Depleted', value: db.batches.filter(b => b.status === 'Depleted').length, color: '#6B7280' },
  ];

  const reagentStatusBreakdown = [
    { name: 'Available Sealed', value: reagentBatches.filter(b => b.status === 'Available' && !b.isOpenVial).length, color: '#059669' },
    { name: 'Active Open Vials', value: openVials.length, color: '#0284C7' },
    { name: 'Expiring Soon', value: expiringReagentBatches.length, color: '#F59E0B' },
    { name: 'Expired', value: expiredReagentBatches.length, color: '#EF4444' },
  ];

  res.json({
    success: true,
    data: {
      cards: {
        totalMedicines,
        activeMedicines,
        totalReagents,
        activeReagents,
        totalReagentKits,
        totalTestsAvailable,
        reagentInventoryValue: Math.round(reagentInventoryValue * 100) / 100,
        openVialsCount: openVials.length,
        openVialsNearExpiryCount: openVialsNearExpiry.length,
        todayReagentTestsRun,
        todayReagentConsumptionCount: todayReagentLogs.length,
        totalBatches,
        availableBatches,
        lowStockCount: lowStockMedicines.length,
        lowStockReagentsCount: lowStockReagents.length,
        expiringSoonCount: expiringSoonBatches,
        expiringReagentsCount: expiringReagentBatches.length,
        expiredCount: expiredBatches,
        expiredReagentsCount: expiredReagentBatches.length,
        todayDispensingCount: todayDispensings.length,
        todayDispensingUnits,
        todayDispensingAmount: Math.round(todayDispensingAmount * 100) / 100,
        pendingPurchasesCount: pendingPurchases.length,
        pendingReagentPurchasesCount: pendingReagentPurchases.length,
        totalStockUnits,
        totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
        coldChainNormalCount,
        coldChainAlertCount,
      },
      lowStockList: lowStockMedicines.map(m => {
        const stock = medicineBatches
          .filter(b => b.medicineId === m.id && (b.status === 'Available' || b.status === 'Expiring Soon'))
          .reduce((sum, b) => sum + b.currentQuantity, 0);
        return {
          id: m.id,
          name: m.name,
          baseNumber: m.baseNumber,
          categoryName: m.categoryName,
          currentStock: stock,
          minStockLevel: m.minStockLevel,
          unit: m.unit,
          itemType: 'Medicine' as const,
        };
      }),
      lowStockReagentsList: lowStockReagents.map(r => {
        let stock = 0;
        let testsRemaining = 0;
        reagentBatches
          .filter(b => b.medicineId === r.id && (b.status === 'Available' || b.status === 'Expiring Soon'))
          .forEach(b => {
            stock += b.currentQuantity;
            testsRemaining += b.totalTestsRemaining !== undefined ? b.totalTestsRemaining : (b.currentQuantity * (b.testsPerUnit || r.testsPerUnit || 1));
          });

        return {
          id: r.id,
          name: r.name,
          baseNumber: r.baseNumber,
          department: r.department || 'Clinical Laboratory',
          currentStock: stock,
          minStockLevel: r.minStockLevel,
          unit: r.unit || 'Kits',
          testsPerUnit: r.testsPerUnit || 100,
          totalTestsRemaining: testsRemaining,
          storageCondition: r.storageCondition,
        };
      }),
      expiringBatchesList: db.batches
        .filter(b => b.status === 'Expiring Soon' && b.currentQuantity > 0)
        .map(b => {
          const med = db.medicines.find(m => m.id === b.medicineId);
          return {
            id: b.id,
            medicineName: b.medicineName,
            baseNumber: b.baseNumber,
            batchNumber: b.batchNumber,
            expiryDate: b.expiryDate,
            currentQuantity: b.currentQuantity,
            itemType: (b.itemType || med?.itemType || 'Medicine') as 'Medicine' | 'Reagent',
            department: med?.department,
            testsRemaining: b.totalTestsRemaining,
            isOpenVial: b.isOpenVial,
            openVialExpiryDate: b.openVialExpiryDate,
          };
        }),
      expiringReagentsList: expiringReagentBatches.map(b => {
        const med = allReagents.find(r => r.id === b.medicineId);
        return {
          id: b.id,
          reagentName: b.medicineName,
          baseNumber: b.baseNumber,
          batchNumber: b.batchNumber,
          department: med?.department || 'Clinical Laboratory',
          expiryDate: b.expiryDate,
          currentQuantity: b.currentQuantity,
          totalTestsRemaining: b.totalTestsRemaining !== undefined ? b.totalTestsRemaining : (b.currentQuantity * (b.testsPerUnit || med?.testsPerUnit || 100)),
          isOpenVial: b.isOpenVial,
          openVialExpiryDate: b.openVialExpiryDate,
          storageLocation: b.storageLocation,
          qcStatus: b.qcStatus,
        };
      }),
      expiredBatchesList: db.batches
        .filter(b => b.status === 'Expired' && b.currentQuantity > 0)
        .map(b => {
          const med = db.medicines.find(m => m.id === b.medicineId);
          return {
            id: b.id,
            medicineName: b.medicineName,
            baseNumber: b.baseNumber,
            batchNumber: b.batchNumber,
            expiryDate: b.expiryDate,
            currentQuantity: b.currentQuantity,
            itemType: (b.itemType || med?.itemType || 'Medicine') as 'Medicine' | 'Reagent',
          };
        }),
      recentPurchases,
      recentDispensing,
      recentReturns,
      recentReagentConsumptions,
      unreadNotifications,
      recentActivity,
      categoryStats,
      departmentReagentStats,
      batchStatusBreakdown,
      reagentStatusBreakdown,
    },
  });
});

// GET /api/dashboard/backup/export - Download full database snapshot
router.get('/backup/export', authenticateJWT, (_req: any, res) => {
  const snapshot = db.exportBackupSnapshot();
  const dateSlug = new Date().toISOString().split('T')[0];
  const filename = `smartpharmacy-backup-${dateSlug}.json`;

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(snapshot, null, 2));
});

// POST /api/dashboard/backup/restore - Restore full database from uploaded snapshot
router.post('/backup/restore', authenticateJWT, (req: any, res) => {
  try {
    const backupPayload = req.body;
    db.restoreBackupSnapshot(backupPayload);

    db.auditLogs.unshift({
      id: `aud-restore-${Date.now()}`,
      userId: req.user.id,
      userName: req.user.fullName,
      role: req.user.role,
      action: 'Update',
      table: 'database_backup',
      recordId: 'full_restore',
      description: `Database successfully restored from backup file (Exported at: ${backupPayload.exportedAt || 'Unknown'}).`,
      ipAddress: req.ip || '127.0.0.1',
      timestamp: new Date().toISOString(),
    });
    db.save();

    res.json({
      success: true,
      message: 'Clinic database successfully restored from backup snapshot.',
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message || 'Failed to restore backup.',
    });
  }
});

// POST /api/dashboard/clear-demo-data
router.post('/clear-demo-data', authenticateJWT, (_req: any, res) => {
  db.clearAllDemoData();
  res.json({
    success: true,
    message: 'All demo medicines, batches, transactions, and logs have been wiped clean.',
  });
});

// POST /api/dashboard/reset-demo-data
router.post('/reset-demo-data', authenticateJWT, (_req: any, res) => {
  db.resetToSeed();
  res.json({
    success: true,
    message: 'Demo dataset restored to initial seed state.',
  });
});

export default router;
