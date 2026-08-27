import { Router } from 'express';
import { db, Supplier } from '../db';
import { authenticateJWT, requireRole, logAudit, AuthenticatedRequest } from '../auth';

const router = Router();

// GET /api/suppliers
router.get('/', authenticateJWT, (req, res) => {
  const { search, status } = req.query;

  let list = db.suppliers.map(s => {
    const pos = db.purchaseOrders.filter(po => po.supplierId === s.id);
    return {
      ...s,
      totalOrders: pos.length,
      totalSpent: pos.reduce((acc, po) => acc + po.totalAmount, 0),
    };
  });

  if (status) {
    list = list.filter(s => s.status === status);
  }

  if (search) {
    const q = (search as string).toLowerCase().trim();
    list = list.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        s.contactPerson.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q)
    );
  }

  res.json({
    success: true,
    count: list.length,
    suppliers: list,
  });
});

// POST /api/suppliers (Admin only)
router.post('/', authenticateJWT, requireRole(['Admin']), (req: AuthenticatedRequest, res) => {
  const { name, contactPerson, phone, email, address } = req.body;

  if (!name || !contactPerson || !phone) {
    return res.status(400).json({
      success: false,
      message: 'Supplier name, contact person, and phone are required.',
    });
  }

  const newSupplier: Supplier = {
    id: `sup-${Date.now()}`,
    name: name.trim(),
    contactPerson: contactPerson.trim(),
    phone: phone.trim(),
    email: email ? email.trim() : '',
    address: address ? address.trim() : '',
    status: 'Active',
    createdAt: new Date().toISOString(),
  };

  db.suppliers.unshift(newSupplier);
  db.save();

  logAudit(req, 'Create', 'suppliers', newSupplier.id, `Created supplier ${newSupplier.name}`);

  res.status(201).json({
    success: true,
    message: 'Supplier added successfully.',
    supplier: newSupplier,
  });
});

// PUT /api/suppliers/:id (Admin only)
router.put('/:id', authenticateJWT, requireRole(['Admin']), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { name, contactPerson, phone, email, address, status } = req.body;

  const supplier = db.suppliers.find(s => s.id === id);
  if (!supplier) {
    return res.status(404).json({
      success: false,
      message: 'Supplier not found.',
    });
  }

  if (name) supplier.name = name.trim();
  if (contactPerson) supplier.contactPerson = contactPerson.trim();
  if (phone) supplier.phone = phone.trim();
  if (email !== undefined) supplier.email = email.trim();
  if (address !== undefined) supplier.address = address.trim();
  if (status && (status === 'Active' || status === 'Inactive')) supplier.status = status;

  db.save();
  logAudit(req, 'Update', 'suppliers', supplier.id, `Updated supplier ${supplier.name}`);

  res.json({
    success: true,
    message: 'Supplier updated successfully.',
    supplier,
  });
});

// DELETE /api/suppliers/:id (Admin only)
router.delete('/:id', authenticateJWT, requireRole(['Admin']), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const index = db.suppliers.findIndex(s => s.id === id);
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: 'Supplier not found.',
    });
  }

  const supplier = db.suppliers[index];
  db.suppliers.splice(index, 1);
  db.save();

  logAudit(req, 'Delete', 'suppliers', supplier.id, `Deleted supplier ${supplier.name}`);

  res.json({
    success: true,
    message: `Supplier "${supplier.name}" deleted successfully.`,
  });
});

export default router;
