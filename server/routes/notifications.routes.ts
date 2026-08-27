import { Router } from 'express';
import { db, AppNotification, EmailLog } from '../db';
import { authenticateJWT, logAudit, AuthenticatedRequest } from '../auth';
import {
  expiryMonitorConfig,
  runAutomatedExpiryEmailCheck,
  sendTestEmailAlert,
} from '../services/expiryAlertService';

function formatMonthYear(str?: string | null): string {
  if (!str) return 'N/A';
  const s = String(str).trim();
  const m = s.match(/^(\d{4})-(\d{1,2})/);
  if (m) return `${m[2].padStart(2, '0')}/${m[1].slice(-2)}`;
  return s;
}

const router = Router();

// GET /api/notifications
router.get('/', authenticateJWT, (req, res) => {
  const { isRead, type, priority } = req.query;

  let list = [...db.notifications];

  if (isRead !== undefined) {
    const flag = isRead === 'true';
    list = list.filter(n => n.isRead === flag);
  }

  if (type) {
    list = list.filter(n => n.notificationType === type);
  }

  if (priority) {
    list = list.filter(n => n.priority === priority);
  }

  const unreadCount = db.notifications.filter(n => !n.isRead).length;

  res.json({
    success: true,
    count: list.length,
    unreadCount,
    notifications: list,
  });
});

// POST /api/notifications/:id/read
router.post('/:id/read', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const notif = db.notifications.find(n => n.id === id);

  if (!notif) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found.',
    });
  }

  notif.isRead = true;
  db.save();

  res.json({
    success: true,
    notification: notif,
  });
});

// POST /api/notifications/read-all
router.post('/read-all', authenticateJWT, (_req, res) => {
  db.notifications.forEach(n => {
    n.isRead = true;
  });
  db.save();

  res.json({
    success: true,
    message: 'All notifications marked as read.',
  });
});

// POST /api/notifications/scan-alerts (Scans for low stock, expiring batches, expired batches, and generates alerts)
router.post('/scan-alerts', authenticateJWT, (req: AuthenticatedRequest, res) => {
  db.refreshBatchStatuses();
  const createdNotifs: AppNotification[] = [];
  const today = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(today.getDate() + 30);

  // 1. Scan low stock
  for (const med of db.medicines) {
    const totalStock = db.batches
      .filter(b => b.medicineId === med.id && (b.status === 'Available' || b.status === 'Expiring Soon'))
      .reduce((sum, b) => sum + b.currentQuantity, 0);

    if (totalStock <= med.minStockLevel) {
      const existing = db.notifications.find(
        n => !n.isRead && n.notificationType === 'Low Stock' && n.metadata?.medicineId === med.id
      );
      if (!existing) {
        const notif: AppNotification = {
          id: `notif-scan-low-${Date.now()}-${med.id}`,
          title: 'Low Stock Alert',
          message: `${med.name} (${med.baseNumber}) has only ${totalStock} ${med.unit}(s) in stock (Min Level: ${med.minStockLevel}). Reorder recommended.`,
          notificationType: 'Low Stock',
          priority: totalStock === 0 ? 'Critical' : 'High',
          isRead: false,
          metadata: { medicineId: med.id, baseNumber: med.baseNumber, currentStock: totalStock },
          createdAt: new Date().toISOString(),
        };
        db.notifications.unshift(notif);
        createdNotifs.push(notif);
      }
    }
  }

  // 2. Scan expiring soon & expired batches
  for (const batch of db.batches) {
    const expDate = new Date(batch.expiryDate);

    if (batch.currentQuantity > 0) {
      if (expDate <= today) {
        const existing = db.notifications.find(
          n => !n.isRead && n.notificationType === 'Expiry' && n.metadata?.batchId === batch.id && n.priority === 'Critical'
        );
        if (!existing) {
          const notif: AppNotification = {
            id: `notif-scan-exp-${Date.now()}-${batch.id}`,
            title: 'Batch Expired Alert',
            message: `Batch ${batch.batchNumber} of ${batch.medicineName} (Base: ${batch.baseNumber}) expired in ${formatMonthYear(batch.expiryDate)}. Remaining stock of ${batch.currentQuantity} units must be quarantined.`,
            notificationType: 'Expiry',
            priority: 'Critical',
            isRead: false,
            metadata: { batchId: batch.id, batchNumber: batch.batchNumber, expiryDate: batch.expiryDate },
            createdAt: new Date().toISOString(),
          };
          db.notifications.unshift(notif);
          createdNotifs.push(notif);
        }
      } else if (expDate <= thirtyDaysFromNow) {
        const daysLeft = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
        const existing = db.notifications.find(
          n => !n.isRead && n.notificationType === 'Expiry' && n.metadata?.batchId === batch.id
        );
        if (!existing) {
          const notif: AppNotification = {
            id: `notif-scan-soon-${Date.now()}-${batch.id}`,
            title: 'Batch Expiring Soon',
            message: `Batch ${batch.batchNumber} of ${batch.medicineName} expires in ${formatMonthYear(batch.expiryDate)} (${daysLeft} days remaining). Current stock: ${batch.currentQuantity}.`,
            notificationType: 'Expiry',
            priority: 'High',
            isRead: false,
            metadata: { batchId: batch.id, batchNumber: batch.batchNumber, expiryDate: batch.expiryDate, daysLeft },
            createdAt: new Date().toISOString(),
          };
          db.notifications.unshift(notif);
          createdNotifs.push(notif);
        }
      }
    }
  }

  db.save();

  res.json({
    success: true,
    message: `System scan complete. Generated ${createdNotifs.length} new alert(s).`,
    newAlertsCount: createdNotifs.length,
    alerts: createdNotifs,
  });
});

// GET /api/notifications/email-logs (View email notification dispatch history)
router.get('/email-logs', authenticateJWT, (req, res) => {
  const { search, type, status } = req.query;
  let list = [...db.emailLogs];

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    list = list.filter(
      l =>
        l.to.toLowerCase().includes(q) ||
        l.subject.toLowerCase().includes(q) ||
        l.body.toLowerCase().includes(q)
    );
  }

  if (type && typeof type === 'string' && type !== 'all') {
    list = list.filter(l => l.type === type);
  }

  if (status && typeof status === 'string' && status !== 'all') {
    list = list.filter(l => l.status === status);
  }

  res.json({
    success: true,
    count: list.length,
    emailLogs: list,
  });
});

// DELETE /api/notifications/email-logs (Clear email logs)
router.delete('/email-logs', authenticateJWT, (req: AuthenticatedRequest, res) => {
  db.emailLogs = [];
  db.save();
  logAudit(req, 'Delete', 'system_logs', 'email_logs', 'Cleared all email notification logs.');
  res.json({
    success: true,
    message: 'Email logs cleared successfully.',
  });
});

// GET /api/notifications/expiry-monitor/config
router.get('/expiry-monitor/config', authenticateJWT, (_req, res) => {
  res.json({
    success: true,
    config: expiryMonitorConfig,
  });
});

// PUT /api/notifications/expiry-monitor/config
router.put('/expiry-monitor/config', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const {
    thresholdDays,
    adminEmails,
    enableMedicineAlerts,
    enableReagentAlerts,
    enableOpenVialAlerts,
    enableStockoutAlerts,
    smtpEnabled,
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpUser,
    smtpPass,
    senderName,
    senderEmail,
  } = req.body;

  if (thresholdDays !== undefined) {
    expiryMonitorConfig.thresholdDays = Math.max(1, Number(thresholdDays));
  }
  if (Array.isArray(adminEmails) && adminEmails.length > 0) {
    expiryMonitorConfig.adminEmails = adminEmails.filter(e => typeof e === 'string' && e.trim());
  }
  if (enableMedicineAlerts !== undefined) expiryMonitorConfig.enableMedicineAlerts = Boolean(enableMedicineAlerts);
  if (enableReagentAlerts !== undefined) expiryMonitorConfig.enableReagentAlerts = Boolean(enableReagentAlerts);
  if (enableOpenVialAlerts !== undefined) expiryMonitorConfig.enableOpenVialAlerts = Boolean(enableOpenVialAlerts);
  if (enableStockoutAlerts !== undefined) expiryMonitorConfig.enableStockoutAlerts = Boolean(enableStockoutAlerts);

  if (smtpEnabled !== undefined) expiryMonitorConfig.smtpEnabled = Boolean(smtpEnabled);
  if (smtpHost !== undefined) expiryMonitorConfig.smtpHost = String(smtpHost).trim();
  if (smtpPort !== undefined) expiryMonitorConfig.smtpPort = Number(smtpPort) || 465;
  if (smtpSecure !== undefined) expiryMonitorConfig.smtpSecure = Boolean(smtpSecure);
  if (smtpUser !== undefined) expiryMonitorConfig.smtpUser = String(smtpUser).trim();
  if (smtpPass !== undefined) expiryMonitorConfig.smtpPass = String(smtpPass).trim();
  if (senderName !== undefined) expiryMonitorConfig.senderName = String(senderName).trim();
  if (senderEmail !== undefined) expiryMonitorConfig.senderEmail = String(senderEmail).trim();

  logAudit(
    req,
    'Update',
    'system_settings',
    'expiry_monitor_config',
    `Updated automated expiry email alert & SMTP settings: ${expiryMonitorConfig.thresholdDays} days threshold, SMTP: ${expiryMonitorConfig.smtpEnabled ? 'Enabled' : 'Disabled'}, recipients: ${expiryMonitorConfig.adminEmails.join(', ')}`
  );

  res.json({
    success: true,
    message: 'Automated expiry alert and SMTP email settings saved successfully.',
    config: expiryMonitorConfig,
  });
});

// POST /api/notifications/expiry-monitor/test-email
router.post('/expiry-monitor/test-email', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const { toEmail } = req.body;
    const result = await sendTestEmailAlert(toEmail);
    logAudit(
      req,
      'System',
      'email_notifications',
      'test-email',
      `Sent test email alert to ${toEmail || expiryMonitorConfig.adminEmails[0]}: ${result.message}`
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to dispatch test email.',
    });
  }
});

// POST /api/notifications/expiry-monitor/trigger-scan
router.post('/expiry-monitor/trigger-scan', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await runAutomatedExpiryEmailCheck(true);
    logAudit(
      req,
      'System',
      'email_notifications',
      'auto-expiry-scan',
      `Manual trigger of automated expiry email check: ${result.dispatchedCount} alert email(s) dispatched.`
    );
    res.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to trigger automated expiry email scan.',
    });
  }
});

// POST /api/notifications/send-email-alerts (Dispatches email alert batch for expiring / expired batches)
router.post('/send-email-alerts', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const { recipientEmail } = req.body;
    if (recipientEmail && typeof recipientEmail === 'string') {
      const emailArr = recipientEmail.split(',').map(s => s.trim()).filter(Boolean);
      if (emailArr.length > 0) {
        expiryMonitorConfig.adminEmails = emailArr;
      }
    }
    const result = await runAutomatedExpiryEmailCheck(true);
    res.json({
      success: true,
      message: result.message,
      dispatchedCount: result.dispatchedCount,
      emailsSent: result.emailsSent,
    });
  } catch (e: any) {
    res.status(500).json({
      success: false,
      message: e.message || 'Failed to send automated email alerts.',
    });
  }
});

export default router;

