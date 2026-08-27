import { Router } from 'express';
import { db, Medicine, Category } from '../db';
import { authenticateJWT, requireRole, logAudit, AuthenticatedRequest } from '../auth';

const router = Router();

// ==================== CATEGORIES ====================

// GET /api/categories
router.get('/categories', authenticateJWT, (_req, res) => {
  res.json({
    success: true,
    categories: db.categories,
  });
});

// POST /api/categories (Admin only)
router.post('/categories', authenticateJWT, requireRole(['Admin']), (req: AuthenticatedRequest, res) => {
  const { name, code, description } = req.body;

  if (!name || !code) {
    return res.status(400).json({
      success: false,
      message: 'Category name and code are required.',
    });
  }

  const existing = db.categories.find(
    c => c.code.toLowerCase() === code.trim().toLowerCase() || c.name.toLowerCase() === name.trim().toLowerCase()
  );

  if (existing) {
    return res.status(400).json({
      success: false,
      message: `Category with code "${code}" or name "${name}" already exists.`,
    });
  }

  const newCategory: Category = {
    id: `cat-${Date.now()}`,
    name: name.trim(),
    code: code.trim().toUpperCase(),
    description: description || '',
    status: 'Active',
    createdAt: new Date().toISOString(),
  };

  db.categories.push(newCategory);
  db.save();

  logAudit(req, 'Create', 'categories', newCategory.id, `Created new category: ${newCategory.name} (${newCategory.code})`);

  res.status(201).json({
    success: true,
    message: 'Category created successfully.',
    category: newCategory,
  });
});

// PUT /api/categories/:id (Admin only)
router.put('/categories/:id', authenticateJWT, requireRole(['Admin']), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { name, code, description, status } = req.body;

  const category = db.categories.find(c => c.id === id);
  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found.',
    });
  }

  if (name) category.name = name.trim();
  if (code) category.code = code.trim().toUpperCase();
  if (description !== undefined) category.description = description;
  if (status && (status === 'Active' || status === 'Inactive')) category.status = status;

  db.save();
  logAudit(req, 'Update', 'categories', category.id, `Updated category ${category.name}`);

  res.json({
    success: true,
    message: 'Category updated successfully.',
    category,
  });
});

// DELETE /api/categories/:id (Admin only)
router.delete('/categories/:id', authenticateJWT, requireRole(['Admin']), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const index = db.categories.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: 'Category not found.',
    });
  }

  const category = db.categories[index];
  const attachedMedicines = db.medicines.filter(m => m.categoryId === id);
  if (attachedMedicines.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete category "${category.name}" because it contains ${attachedMedicines.length} medicine(s) / reagent(s). Please remove or reassign them first.`,
    });
  }

  db.categories.splice(index, 1);
  db.save();

  logAudit(req, 'Delete', 'categories', category.id, `Deleted category: ${category.name} (${category.code})`);

  res.json({
    success: true,
    message: `Category "${category.name}" deleted successfully.`,
  });
});

// ==================== MEDICINES ====================

// GET /api/medicines
router.get('/medicines', authenticateJWT, (req, res) => {
  const { search, categoryId, status, lowStockOnly } = req.query;

  let list = db.medicines.map(med => {
    // calculate total stock from non-depleted batches
    const medBatches = db.batches.filter(b => b.medicineId === med.id);
    const availableBatches = medBatches.filter(b => b.status === 'Available' || b.status === 'Expiring Soon');
    const totalStock = availableBatches.reduce((sum, b) => sum + b.currentQuantity, 0);
    const totalBatches = medBatches.length;
    const isLowStock = totalStock <= med.minStockLevel;

    // FEFO: Sort active batches by earliest expiry to find the current active selling price / unit price
    const fefoBatches = availableBatches
      .filter(b => b.currentQuantity > 0)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    
    const activeBatch = fefoBatches[0] || medBatches[0];
    const unitPrice = activeBatch ? activeBatch.sellingPrice : 0;
    const sellingPrice = unitPrice;
    const purchasePrice = activeBatch ? activeBatch.purchasePrice : 0;

    return {
      ...med,
      totalStock,
      totalBatches,
      isLowStock,
      unitPrice,
      sellingPrice,
      purchasePrice,
      activeBatchNumber: activeBatch?.batchNumber,
      activeBatchExpiry: activeBatch?.expiryDate,
      batches: medBatches,
    };
  });

  if (search) {
    const q = (search as string).toLowerCase().trim();
    list = list.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.genericName.toLowerCase().includes(q) ||
      m.baseNumber.toLowerCase().includes(q) ||
      m.categoryName.toLowerCase().includes(q) ||
      m.batches.some(b => b.batchNumber.toLowerCase().includes(q))
    );
  }

  if (categoryId) {
    list = list.filter(m => m.categoryId === categoryId);
  }

  if (status) {
    list = list.filter(m => m.status === status);
  }

  if (lowStockOnly === 'true') {
    list = list.filter(m => m.isLowStock);
  }

  res.json({
    success: true,
    count: list.length,
    medicines: list,
  });
});

// GET /api/medicines/:id
router.get('/medicines/:id', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const med = db.medicines.find(m => m.id === id);

  if (!med) {
    return res.status(404).json({
      success: false,
      message: 'Medicine not found.',
    });
  }

  const batches = db.batches.filter(b => b.medicineId === med.id);
  const availableBatches = batches.filter(b => b.status === 'Available' || b.status === 'Expiring Soon');
  const totalStock = availableBatches.reduce((sum, b) => sum + b.currentQuantity, 0);

  const fefoBatches = availableBatches
    .filter(b => b.currentQuantity > 0)
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  const activeBatch = fefoBatches[0] || batches[0];
  const unitPrice = activeBatch ? activeBatch.sellingPrice : 0;

  res.json({
    success: true,
    medicine: {
      ...med,
      totalStock,
      unitPrice,
      sellingPrice: unitPrice,
      purchasePrice: activeBatch ? activeBatch.purchasePrice : 0,
      batches,
    },
  });
});

// POST /api/medicines (Admin only)
router.post('/medicines', authenticateJWT, requireRole(['Admin']), (req: AuthenticatedRequest, res) => {
  const { name, genericName, categoryId, baseNumber, description, unit, minStockLevel } = req.body;

  if (!name || !categoryId || !baseNumber) {
    return res.status(400).json({
      success: false,
      message: 'Medicine Name, Category, and Base Number are required fields.',
    });
  }

  const existing = db.medicines.find(
    m => m.baseNumber.toLowerCase() === baseNumber.trim().toLowerCase()
  );

  if (existing) {
    return res.status(400).json({
      success: false,
      message: `Medicine with Base Number "${baseNumber}" already exists (${existing.name}).`,
    });
  }

  const category = db.categories.find(c => c.id === categoryId);
  if (!category) {
    return res.status(400).json({
      success: false,
      message: 'Invalid Category selected.',
    });
  }

  const newMed: Medicine = {
    id: `med-${Date.now()}`,
    name: name.trim(),
    genericName: genericName ? genericName.trim() : name.trim(),
    categoryId: category.id,
    categoryName: category.name,
    baseNumber: baseNumber.trim().toUpperCase(),
    description: description || '',
    unit: unit || 'Tablet',
    minStockLevel: Number(minStockLevel) >= 0 ? Number(minStockLevel) : 20,
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.medicines.unshift(newMed);
  db.save();

  logAudit(
    req,
    'Create',
    'medicines',
    newMed.id,
    `Added new medicine "${newMed.name}" with Base Number ${newMed.baseNumber}`
  );

  res.status(201).json({
    success: true,
    message: 'Medicine added successfully.',
    medicine: newMed,
  });
});

// PUT /api/medicines/:id (Admin only)
router.put('/medicines/:id', authenticateJWT, requireRole(['Admin']), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { name, genericName, categoryId, baseNumber, description, unit, minStockLevel, status } = req.body;

  const med = db.medicines.find(m => m.id === id);
  if (!med) {
    return res.status(404).json({
      success: false,
      message: 'Medicine not found.',
    });
  }

  if (baseNumber && baseNumber.trim().toUpperCase() !== med.baseNumber) {
    const duplicate = db.medicines.find(
      m => m.id !== id && m.baseNumber.toLowerCase() === baseNumber.trim().toLowerCase()
    );
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: `Another medicine already uses Base Number "${baseNumber}".`,
      });
    }
    med.baseNumber = baseNumber.trim().toUpperCase();
  }

  if (name) med.name = name.trim();
  if (genericName) med.genericName = genericName.trim();
  if (categoryId) {
    const cat = db.categories.find(c => c.id === categoryId);
    if (cat) {
      med.categoryId = cat.id;
      med.categoryName = cat.name;
    }
  }
  if (description !== undefined) med.description = description;
  if (unit) med.unit = unit;
  if (minStockLevel !== undefined && Number(minStockLevel) >= 0) med.minStockLevel = Number(minStockLevel);
  if (status && (status === 'Active' || status === 'Inactive')) med.status = status;
  med.updatedAt = new Date().toISOString();

  db.save();
  logAudit(req, 'Update', 'medicines', med.id, `Updated medicine details for ${med.name}`);

  res.json({
    success: true,
    message: 'Medicine updated successfully.',
    medicine: med,
  });
});

// DELETE /api/medicines/:id (Admin & Pharmacist)
router.delete('/medicines/:id', authenticateJWT, requireRole(['Admin', 'Pharmacist']), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const index = db.medicines.findIndex(m => m.id === id);
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: 'Medicine not found.',
    });
  }

  const med = db.medicines[index];
  
  // Remove medicine and its associated batches if any
  db.medicines.splice(index, 1);
  const remainingBatches = db.batches.filter(b => b.medicineId !== id);
  db.batches = remainingBatches;
  db.save();

  logAudit(req, 'Delete', 'medicines', med.id, `Deleted medicine "${med.name}" (${med.baseNumber})`);

  res.json({
    success: true,
    message: `Medicine "${med.name}" deleted successfully.`,
  });
});

export default router;
