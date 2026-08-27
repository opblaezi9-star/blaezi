import nodemailer from 'nodemailer';
import { db, AppNotification, EmailLog, Medicine, MedicineBatch, Supplier } from '../db';

function formatMonthYear(str?: string | null): string {
  if (!str) return 'N/A';
  const s = String(str).trim();
  const m = s.match(/^(\d{4})-(\d{1,2})/);
  if (m) return `${m[2].padStart(2, '0')}/${m[1].slice(-2)}`;
  return s;
}

export interface ExpiryMonitorConfig {
  thresholdDays: number;
  adminEmails: string[];
  autoScanIntervalMs: number;
  lastRunTimestamp: string | null;
  isRunning: boolean;

  // Scope toggles
  enableMedicineAlerts: boolean;
  enableReagentAlerts: boolean;
  enableOpenVialAlerts: boolean;
  enableStockoutAlerts: boolean;

  // Real SMTP Configuration
  smtpEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  senderName: string;
  senderEmail: string;
}

// Global monitor configuration and state
export const expiryMonitorConfig: ExpiryMonitorConfig = {
  thresholdDays: 30,
  adminEmails: ['opblaezi9@gmail.com', 'admin@hospital.org'],
  autoScanIntervalMs: 60 * 1000, // Runs every 60 seconds automatically
  lastRunTimestamp: null,
  isRunning: false,

  enableMedicineAlerts: true,
  enableReagentAlerts: true,
  enableOpenVialAlerts: true,
  enableStockoutAlerts: true,

  smtpEnabled: false,
  smtpHost: 'smtp.gmail.com',
  smtpPort: 465,
  smtpSecure: true,
  smtpUser: '',
  smtpPass: '',
  senderName: 'SmartPharmacy Clinical Alerts',
  senderEmail: '',
};

// Track sent alerts so we don't spam identical emails every minute
const sentAlertRegistry = new Map<string, { lastSentDate: string; stage: string }>();

/**
 * Creates a nodemailer transporter from the current config
 */
function createTransporter() {
  if (!expiryMonitorConfig.smtpUser || !expiryMonitorConfig.smtpPass) {
    return null;
  }

  return nodemailer.createTransport({
    host: expiryMonitorConfig.smtpHost || 'smtp.gmail.com',
    port: Number(expiryMonitorConfig.smtpPort) || 465,
    secure: expiryMonitorConfig.smtpSecure ?? (Number(expiryMonitorConfig.smtpPort) === 465),
    auth: {
      user: expiryMonitorConfig.smtpUser,
      pass: expiryMonitorConfig.smtpPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * Sends an email via real SMTP if enabled and configured, or records simulation
 */
export async function dispatchEmailMessage(
  recipient: string,
  subject: string,
  body: string,
  type: 'Expiry Alert' | 'Low Stock Alert' | 'Purchase Notification' | 'System' = 'Expiry Alert'
): Promise<{ success: boolean; status: 'Delivered' | 'Pending'; error?: string }> {
  let deliveryStatus: 'Delivered' | 'Pending' = 'Delivered';
  let errorMsg: string | undefined = undefined;

  if (expiryMonitorConfig.smtpEnabled && expiryMonitorConfig.smtpUser && expiryMonitorConfig.smtpPass) {
    try {
      const transporter = createTransporter();
      if (transporter) {
        const fromAddr = expiryMonitorConfig.senderEmail || expiryMonitorConfig.smtpUser;
        const fromName = expiryMonitorConfig.senderName || 'SmartPharmacy Alerts';

        await transporter.sendMail({
          from: `"${fromName}" <${fromAddr}>`,
          to: recipient,
          subject,
          text: body,
          html: `<pre style="font-family: monospace; white-space: pre-wrap; font-size: 13px; line-height: 1.5; color: #1e293b; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">${body}</pre>`,
        });
        deliveryStatus = 'Delivered';
      }
    } catch (err: any) {
      console.error('Failed to send email via SMTP:', err.message);
      deliveryStatus = 'Pending';
      errorMsg = err.message;
    }
  }

  const emailLog: EmailLog = {
    id: `em-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    to: recipient,
    subject,
    type,
    body,
    sentAt: new Date().toISOString(),
    status: deliveryStatus,
  };

  db.emailLogs.unshift(emailLog);
  db.save();

  return {
    success: deliveryStatus === 'Delivered',
    status: deliveryStatus,
    error: errorMsg,
  };
}

/**
 * Sends a live test email to verify SMTP credentials
 */
export async function sendTestEmailAlert(toEmail?: string): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  const target = toEmail || expiryMonitorConfig.adminEmails[0] || 'opblaezi9@gmail.com';

  const testSubject = `[TEST DISPATCH] SmartPharmacy Alert System Connectivity Check`;
  const testBody = `
========================================================================================
🧪 SMARTPHARMACY AUTOMATED ALERT SYSTEM - SMTP TEST DISPATCH
========================================================================================
TIMESTAMP: ${new Date().toISOString()} (Local: ${new Date().toLocaleString()})
RECIPIENT: ${target}
DELIVERY MODE: ${expiryMonitorConfig.smtpEnabled ? 'LIVE REAL SMTP DISPATCH' : 'SIMULATION MODE (SMTP Disabled)'}

----------------------------------------------------------------------------------------
SYSTEM CONFIGURATION DETAILS:
----------------------------------------------------------------------------------------
• Outgoing Host:       ${expiryMonitorConfig.smtpHost}:${expiryMonitorConfig.smtpPort}
• SSL/TLS Encryption:  ${expiryMonitorConfig.smtpSecure ? 'Enabled (Port 465)' : 'Disabled / STARTTLS'}
• Sender Account:      ${expiryMonitorConfig.smtpUser || '(Not configured)'}
• Sender Display Name: ${expiryMonitorConfig.senderName}
• Target Threshold:    ${expiryMonitorConfig.thresholdDays} Days
• Medicine Alerts:     ${expiryMonitorConfig.enableMedicineAlerts ? 'Active' : 'Disabled'}
• Reagent Alerts:      ${expiryMonitorConfig.enableReagentAlerts ? 'Active' : 'Disabled'}
• Open-Vial Alerts:    ${expiryMonitorConfig.enableOpenVialAlerts ? 'Active' : 'Disabled'}

If you received this message in your external inbox, your SMTP credentials and Google App Password are fully verified and operational!
========================================================================================
`.trim();

  if (!expiryMonitorConfig.smtpEnabled) {
    await dispatchEmailMessage(target, testSubject, testBody, 'System');
    return {
      success: true,
      message: `Test email logged in Simulated Dev Mode for ${target}. Enable Real SMTP in settings to send to actual Gmail inboxes.`,
      details: { mode: 'Simulated', recipient: target },
    };
  }

  if (!expiryMonitorConfig.smtpUser || !expiryMonitorConfig.smtpPass) {
    return {
      success: false,
      message: 'SMTP Username or Password is missing. Please enter your Gmail address and 16-letter Google App Password.',
    };
  }

  try {
    const transporter = createTransporter();
    if (!transporter) {
      throw new Error('Could not initialize mail transporter.');
    }

    // Verify SMTP connection
    await transporter.verify();

    const result = await dispatchEmailMessage(target, testSubject, testBody, 'System');
    if (!result.success) {
      return {
        success: false,
        message: `SMTP Connection succeeded but email delivery failed: ${result.error}`,
        details: { error: result.error },
      };
    }

    return {
      success: true,
      message: `Live test email successfully dispatched via SMTP to ${target}! Check your inbox.`,
      details: { mode: 'Real SMTP', recipient: target },
    };
  } catch (err: any) {
    return {
      success: false,
      message: `SMTP Connection failed: ${err.message}. Check host, port, username, and Google App Password.`,
      details: { error: err.message },
    };
  }
}

/**
 * Builds an exhaustive, formatted clinical report detailing EVERY aspect of the medicine & batch
 */
export function buildDetailedMedicineReport(
  batch: MedicineBatch,
  medicine: Medicine | undefined,
  supplier: Supplier | undefined,
  daysLeft: number
): string {
  const isExpired = daysLeft <= 0;
  const statusLabel = isExpired
    ? 'EXPIRED LOT - IMMEDIATE QUARANTINE REQUIRED'
    : `NEAR EXPIRY - ${daysLeft} DAY(S) REMAINING`;

  const totalFinancialAtRisk = (batch.currentQuantity * (batch.purchasePrice || 0)).toFixed(2);
  const totalSellingValue = (batch.currentQuantity * (batch.sellingPrice || 0)).toFixed(2);

  return `
========================================================================================
🚨 HOSPITAL PHARMACY AUTOMATED NEAR-EXPIRY MEDICINE ALERT FOR ADMIN
========================================================================================
STATUS: ${statusLabel}
TRIGGER TIMESTAMP: ${new Date().toISOString()} (Local: ${new Date().toLocaleString()})

----------------------------------------------------------------------------------------
1. MEDICINE IDENTIFICATION & FORMULATION DETAILS:
----------------------------------------------------------------------------------------
• Medicine Brand / Trade Name:   ${medicine?.name || batch.medicineName}
• Generic Chemical Name:         ${medicine?.genericName || 'N/A'}
• Base Inventory / SKU Number:   ${medicine?.baseNumber || batch.baseNumber}
• Therapeutic Category:          ${medicine?.categoryName || 'General Pharmaceutical'}
• Unit Formulation:              ${medicine?.unit || 'Unit'} (Tablets/Capsules/Vials/Bottles)
• Product Description:           ${medicine?.description || 'N/A'}
• Stock Status / State:          ${medicine?.status || 'Active'}
• Minimum Buffer Stock Level:    ${medicine?.minStockLevel || 0} ${medicine?.unit || 'units'}

----------------------------------------------------------------------------------------
2. BATCH & EXPIRY SPECIFICS:
----------------------------------------------------------------------------------------
• Batch / Lot Number:            ${batch.batchNumber}
• Internal Batch ID:             ${batch.id}
• Manufacturing Date:            ${formatMonthYear(batch.manufacturingDate) || 'Not specified'}
• Exact Expiry Date (MM/YY):     ${formatMonthYear(batch.expiryDate)}
• Days Remaining Until Expiry:   ${daysLeft > 0 ? `${daysLeft} Day(s)` : `0 Days (EXPIRED by ${Math.abs(daysLeft)} days)`}
• Batch Lifecycle State:         ${batch.status}

----------------------------------------------------------------------------------------
3. INVENTORY QUANTITIES & FINANCIAL VALUATION:
----------------------------------------------------------------------------------------
• Current Available Quantity:    ${batch.currentQuantity} ${medicine?.unit || 'units'}
• Original Quantity Received:    ${batch.quantityReceived} ${medicine?.unit || 'units'}
• Purchase Cost Per Unit:        ₹${batch.purchasePrice.toFixed(2)}
• MRP / Selling Price Per Unit:  ₹${batch.sellingPrice.toFixed(2)}
• Total Purchase Value At Risk:  ₹${totalFinancialAtRisk}
• Total Projected Retail Value:  ₹${totalSellingValue}

----------------------------------------------------------------------------------------
4. PROCUREMENT & SUPPLIER DETAILS:
----------------------------------------------------------------------------------------
• Supplier Name:                 ${supplier?.name || batch.supplierName || 'Direct Manufacturer / Generic'}
• Supplier Contact Person:       ${supplier?.contactPerson || 'Procurement Desk'}
• Supplier Phone:                ${supplier?.phone || 'N/A'}
• Supplier Email:                ${supplier?.email || 'N/A'}
• Supplier Physical Address:     ${supplier?.address || 'N/A'}

----------------------------------------------------------------------------------------
5. RECOMMENDED CLINICAL & ADMINISTRATIVE ACTIONS:
----------------------------------------------------------------------------------------
${
  isExpired
    ? `[ACTION REQUIRED]
1. Physically remove all ${batch.currentQuantity} ${medicine?.unit || 'units'} from active pharmacy shelves immediately.
2. Transfer items to the designated Quarantined Biohazard / Disposal Storage Rack.
3. Update inventory batch status to 'Expired' in the SmartPharmacy management portal.
4. Contact supplier (${supplier?.name || 'Vendor'}) for return/credit note authorization.`
    : `[ACTION REQUIRED]
1. Prioritize this batch (${batch.batchNumber}) for immediate First-Expiry-First-Out (FEFO) dispensing in Outpatient / Inpatient wards.
2. Consider inter-departmental transfers to high-turnover clinical units.
3. Re-evaluate re-order lead times for replacement fresh batches of ${medicine?.name || batch.medicineName}.`
}

========================================================================================
Automated System Dispatch: SmartPharmacy Hospital Inventory Management System
Recipient: Hospital Administrator & Chief Pharmacist
========================================================================================
`.trim();
}

/**
 * Builds an exhaustive, formatted clinical report detailing EVERY aspect of the reagent & batch
 */
export function buildDetailedReagentReport(
  batch: MedicineBatch,
  reagent: Medicine | undefined,
  supplier: Supplier | undefined,
  daysLeft: number,
  isOpenVialAlert: boolean = false
): string {
  const isExpired = daysLeft <= 0;
  let statusLabel = '';
  if (isOpenVialAlert) {
    statusLabel = 'OPEN-VIAL ON-BOARD STABILITY EXPIRED / EXPIRING SOON';
  } else if (isExpired) {
    statusLabel = 'EXPIRED REAGENT LOT - IMMEDIATE QUARANTINE & DISPOSAL REQUIRED';
  } else {
    statusLabel = `NEAR EXPIRY REAGENT - ${daysLeft} DAY(S) SHELF-LIFE REMAINING`;
  }

  const totalFinancialAtRisk = (batch.currentQuantity * (batch.purchasePrice || 0)).toFixed(2);

  return `
========================================================================================
🧪 HOSPITAL LABORATORY AUTOMATED NEAR-EXPIRY REAGENT ALERT
========================================================================================
STATUS: ${statusLabel}
TRIGGER TIMESTAMP: ${new Date().toISOString()} (Local: ${new Date().toLocaleString()})

----------------------------------------------------------------------------------------
1. REAGENT & DIAGNOSTIC KIT SPECIFICATIONS:
----------------------------------------------------------------------------------------
• Reagent Brand / Name:          ${reagent?.name || batch.medicineName}
• Chemical / Formulation:        ${reagent?.genericName || 'Diagnostic Assay Reagent'}
• Catalog / Base SKU Number:     ${reagent?.baseNumber || batch.baseNumber}
• Laboratory Department:         ${reagent?.department || 'General Laboratory'}
• Target Storage Condition:      ${reagent?.storageCondition || '2°C - 8°C (Refrigerated)'}
• Storage Location in Lab:       ${batch.storageLocation || 'Main Lab Refrigerator A'}
• Analyzer Compatibility:        ${reagent?.analyzerCompatibility || 'All Standard Chemistry Analyzers'}
• Biohazard / Hazard Class:      ${reagent?.hazardClass || 'Non-Hazardous'}
• Reconstitution Required:       ${reagent?.requiresReconstitution ? 'YES' : 'NO (Ready-to-Use)'}

----------------------------------------------------------------------------------------
2. LOT, EXPIRATION & OPEN-VIAL STABILITY:
----------------------------------------------------------------------------------------
• Reagent Batch / Lot Number:    ${batch.batchNumber}
• Internal Lot ID:               ${batch.id}
• Factory Expiry Date (MM/YY):   ${formatMonthYear(batch.expiryDate)}
• Days Left (Factory Shelf):     ${daysLeft > 0 ? `${daysLeft} Day(s)` : `0 Days (EXPIRED by ${Math.abs(daysLeft)} days)`}
• Open-Vial Status:              ${batch.isOpenVial ? 'UNSEALED / IN-USE ON ANALYZER' : 'FACTORY SEALED'}
• Unsealed / Opened Date:        ${batch.unsealedDate || 'N/A'}
• Open-Vial Expiry Date:         ${batch.openVialExpiryDate || 'N/A'}
• Open-Vial Expired:             ${batch.isOpenVialExpired ? 'YES - DEGRADED' : 'NO'}
• Quality Control (QC) Status:   ${batch.qcStatus || 'QC Passed'} (Last QC: ${batch.lastQCDate || 'N/A'})

----------------------------------------------------------------------------------------
3. REMAINING TEST VOLUME & FINANCIAL VALUATION:
----------------------------------------------------------------------------------------
• Current Available Packs/Vials: ${batch.currentQuantity} ${reagent?.unit || 'Vials'}
• Total Diagnostic Tests Left:   ${batch.totalTestsRemaining ?? (batch.currentQuantity * (reagent?.testsPerUnit || 100))} Tests
• Purchase Cost Per Unit:        ₹${batch.purchasePrice.toFixed(2)}
• Total Financial Value At Risk: ₹${totalFinancialAtRisk}

----------------------------------------------------------------------------------------
4. PROCUREMENT & SUPPLIER DETAILS:
----------------------------------------------------------------------------------------
• Manufacturer / Supplier:       ${supplier?.name || batch.supplierName || 'Diagnostic Lab Supply'}
• Supplier Contact:              ${supplier?.contactPerson || 'Laboratory Support Desk'}
• Supplier Phone:                ${supplier?.phone || 'N/A'}
• Supplier Email:                ${supplier?.email || 'N/A'}

----------------------------------------------------------------------------------------
5. RECOMMENDED LABORATORY QUALITY & OPERATIONAL ACTIONS:
----------------------------------------------------------------------------------------
${
  isExpired || batch.isOpenVialExpired
    ? `[ACTION REQUIRED]
1. Immediately remove reagent lot (${batch.batchNumber}) from active analyzer carousel and reagent racks.
2. Discard/quarantine in accordance with Clinical Laboratory Biohazard & Chemical Disposal Protocols.
3. Load and calibrate a replacement fresh lot of ${reagent?.name || batch.medicineName} and execute QC calibrator run.
4. Mark reagent lot as 'Expired' in SmartPharmacy Reagents module.`
    : `[ACTION REQUIRED]
1. Prioritize this reagent lot (${batch.batchNumber}) for upcoming sample test runs today.
2. Verify that refrigerator temperature logs remain within ${reagent?.storageCondition || '2°C - 8°C'}.
3. Re-order fresh reagent lots from ${supplier?.name || 'Supplier'} to prevent test outages.`
}

========================================================================================
Automated System Dispatch: SmartPharmacy Laboratory & Clinical Management System
Recipient: Laboratory Supervisor, Chief Pharmacist & Hospital Administrator
========================================================================================
`.trim();
}

/**
 * Scans for near-expiry and expired medicines AND reagents, emailing full details to configured recipients.
 */
export async function runAutomatedExpiryEmailCheck(forceAll: boolean = false): Promise<{
  dispatchedCount: number;
  emailsSent: EmailLog[];
  notificationsCreated: AppNotification[];
  message: string;
}> {
  db.refreshBatchStatuses();
  const today = new Date();
  const thresholdDays = expiryMonitorConfig.thresholdDays;
  const emailsSent: EmailLog[] = [];
  const notificationsCreated: AppNotification[] = [];

  // Gather all active Admin & Pharmacist & Laboratorian emails
  const adminUsers = db.users.filter(u => u.isActive && ['Admin', 'Pharmacist', 'Laboratorian'].includes(u.role));
  const recipientList = Array.from(
    new Set([...expiryMonitorConfig.adminEmails, ...adminUsers.map(u => u.email).filter(Boolean)])
  );
  const primaryRecipient = recipientList.join(', ') || 'opblaezi9@gmail.com';

  // 1. Scan All Medicine & Reagent Batches
  for (const batch of db.batches) {
    if (batch.currentQuantity <= 0) continue;

    const isReagent = batch.itemType === 'Reagent' || (!batch.itemType && db.medicines.find(m => m.id === batch.medicineId)?.itemType === 'Reagent');

    // Check scope settings
    if (isReagent && !expiryMonitorConfig.enableReagentAlerts) continue;
    if (!isReagent && !expiryMonitorConfig.enableMedicineAlerts) continue;

    const expDate = new Date(batch.expiryDate);
    const timeDiff = expDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

    // Check open vial expiration for reagents
    let isOpenVialAlert = false;
    if (isReagent && expiryMonitorConfig.enableOpenVialAlerts && batch.isOpenVial && batch.openVialExpiryDate) {
      const openExpDate = new Date(batch.openVialExpiryDate);
      const openDaysLeft = Math.ceil((openExpDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
      if (openDaysLeft <= 3) {
        isOpenVialAlert = true;
      }
    }

    if (daysLeft <= thresholdDays || isOpenVialAlert) {
      const isExpired = daysLeft <= 0 || (isOpenVialAlert && batch.isOpenVialExpired);
      const stageKey = isExpired ? 'EXPIRED' : isOpenVialAlert ? 'OPEN_VIAL_EXP' : daysLeft <= 7 ? 'CRITICAL_7D' : 'SOON_30D';
      const cacheKey = `${batch.id}-${stageKey}`;

      // Check if we already alerted for this stage today (unless forceAll is true)
      const existingAlert = sentAlertRegistry.get(cacheKey);
      const todayStr = today.toISOString().split('T')[0];

      if (!forceAll && existingAlert && existingAlert.lastSentDate === todayStr) {
        continue; // Already dispatched today for this batch stage
      }

      const itemMeta = db.medicines.find(m => m.id === batch.medicineId);
      const supplier = db.suppliers.find(s => s.id === batch.supplierId);

      // Generate the comprehensive, detail-rich email body
      let emailBody = '';
      let subject = '';

      if (isReagent) {
        emailBody = buildDetailedReagentReport(batch, itemMeta, supplier, daysLeft, isOpenVialAlert);
        subject = isExpired
          ? `[CRITICAL REAGENT EXPIRY] ${itemMeta?.name || batch.medicineName} (Lot ${batch.batchNumber}) is EXPIRED - Lab Action Required`
          : isOpenVialAlert
          ? `[OPEN-VIAL ALERT] Reagent ${itemMeta?.name || batch.medicineName} (Lot ${batch.batchNumber}) Open-Vial Stability Expiring`
          : `[NEAR EXPIRY REAGENT] ${itemMeta?.name || batch.medicineName} (Lot ${batch.batchNumber}) Expires in ${daysLeft} Days`;
      } else {
        emailBody = buildDetailedMedicineReport(batch, itemMeta, supplier, daysLeft);
        subject = isExpired
          ? `[CRITICAL EXPIRY ALERT] ${itemMeta?.name || batch.medicineName} (Batch ${batch.batchNumber}) is EXPIRED - Full Details`
          : `[NEAR EXPIRY ALERT] ${itemMeta?.name || batch.medicineName} (Batch ${batch.batchNumber}) Expires in ${daysLeft} Days - Full Details`;
      }

      // Dispatch Email (via SMTP or Simulated)
      const dispatchResult = await dispatchEmailMessage(primaryRecipient, subject, emailBody, 'Expiry Alert');

      const emailLog: EmailLog = {
        id: `em-auto-${Date.now()}-${batch.id.slice(-4)}`,
        to: primaryRecipient,
        subject,
        type: 'Expiry Alert',
        body: emailBody,
        sentAt: new Date().toISOString(),
        status: dispatchResult.status,
      };

      emailsSent.push(emailLog);

      // Create high priority In-App System Notification
      const notif: AppNotification = {
        id: `notif-exp-auto-${Date.now()}-${batch.id.slice(-4)}`,
        title: isExpired ? (isReagent ? 'Critical: Reagent Lot Expired' : 'Critical: Medicine Expired') : (isReagent ? 'Urgent: Reagent Near Expiry' : 'Urgent: Batch Near Expiry'),
        message: `${itemMeta?.name || batch.medicineName} (${batch.baseNumber}) Lot ${batch.batchNumber} has ${batch.currentQuantity} units expiring in ${formatMonthYear(batch.expiryDate)} (${daysLeft <= 0 ? 'EXPIRED' : `${daysLeft} days left`}). Complete report emailed to ${primaryRecipient}.`,
        notificationType: 'Expiry',
        priority: isExpired ? 'Critical' : daysLeft <= 7 ? 'Critical' : 'High',
        isRead: false,
        metadata: {
          batchId: batch.id,
          medicineId: batch.medicineId,
          batchNumber: batch.batchNumber,
          expiryDate: batch.expiryDate,
          daysLeft,
          currentQuantity: batch.currentQuantity,
          emailLogId: emailLog.id,
          adminEmail: primaryRecipient,
          itemType: isReagent ? 'Reagent' : 'Medicine',
        },
        createdAt: new Date().toISOString(),
      };

      db.notifications.unshift(notif);
      notificationsCreated.push(notif);

      // Record in sent registry
      sentAlertRegistry.set(cacheKey, { lastSentDate: todayStr, stage: stageKey });
    }
  }

  if (emailsSent.length > 0 || notificationsCreated.length > 0) {
    db.save();
  }

  expiryMonitorConfig.lastRunTimestamp = new Date().toISOString();

  return {
    dispatchedCount: emailsSent.length,
    emailsSent,
    notificationsCreated,
    message:
      emailsSent.length > 0
        ? `Automatic expiry monitoring scan complete. Dispatched ${emailsSent.length} detailed alert email(s) (Medicines & Reagents) to ${primaryRecipient}.`
        : 'Automated scan complete. No new near-expiry medicines or reagents required email dispatch.',
  };
}

let intervalTimer: NodeJS.Timeout | null = null;

/**
 * Starts the automated recurring background worker
 */
export function startExpiryMonitorBackgroundService() {
  if (expiryMonitorConfig.isRunning) return;

  expiryMonitorConfig.isRunning = true;
  console.log('⏰ [SmartPharmacy] Automated Expiry Email Monitoring Worker initialized.');

  // Run initial scan on startup
  setTimeout(() => {
    runAutomatedExpiryEmailCheck(false).catch(err => {
      console.error('Error during initial automated expiry check:', err);
    });
  }, 3000);

  // Set recurring interval
  intervalTimer = setInterval(() => {
    runAutomatedExpiryEmailCheck(false).catch(err => {
      console.error('Error during scheduled automated expiry email check:', err);
    });
  }, expiryMonitorConfig.autoScanIntervalMs);
}

/**
 * Stops the automated recurring background worker if needed
 */
export function stopExpiryMonitorBackgroundService() {
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
  }
  expiryMonitorConfig.isRunning = false;
  console.log('⏰ [SmartPharmacy] Automated Expiry Email Monitoring Worker stopped.');
}

