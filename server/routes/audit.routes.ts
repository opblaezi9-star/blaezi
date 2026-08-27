import { Router } from 'express';
import { db } from '../db';
import { authenticateJWT, requireRole } from '../auth';

const router = Router();

// GET /api/audit (Admin & Pharmacist can view audit trails)
router.get('/', authenticateJWT, requireRole(['Admin', 'Pharmacist']), (req, res) => {
  const { action, user, table, search, limit } = req.query;

  let list = [...db.auditLogs];

  if (action) {
    list = list.filter(a => a.action === action);
  }

  if (user) {
    list = list.filter(a => a.userId === user || a.userName.toLowerCase().includes((user as string).toLowerCase()));
  }

  if (table) {
    list = list.filter(a => a.table === table);
  }

  if (search) {
    const q = (search as string).toLowerCase().trim();
    list = list.filter(
      a =>
        a.description.toLowerCase().includes(q) ||
        a.userName.toLowerCase().includes(q) ||
        a.table.toLowerCase().includes(q) ||
        a.recordId.toLowerCase().includes(q) ||
        a.ipAddress.toLowerCase().includes(q)
    );
  }

  const max = limit ? parseInt(limit as string, 10) : 200;
  const sliced = list.slice(0, max);

  res.json({
    success: true,
    total: list.length,
    count: sliced.length,
    auditLogs: sliced,
  });
});

// DELETE /api/audit (Admin can clear audit logs)
router.delete('/', authenticateJWT, requireRole(['Admin']), (req: any, res) => {
  const user = req.user;
  const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
  
  // Clear logs and record this purge action as the fresh first entry
  const clearEntry = {
    id: `aud-purge-${Date.now()}`,
    userId: user?.id || 'usr-admin-01',
    userName: user?.fullName || user?.username || 'Hospital Administrator',
    role: user?.role || 'Admin',
    action: 'Delete' as const,
    table: 'audit_logs',
    recordId: 'audit_purge',
    description: `Audit trail cleared and purged by ${user?.fullName || user?.username || 'Administrator'} (${user?.role || 'Admin'}).`,
    ipAddress: ip,
    timestamp: new Date().toISOString(),
  };

  db.auditLogs = [clearEntry];
  db.save();

  res.json({
    success: true,
    message: 'Audit logs cleared successfully.',
    auditLogs: db.auditLogs,
  });
});

export default router;

