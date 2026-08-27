import { Router } from 'express';
import { db, User } from '../db';
import { authenticateJWT, requireRole, hashPassword, logAudit, AuthenticatedRequest } from '../auth';

const router = Router();

// GET /api/users (All authenticated staff can view user directory)
router.get('/', authenticateJWT, (_req, res) => {
  const safeUsers = db.users.map(({ passwordHash, ...u }) => u);
  res.json({
    success: true,
    count: safeUsers.length,
    users: safeUsers,
  });
});

// POST /api/users (Admin only)
router.post('/', authenticateJWT, requireRole(['Admin']), (req: AuthenticatedRequest, res) => {
  const { username, password, fullName, email, role, phone } = req.body;

  if (!username || !password || !fullName || !role) {
    return res.status(400).json({
      success: false,
      message: 'Username, password, full name, and role are required.',
    });
  }

  const existing = db.users.find(
    u => u.username.toLowerCase() === username.trim().toLowerCase()
  );

  if (existing) {
    return res.status(400).json({
      success: false,
      message: `User with username "${username}" already exists.`,
    });
  }

  const validRoles = ['Admin', 'Pharmacist', 'Doctor'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Role must be one of: Admin, Pharmacist, Doctor.',
    });
  }

  const newUser: User = {
    id: `usr-${Date.now()}`,
    username: username.trim().toLowerCase(),
    passwordHash: hashPassword(password),
    fullName: fullName.trim(),
    email: email ? email.trim() : `${username}@hospital.org`,
    role,
    phone: phone ? phone.trim() : '+1 (555) 000-0000',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  db.save();

  logAudit(req, 'Create', 'users', newUser.id, `Admin created user account ${newUser.username} (${newUser.role})`);

  const { passwordHash, ...safeUser } = newUser;

  res.status(201).json({
    success: true,
    message: 'User created successfully.',
    user: safeUser,
  });
});

// PUT /api/users/:id (Admin only)
router.put('/:id', authenticateJWT, requireRole(['Admin']), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { fullName, email, role, phone, isActive, password } = req.body;

  const user = db.users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found.',
    });
  }

  if (fullName) user.fullName = fullName.trim();
  if (email !== undefined) user.email = email.trim();
  if (phone !== undefined) user.phone = phone.trim();
  if (role && ['Admin', 'Pharmacist', 'Doctor'].includes(role)) user.role = role;
  if (isActive !== undefined) user.isActive = Boolean(isActive);
  if (password && password.trim().length > 0) {
    user.passwordHash = hashPassword(password);
  }
  user.updatedAt = new Date().toISOString();

  db.save();

  logAudit(
    req,
    'Update',
    'users',
    user.id,
    `Admin updated user ${user.username} (Active: ${user.isActive}, Role: ${user.role})`
  );

  const { passwordHash, ...safeUser } = user;

  res.json({
    success: true,
    message: 'User updated successfully.',
    user: safeUser,
  });
});

// DELETE /api/users/:id (Admin only)
router.delete('/:id', authenticateJWT, requireRole(['Admin']), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const currentUserId = req.user?.id;

  if (id === currentUserId) {
    return res.status(400).json({
      success: false,
      message: 'You cannot delete your own user account while logged in.',
    });
  }

  const index = db.users.findIndex(u => u.id === id || u.username === id);
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: 'User account not found.',
    });
  }

  const user = db.users[index];
  db.users.splice(index, 1);
  db.save();

  logAudit(req, 'Delete', 'users', user.id, `Admin deleted user account ${user.username} (${user.role})`);

  res.json({
    success: true,
    message: `User account "${user.username}" deleted successfully.`,
  });
});

// GET /api/users/roles
router.get('/roles', authenticateJWT, (_req, res) => {
  const roles = [
    {
      role: 'Admin',
      name: '👑 Administrator',
      description: 'Highest privileges. Full access to manage users, medicines, categories, suppliers, batches, inventory, purchase orders, returns, notifications, reports, and audit logs.',
      permissions: ['Manage Users', 'Manage Medicines & Categories', 'Manage Suppliers', 'Full Purchase Order & Receiving', 'Dispense & Multi-batch FEFO', 'Manage Batches & Stock Adjustments', 'Audit Trail', 'Full Reports & Email Dispatch'],
    },
    {
      role: 'Pharmacist',
      name: '💊 Pharmacist / Nurse',
      description: 'Operational pharmacy access. Manage medicine catalog, view inventory, perform multi-batch dispensing, receive purchase orders, process returns, view stock movements, notifications, and operational reports.',
      permissions: ['Search & View Medicines', 'View & Adjust Inventory', 'Dispense Medicines (Multi-Batch FEFO)', 'Create & Receive Purchases', 'Process Patient & Supplier Returns', 'View Stock Movements', 'In-App & Email Expiry Alerts', 'Operational Reports'],
    },
    {
      role: 'Doctor',
      name: '👨⚕️ Doctor / Physician',
      description: 'Clinical practice access. Prescribe medications to patients, search medicine database, view patient dispensing histories. Restricted from administrative purchase orders, receiving, supplier management, and user controls.',
      permissions: ['Patient Management', 'Clinical Prescribing', 'Medicine & Dosage Reference', 'Patient Dispensing History', 'Restricted from POs/Stock/Suppliers'],
    },
  ];

  res.json({
    success: true,
    roles,
  });
});

export default router;
