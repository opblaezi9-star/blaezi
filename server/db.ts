import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  fullName: string;
  email: string;
  role: 'Admin' | 'Pharmacist' | 'Doctor' | 'Nurse' | 'Laboratorian';
  phone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  code: string;
  description: string;
  status: 'Active' | 'Inactive';
  type?: 'Medicine' | 'Reagent';
  createdAt: string;
}

export interface Medicine {
  id: string;
  name: string;
  genericName: string;
  categoryId: string;
  categoryName: string;
  baseNumber: string;
  description: string;
  unit: string; // e.g. Tablet, Capsule, Bottle, Vial, Box, Kit
  minStockLevel: number;
  status: 'Active' | 'Inactive';
  itemType?: 'Medicine' | 'Reagent';
  
  // Reagent Specifics
  department?: 'Biochemistry' | 'Hematology' | 'Microbiology' | 'Clinical Pathology' | 'Blood Bank' | 'Immunology / Serology' | 'Molecular Diagnostics' | 'Urinalysis' | 'General Laboratory';
  storageCondition?: '2°C - 8°C (Refrigerated)' | '-20°C (Deep Freezer)' | '15°C - 25°C (Room Temp)' | '2°C - 30°C (Cool & Dry)';
  targetTemperature?: string;
  analyzerCompatibility?: string;
  testsPerUnit?: number;
  openVialShelfLifeDays?: number;
  hazardClass?: 'Non-Hazardous' | 'Corrosive' | 'Biohazard' | 'Flammable' | 'Toxic';
  qcFrequency?: 'Daily Calibrator' | 'Per Batch Run' | 'Weekly' | 'Ready-to-Use';
  requiresReconstitution?: boolean;

  // Medicine Specifics
  isControlled?: boolean;
  controlledSchedule?: string; // 'Schedule II - Narcotic' | 'Schedule IV - Sedative' | 'High Alert'
  allergyTags?: string[]; // e.g. ['Penicillin', 'Beta-Lactam', 'Sulfa', 'NSAID', 'Cephalosporin', 'Opioid', 'Aspirin']
  createdAt: string;
  updatedAt: string;
}

export interface MedicineBatch {
  id: string;
  medicineId: string;
  medicineName: string;
  baseNumber: string;
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  quantityReceived: number;
  currentQuantity: number;
  purchasePrice: number;
  sellingPrice: number;
  supplierId?: string;
  supplierName?: string;
  status: 'Available' | 'Expiring Soon' | 'Expired' | 'Depleted';
  itemType?: 'Medicine' | 'Reagent';

  // Reagent Batch Specifics
  testsPerUnit?: number;
  totalTestsRemaining?: number;
  storageLocation?: string; // e.g. "Main Lab Refrigerator A (2-8°C) Shelf 2"
  unsealedDate?: string;
  openVialExpiryDate?: string;
  isOpenVial?: boolean;
  isOpenVialExpired?: boolean;
  qcStatus?: 'QC Passed' | 'Pending QC' | 'Failed QC' | 'Calibrated' | 'Not Required';
  lastQCDate?: string;
  qcNotes?: string;

  createdAt: string;
}

export interface ReagentConsumptionLog {
  id: string;
  reagentId: string;
  reagentName: string;
  batchId: string;
  batchNumber: string;
  department: string;
  testName: string;
  testsConsumed: number;
  unitsDeducted: number;
  patientId?: string;
  patientName?: string;
  prescribedByDoctor?: string;
  performedByUserId: string;
  performedByUserName: string;
  analyzerUsed?: string;
  qcChecked: boolean;
  remarks?: string;
  timestamp: string;
}

export interface ColdChainLog {
  id: string;
  storageUnit: string;
  recordedTemperature: number;
  minThreshold: number;
  maxThreshold: number;
  status: 'Normal' | 'Warning' | 'Excursion Violation';
  recordedBy: string;
  timestamp: string;
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export interface Patient {
  id: string;
  patientId: string; // e.g. PAT-2026-001
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  contact: string;
  address: string;
  medicalRecordNumber: string;
  allergies?: string;
  bloodGroup?: string;
  createdAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  medicineId: string;
  medicineName: string;
  baseNumber: string;
  orderedQuantity: number;
  receivedQuantity: number;
  purchasePrice: number;
  sellingPrice: number;
  subtotal: number;
  batchNumber?: string;
  expiryDate?: string;
  manufacturingDate?: string;
  itemType?: 'Medicine' | 'Reagent';
  categoryName?: string;
  department?: string;
  storageCondition?: string;
  unit?: string;
  testsPerUnit?: number;
  analyzerCompatibility?: string;
  qcStatus?: 'QC Passed' | 'Pending QC' | 'Failed QC' | 'Calibrated' | 'Not Required';
  storageLocation?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string; // e.g. PO-2026-0001
  supplierId: string;
  supplierName: string;
  orderDate: string;
  expectedDeliveryDate: string;
  receivedDate?: string;
  totalAmount: number;
  paymentStatus: 'Pending' | 'Paid' | 'Partial';
  orderStatus: 'Ordered' | 'Partially Received' | 'Received' | 'Cancelled';
  createdBy: string;
  createdByName: string;
  notes?: string;
  itemCount?: number;
  hasMedicines?: boolean;
  hasReagents?: boolean;
  totalOrderedQuantity?: number;
  totalReceivedQuantity?: number;
  items?: PurchaseOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface DispensingDetail {
  id: string;
  dispensingId: string;
  medicineId: string;
  medicineName: string;
  baseNumber: string;
  batchId: string;
  batchNumber: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  expiryDate: string;
}

export interface Dispensing {
  id: string;
  dispensingNumber: string; // e.g. DISP-2026-0001
  patientId: string;
  patientName: string;
  doctorId?: string;
  doctorName?: string;
  pharmacistId: string;
  pharmacistName: string;
  totalAmount: number;
  status: 'Completed' | 'Refunded' | 'Cancelled';
  notes?: string;
  prescriptionId?: string;
  paymentMethod?: 'Cash' | 'Credit Card' | 'Insurance / NHIS' | 'Mobile Money' | 'Unpaid';
  insuranceProvider?: string;
  insuranceCoverageAmount?: number;
  copayAmount?: number;
  amountPaid?: number;
  changeGiven?: number;
  allergyOverrideReason?: string;
  hasAllergyWarning?: boolean;
  witnessStaffId?: string;
  witnessStaffName?: string;
  details?: DispensingDetail[];
  createdAt: string;
}

export interface MedicineReturnDetail {
  id: string;
  returnId: string;
  medicineId: string;
  medicineName: string;
  batchId: string;
  batchNumber: string;
  quantity: number;
  reason: string;
  restockAction: 'Restocked' | 'Quarantined' | 'Disposed';
}

export interface MedicineReturn {
  id: string;
  returnNumber: string; // e.g. RET-2026-0001
  returnType: 'Patient Return' | 'Supplier Return';
  referenceNumber: string; // PO Number or Dispense Number
  patientId?: string;
  patientName?: string;
  supplierId?: string;
  supplierName?: string;
  reason: string;
  status: 'Processed' | 'Pending';
  processedBy: string;
  processedByName: string;
  details?: MedicineReturnDetail[];
  createdAt: string;
}

export interface StockTransaction {
  id: string;
  transactionNumber: string;
  batchId: string;
  batchNumber: string;
  medicineId: string;
  medicineName: string;
  userId: string;
  userName: string;
  transactionType: 'Purchase' | 'Dispense' | 'Return' | 'Adjustment' | 'Disposal';
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  referenceNumber: string;
  remarks: string;
  date: string;
}

export interface StockMovement {
  id: string;
  movementNumber: string;
  batchId: string;
  batchNumber: string;
  medicineId: string;
  medicineName: string;
  userId: string;
  userName: string;
  movementType: 'Purchase' | 'Dispense' | 'Return' | 'Expiry' | 'Adjustment';
  quantityIn: number;
  quantityOut: number;
  balanceAfter: number;
  referenceNumber: string;
  remarks: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId?: string; // empty means all authorized users
  title: string;
  message: string;
  notificationType: 'Low Stock' | 'Expiry' | 'Purchase' | 'Dispensing' | 'System';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  role: string;
  action: 'Login' | 'Logout' | 'Create' | 'Update' | 'Delete' | 'Dispense' | 'Purchase' | 'Stock Update' | 'System' | 'Return';
  table: string;
  recordId: string;
  description: string;
  ipAddress: string;
  timestamp: string;
}

export interface PrescriptionItem {
  medicineId: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string;
}

export interface Prescription {
  id: string;
  prescriptionNumber: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  diagnosis: string;
  items: PrescriptionItem[];
  status: 'Pending' | 'Dispensed' | 'Cancelled';
  createdAt: string;
}

export interface EmailLog {
  id: string;
  to: string;
  subject: string;
  type: 'Expiry Alert' | 'Low Stock Alert' | 'Purchase Notification' | 'System';
  body: string;
  sentAt: string;
  status: 'Delivered' | 'Pending';
}

export interface CashDenomination {
  denomination: number;
  count: number;
  subtotal: number;
}

export interface CashMovement {
  id: string;
  shiftId: string;
  type: 'Float In' | 'Cash Drop (Safe)' | 'Petty Expense' | 'Correction';
  amount: number;
  reason: string;
  performedBy: string;
  performedByName: string;
  timestamp: string;
}

export interface ShiftHandover {
  id: string;
  shiftNumber: string; // e.g. SHIFT-2026-0001
  staffId: string;
  staffName: string;
  staffRole: string;
  relievingStaffId?: string;
  relievingStaffName?: string;
  registerName: string; // e.g. "Main OPD Counter 1"
  shiftType: 'Morning' | 'Evening' | 'Night / Emergency' | 'General';
  startTime: string;
  endTime?: string;
  status: 'Open' | 'Closed';

  // Financials
  openingFloat: number;
  totalCashSales: number;
  totalCardSales: number;
  totalInsuranceSales: number;
  totalUPIOrOtherSales: number;
  totalRefunds: number;
  cashIn: number;
  cashOut: number;

  expectedCash: number;
  actualCashCounted?: number;
  variance?: number; // actual - expected
  varianceReason?: string;

  denominations?: CashDenomination[];
  movements?: CashMovement[];

  // Metrics
  totalTransactions: number;
  totalItemsDispensed: number;

  notes?: string;
  handoverNotes?: string;
  verifiedBy?: string;
  verifiedByName?: string;

  createdAt: string;
  updatedAt: string;
}

export interface ClinicSettings {
  clinicName: string;
  clinicSecurityMode: boolean; // When true, quick-demo buttons are hidden for live clinic security
  sessionTimeoutMinutes: number; // e.g. 30 minutes
  requireStrongPasswords: boolean;
  lockoutThreshold: number; // e.g. 5 failed attempts
  lockoutDurationMinutes: number; // e.g. 15 minutes
  encryptionStandard: string;
  updatedAt?: string;
}

interface DatabaseSchema {
  settings?: ClinicSettings;
  users: User[];
  categories: Category[];
  medicines: Medicine[];
  batches: MedicineBatch[];
  suppliers: Supplier[];
  patients: Patient[];
  purchaseOrders: PurchaseOrder[];
  purchaseOrderItems: PurchaseOrderItem[];
  dispensings: Dispensing[];
  dispensingDetails: DispensingDetail[];
  returns: MedicineReturn[];
  returnDetails: MedicineReturnDetail[];
  stockTransactions: StockTransaction[];
  stockMovements: StockMovement[];
  notifications: AppNotification[];
  auditLogs: AuditLog[];
  prescriptions: Prescription[];
  emailLogs: EmailLog[];
  shifts: ShiftHandover[];
  cashMovements: CashMovement[];
  reagentConsumptionLogs?: ReagentConsumptionLog[];
  coldChainLogs?: ColdChainLog[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'pharmacy-store.json');

class DatabaseStore {
  private data!: DatabaseSchema;

  constructor() {
    this.init();
  }

  private init() {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch (err) {
        console.error('Failed to create data directory', err);
      }
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        this.data.shifts = this.data.shifts || [];
        this.data.cashMovements = this.data.cashMovements || [];
        this.data.reagentConsumptionLogs = this.data.reagentConsumptionLogs || [];
        this.data.coldChainLogs = this.data.coldChainLogs || [];
        if (!this.data.settings) {
          this.data.settings = {
            clinicName: 'NEEPCO Hospital & Clinical Pharmacy',
            clinicSecurityMode: true,
            sessionTimeoutMinutes: 30,
            requireStrongPasswords: true,
            lockoutThreshold: 5,
            lockoutDurationMinutes: 15,
            encryptionStandard: 'AES-256 JWT + Bcrypt-12 Salting',
            updatedAt: new Date().toISOString(),
          };
        } else {
          // Real clinic production security default
          this.data.settings.clinicSecurityMode = true;
        }
        this.refreshBatchStatuses();
        return;
      } catch (e) {
        console.error('Error reading db file, re-seeding:', e);
      }
    }

    this.data = this.getInitialSeedData();
    this.save();
  }

  public save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to persist database to file:', e);
    }
  }

  public refreshBatchStatuses() {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    for (const batch of this.data.batches) {
      const expDate = new Date(batch.expiryDate);
      
      // Check open-vial expiry for reagents
      if (batch.isOpenVial && batch.openVialExpiryDate) {
        const openExpDate = new Date(batch.openVialExpiryDate);
        if (openExpDate <= today) {
          batch.isOpenVialExpired = true;
        } else {
          batch.isOpenVialExpired = false;
        }
      }

      if (batch.currentQuantity <= 0) {
        batch.status = 'Depleted';
      } else if (expDate <= today || (batch.isOpenVial && batch.isOpenVialExpired)) {
        batch.status = 'Expired';
      } else if (expDate <= thirtyDaysFromNow) {
        batch.status = 'Expiring Soon';
      } else {
        batch.status = 'Available';
      }
    }
  }

  public resetToSeed() {
    this.data = this.getInitialSeedData();
    this.save();
    return this.data;
  }

  public clearAllDemoData() {
    // Keep users (admin/pharmacist/doctor/laboratorian accounts) and default categories, but clear all inventory, transactions, logs
    this.data.medicines = [];
    this.data.batches = [];
    this.data.suppliers = [];
    this.data.patients = [];
    this.data.purchaseOrders = [];
    this.data.purchaseOrderItems = [];
    this.data.dispensings = [];
    this.data.dispensingDetails = [];
    this.data.returns = [];
    this.data.returnDetails = [];
    this.data.stockTransactions = [];
    this.data.stockMovements = [];
    this.data.notifications = [];
    this.data.prescriptions = [];
    this.data.emailLogs = [];
    this.data.shifts = [];
    this.data.cashMovements = [];
    this.data.reagentConsumptionLogs = [];
    this.data.coldChainLogs = [];
    this.data.auditLogs = [
      {
        id: `aud-clear-${Date.now()}`,
        userId: 'usr-admin-01',
        userName: 'Administrator',
        role: 'Admin',
        action: 'Delete',
        table: 'system_management',
        recordId: 'all_demo_data',
        description: 'All demo medicines, reagents, batches, transactions, and logs were wiped clean. System is ready for live production data.',
        ipAddress: '127.0.0.1',
        timestamp: new Date().toISOString(),
      }
    ];
    this.save();
    return this.data;
  }

  // Getters
  get settings(): ClinicSettings {
    if (!this.data.settings) {
      this.data.settings = {
        clinicName: 'NEEPCO Hospital & Clinical Pharmacy',
        clinicSecurityMode: true,
        sessionTimeoutMinutes: 30,
        requireStrongPasswords: true,
        lockoutThreshold: 5,
        lockoutDurationMinutes: 15,
        encryptionStandard: 'AES-256 JWT + Bcrypt-12 Salting',
        updatedAt: new Date().toISOString(),
      };
      this.save();
    }
    return this.data.settings;
  }

  public updateSettings(partial: Partial<ClinicSettings>): ClinicSettings {
    const current = this.settings;
    this.data.settings = {
      ...current,
      ...partial,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.settings;
  }

  public exportBackupSnapshot() {
    return {
      backupVersion: '2.0.0',
      exportedAt: new Date().toISOString(),
      clinicName: this.settings.clinicName,
      checksum: `CK-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      metadata: {
        totalMedicines: this.data.medicines?.length || 0,
        totalBatches: this.data.batches?.length || 0,
        totalPatients: this.data.patients?.length || 0,
        totalDispensings: this.data.dispensings?.length || 0,
        totalPurchaseOrders: this.data.purchaseOrders?.length || 0,
        totalReagentConsumptionLogs: this.data.reagentConsumptionLogs?.length || 0,
      },
      data: this.data,
    };
  }

  public restoreBackupSnapshot(backupPayload: any): boolean {
    if (!backupPayload) {
      throw new Error('No backup payload received.');
    }
    const payloadData = backupPayload.data || backupPayload;
    if (!Array.isArray(payloadData.medicines) || !Array.isArray(payloadData.batches) || !Array.isArray(payloadData.users)) {
      throw new Error('Invalid or corrupted backup archive. Essential pharmacy tables are missing.');
    }
    this.data = {
      settings: payloadData.settings || this.settings,
      users: payloadData.users || [],
      categories: payloadData.categories || [],
      medicines: payloadData.medicines || [],
      batches: payloadData.batches || [],
      suppliers: payloadData.suppliers || [],
      patients: payloadData.patients || [],
      purchaseOrders: payloadData.purchaseOrders || [],
      purchaseOrderItems: payloadData.purchaseOrderItems || [],
      dispensings: payloadData.dispensings || [],
      dispensingDetails: payloadData.dispensingDetails || [],
      returns: payloadData.returns || [],
      returnDetails: payloadData.returnDetails || [],
      stockTransactions: payloadData.stockTransactions || [],
      stockMovements: payloadData.stockMovements || [],
      notifications: payloadData.notifications || [],
      auditLogs: payloadData.auditLogs || [],
      prescriptions: payloadData.prescriptions || [],
      emailLogs: payloadData.emailLogs || [],
      shifts: payloadData.shifts || [],
      cashMovements: payloadData.cashMovements || [],
      reagentConsumptionLogs: payloadData.reagentConsumptionLogs || [],
      coldChainLogs: payloadData.coldChainLogs || [],
    };
    this.refreshBatchStatuses();
    this.save();
    return true;
  }

  get users() { return this.data.users; }
  set users(val: User[]) { this.data.users = val; }
  get categories() { return this.data.categories; }
  set categories(val: Category[]) { this.data.categories = val; }
  get medicines() { return this.data.medicines; }
  set medicines(val: Medicine[]) { this.data.medicines = val; }
  get batches() { return this.data.batches; }
  set batches(val: MedicineBatch[]) { this.data.batches = val; }
  get suppliers() { return this.data.suppliers; }
  set suppliers(val: Supplier[]) { this.data.suppliers = val; }
  get patients() { return this.data.patients; }
  set patients(val: Patient[]) { this.data.patients = val; }
  get purchaseOrders() { return this.data.purchaseOrders; }
  set purchaseOrders(val: PurchaseOrder[]) { this.data.purchaseOrders = val; }
  get purchaseOrderItems() { return this.data.purchaseOrderItems; }
  set purchaseOrderItems(val: PurchaseOrderItem[]) { this.data.purchaseOrderItems = val; }
  get dispensings() { return this.data.dispensings; }
  set dispensings(val: Dispensing[]) { this.data.dispensings = val; }
  get dispensingDetails() { return this.data.dispensingDetails; }
  set dispensingDetails(val: DispensingDetail[]) { this.data.dispensingDetails = val; }
  get returns() { return this.data.returns; }
  set returns(val: MedicineReturn[]) { this.data.returns = val; }
  get returnDetails() { return this.data.returnDetails; }
  set returnDetails(val: MedicineReturnDetail[]) { this.data.returnDetails = val; }
  get stockTransactions() { return this.data.stockTransactions; }
  set stockTransactions(val: StockTransaction[]) { this.data.stockTransactions = val; }
  get stockMovements() { return this.data.stockMovements; }
  set stockMovements(val: StockMovement[]) { this.data.stockMovements = val; }
  get notifications() { return this.data.notifications; }
  set notifications(val: AppNotification[]) { this.data.notifications = val; }
  get auditLogs() { return this.data.auditLogs; }
  set auditLogs(val: AuditLog[]) { this.data.auditLogs = val; }
  get prescriptions() { return this.data.prescriptions; }
  set prescriptions(val: Prescription[]) { this.data.prescriptions = val; }
  get emailLogs() { return this.data.emailLogs; }
  set emailLogs(val: EmailLog[]) { this.data.emailLogs = val; }
  get shifts() { return this.data.shifts || []; }
  set shifts(val: ShiftHandover[]) { this.data.shifts = val; }
  get cashMovements() { return this.data.cashMovements || []; }
  set cashMovements(val: CashMovement[]) { this.data.cashMovements = val; }
  get reagentConsumptionLogs() { return this.data.reagentConsumptionLogs || []; }
  set reagentConsumptionLogs(val: ReagentConsumptionLog[]) { this.data.reagentConsumptionLogs = val; }
  get coldChainLogs() { return this.data.coldChainLogs || []; }
  set coldChainLogs(val: ColdChainLog[]) { this.data.coldChainLogs = val; }

  // --- SHIFT & CASH RECONCILIATION METHODS ---

  public getActiveShift(staffId?: string, registerName?: string): ShiftHandover | null {
    if (!this.data.shifts) this.data.shifts = [];
    const openShifts = this.data.shifts.filter(s => s.status === 'Open');
    if (openShifts.length === 0) return null;

    if (staffId) {
      const staffShift = openShifts.find(s => s.staffId === staffId);
      if (staffShift) return this.enrichShiftWithLiveFinancials(staffShift);
    }

    if (registerName) {
      const regShift = openShifts.find(s => s.registerName === registerName);
      if (regShift) return this.enrichShiftWithLiveFinancials(regShift);
    }

    // Default to the latest active shift
    return this.enrichShiftWithLiveFinancials(openShifts[openShifts.length - 1]);
  }

  public enrichShiftWithLiveFinancials(shift: ShiftHandover): ShiftHandover {
    const shiftStart = new Date(shift.startTime).getTime();
    const shiftEnd = shift.endTime ? new Date(shift.endTime).getTime() : Date.now();

    const shiftDispensings = this.data.dispensings.filter(d => {
      const t = new Date(d.createdAt).getTime();
      return t >= shiftStart && t <= shiftEnd;
    });

    const shiftReturns = (this.data.returns || []).filter(r => {
      const t = new Date(r.createdAt).getTime();
      return t >= shiftStart && t <= shiftEnd;
    });

    const shiftMovements = (this.data.cashMovements || []).filter(m => m.shiftId === shift.id);

    let cashSales = 0;
    let cardSales = 0;
    let insuranceSales = 0;
    let upiSales = 0;
    let totalItems = 0;

    for (const d of shiftDispensings) {
      const details = (this.data.dispensingDetails || []).filter(dd => dd.dispensingId === d.id);
      totalItems += details.reduce((sum, item) => sum + item.quantity, 0);

      const method = d.paymentMethod || 'Cash';
      if (method === 'Cash') {
        cashSales += d.totalAmount || 0;
      } else if (method === 'Credit Card') {
        cardSales += d.totalAmount || 0;
      } else if (method === 'Insurance / NHIS') {
        insuranceSales += d.insuranceCoverageAmount || d.totalAmount || 0;
        if (d.copayAmount) {
          cashSales += d.copayAmount;
        }
      } else if (method === 'Mobile Money') {
        upiSales += d.totalAmount || 0;
      } else {
        cashSales += d.totalAmount || 0;
      }
    }

    const totalRefunds = shiftReturns.reduce((sum, r) => {
      return sum + (r.details?.reduce((dSum, d) => dSum + d.quantity * 10, 0) || 0);
    }, 0);

    const cashIn = shiftMovements
      .filter(m => m.type === 'Float In' || m.type === 'Correction')
      .reduce((sum, m) => sum + m.amount, 0);

    const cashOut = shiftMovements
      .filter(m => m.type === 'Cash Drop (Safe)' || m.type === 'Petty Expense')
      .reduce((sum, m) => sum + m.amount, 0);

    const expectedCash = (shift.openingFloat || 0) + cashSales - totalRefunds + cashIn - cashOut;

    return {
      ...shift,
      totalCashSales: cashSales,
      totalCardSales: cardSales,
      totalInsuranceSales: insuranceSales,
      totalUPIOrOtherSales: upiSales,
      totalRefunds,
      cashIn,
      cashOut,
      expectedCash,
      totalTransactions: shiftDispensings.length,
      totalItemsDispensed: totalItems,
      movements: shiftMovements,
    };
  }

  public startShift(payload: {
    staffId: string;
    staffName: string;
    staffRole: string;
    registerName?: string;
    shiftType?: 'Morning' | 'Evening' | 'Night / Emergency' | 'General';
    openingFloat: number;
    notes?: string;
  }): ShiftHandover {
    if (!this.data.shifts) this.data.shifts = [];

    const existingOpen = this.data.shifts.find(
      s => s.status === 'Open' && s.staffId === payload.staffId
    );
    if (existingOpen) {
      throw new Error(`Staff member ${payload.staffName} already has an open active shift (#${existingOpen.shiftNumber}). Please reconcile and close the current shift first.`);
    }

    const shiftCount = this.data.shifts.length + 1;
    const year = new Date().getFullYear();
    const shiftNumber = `SHIFT-${year}-${String(shiftCount).padStart(4, '0')}`;

    const newShift: ShiftHandover = {
      id: `shift-${Date.now()}`,
      shiftNumber,
      staffId: payload.staffId,
      staffName: payload.staffName,
      staffRole: payload.staffRole,
      registerName: payload.registerName || 'Main OPD Pharmacy Counter 1',
      shiftType: payload.shiftType || 'General',
      startTime: new Date().toISOString(),
      status: 'Open',
      openingFloat: Number(payload.openingFloat) || 0,
      totalCashSales: 0,
      totalCardSales: 0,
      totalInsuranceSales: 0,
      totalUPIOrOtherSales: 0,
      totalRefunds: 0,
      cashIn: 0,
      cashOut: 0,
      expectedCash: Number(payload.openingFloat) || 0,
      totalTransactions: 0,
      totalItemsDispensed: 0,
      notes: payload.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.shifts.unshift(newShift);
    this.save();
    return newShift;
  }

  public addCashMovement(shiftId: string, payload: {
    type: 'Float In' | 'Cash Drop (Safe)' | 'Petty Expense' | 'Correction';
    amount: number;
    reason: string;
    performedBy: string;
    performedByName: string;
  }): CashMovement {
    if (!this.data.cashMovements) this.data.cashMovements = [];
    const shift = this.data.shifts.find(s => s.id === shiftId);
    if (!shift) {
      throw new Error('Shift record not found.');
    }
    if (shift.status === 'Closed') {
      throw new Error('Cannot add cash movement to a closed shift.');
    }

    const movement: CashMovement = {
      id: `cm-${Date.now()}`,
      shiftId,
      type: payload.type,
      amount: Math.abs(Number(payload.amount) || 0),
      reason: payload.reason || 'Cash movement recorded by pharmacist',
      performedBy: payload.performedBy,
      performedByName: payload.performedByName,
      timestamp: new Date().toISOString(),
    };

    this.data.cashMovements.push(movement);
    this.save();
    return movement;
  }

  public closeShift(shiftId: string, payload: {
    actualCashCounted: number;
    denominations?: CashDenomination[];
    relievingStaffId?: string;
    relievingStaffName?: string;
    handoverNotes?: string;
    varianceReason?: string;
    verifiedBy?: string;
    verifiedByName?: string;
  }): ShiftHandover {
    const shiftIndex = this.data.shifts.findIndex(s => s.id === shiftId);
    if (shiftIndex === -1) {
      throw new Error('Shift record not found.');
    }

    const currentShift = this.data.shifts[shiftIndex];
    if (currentShift.status === 'Closed') {
      throw new Error('This shift is already closed and reconciled.');
    }

    // Enrich with exact latest calculated values before finalizing
    const enriched = this.enrichShiftWithLiveFinancials(currentShift);

    const actualCount = Number(payload.actualCashCounted) || 0;
    const variance = Number((actualCount - enriched.expectedCash).toFixed(2));

    const closedShift: ShiftHandover = {
      ...enriched,
      endTime: new Date().toISOString(),
      status: 'Closed',
      actualCashCounted: actualCount,
      variance,
      varianceReason: payload.varianceReason || (variance !== 0 ? 'Variance reported at close' : 'Balanced count'),
      denominations: payload.denominations || [],
      relievingStaffId: payload.relievingStaffId,
      relievingStaffName: payload.relievingStaffName,
      handoverNotes: payload.handoverNotes || '',
      verifiedBy: payload.verifiedBy,
      verifiedByName: payload.verifiedByName,
      updatedAt: new Date().toISOString(),
    };

    this.data.shifts[shiftIndex] = closedShift;
    this.save();
    return closedShift;
  }

  public getShiftZReport(shiftId: string) {
    const shift = this.data.shifts.find(s => s.id === shiftId);
    if (!shift) {
      throw new Error('Shift not found.');
    }

    const enriched = this.enrichShiftWithLiveFinancials(shift);
    const shiftStart = new Date(shift.startTime).getTime();
    const shiftEnd = shift.endTime ? new Date(shift.endTime).getTime() : Date.now();

    const transactions = this.data.dispensings
      .filter(d => {
        const t = new Date(d.createdAt).getTime();
        return t >= shiftStart && t <= shiftEnd;
      })
      .map(d => {
        const details = (this.data.dispensingDetails || []).filter(dd => dd.dispensingId === d.id);
        return {
          id: d.id,
          dispensingNumber: d.dispensingNumber,
          patientName: d.patientName,
          totalAmount: d.totalAmount,
          paymentMethod: d.paymentMethod || 'Cash',
          createdAt: d.createdAt,
          itemCount: details.length,
        };
      });

    // Calculate top dispensed medicines in this shift
    const medicineCounts: Record<string, { name: string; quantity: number; amount: number }> = {};
    for (const d of transactions) {
      const details = (this.data.dispensingDetails || []).filter(dd => dd.dispensingId === d.id);
      for (const item of details) {
        if (!medicineCounts[item.medicineName]) {
          medicineCounts[item.medicineName] = { name: item.medicineName, quantity: 0, amount: 0 };
        }
        medicineCounts[item.medicineName].quantity += item.quantity;
        medicineCounts[item.medicineName].amount += item.subtotal;
      }
    }

    const topMedicines = Object.values(medicineCounts)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return {
      clinic: {
        name: this.settings.clinicName || 'NEEPCO Hospital & Clinical Pharmacy',
        address: 'Occupational Health Centre & Central Medical Dispensary',
        license: 'PHARM-GOV-2026-NEEPCO-891',
      },
      shift: enriched,
      transactions,
      topMedicines,
      generatedAt: new Date().toISOString(),
    };
  }

  private getInitialSeedData(): DatabaseSchema {
    // Generate bcrypt hashes
    const salt = bcrypt.genSaltSync(10);
    const adminHash = bcrypt.hashSync('admin123', salt);
    const pharmHash = bcrypt.hashSync('pharm123', salt);
    const docHash = bcrypt.hashSync('doc123', salt);
    const labHash = bcrypt.hashSync('lab123', salt);

    const now = new Date().toISOString();
    const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

    const users: User[] = [
      {
        id: 'usr-admin-01',
        username: 'admin',
        passwordHash: adminHash,
        fullName: 'Dr. Arthur Vance (Chief Admin)',
        email: 'admin@hospital.org',
        role: 'Admin',
        phone: '+1 (555) 234-5678',
        isActive: true,
        createdAt: twoMonthsAgo,
        updatedAt: now,
      },
      {
        id: 'usr-pharm-01',
        username: 'pharmacist',
        passwordHash: pharmHash,
        fullName: 'Elena Rostova, PharmD',
        email: 'pharmacist@hospital.org',
        role: 'Pharmacist',
        phone: '+1 (555) 345-6789',
        isActive: true,
        createdAt: twoMonthsAgo,
        updatedAt: now,
      },
      {
        id: 'usr-lab-01',
        username: 'laboratorian',
        passwordHash: labHash,
        fullName: 'Dr. Maya Sharma, MSc (Chief Lab Technologist)',
        email: 'laboratorian@hospital.org',
        role: 'Laboratorian',
        phone: '+1 (555) 678-9012',
        isActive: true,
        createdAt: twoMonthsAgo,
        updatedAt: now,
      },
      {
        id: 'usr-doc-01',
        username: 'doctor',
        passwordHash: docHash,
        fullName: 'Dr. Gregory House, MD',
        email: 'doctor@hospital.org',
        role: 'Doctor',
        phone: '+1 (555) 456-7890',
        isActive: true,
        createdAt: twoMonthsAgo,
        updatedAt: now,
      },
      {
        id: 'usr-inactive-01',
        username: 'inactive_staff',
        passwordHash: bcrypt.hashSync('inactive123', salt),
        fullName: 'Former Assistant John',
        email: 'john.former@hospital.org',
        role: 'Pharmacist',
        phone: '+1 (555) 999-0000',
        isActive: false, // Inactive account for testing login blocking
        createdAt: twoMonthsAgo,
        updatedAt: now,
      }
    ];

    const categories: Category[] = [
      { id: 'cat-01', name: 'Tablets', code: 'TAB', description: 'Solid dosage oral medications', status: 'Active', type: 'Medicine', createdAt: twoMonthsAgo },
      { id: 'cat-02', name: 'Capsules', code: 'CAP', description: 'Encapsulated oral powder or pellets', status: 'Active', type: 'Medicine', createdAt: twoMonthsAgo },
      { id: 'cat-03', name: 'Syrups & Liquids', code: 'SYR', description: 'Liquid formulations and oral suspensions', status: 'Active', type: 'Medicine', createdAt: twoMonthsAgo },
      { id: 'cat-04', name: 'Injections & IV', code: 'INJ', description: 'Sterile injectable ampoules and infusions', status: 'Active', type: 'Medicine', createdAt: twoMonthsAgo },
      { id: 'cat-05', name: 'Antibiotics', code: 'ANT', description: 'Broad and narrow spectrum antibacterial agents', status: 'Active', type: 'Medicine', createdAt: twoMonthsAgo },
      { id: 'cat-06', name: 'Painkillers & NSAIDs', code: 'PAIN', description: 'Analgesics, anti-pyretics and anti-inflammatory', status: 'Active', type: 'Medicine', createdAt: twoMonthsAgo },
      { id: 'cat-07', name: 'Cardiovascular', code: 'CARD', description: 'Hypertension and cardiac care medications', status: 'Active', type: 'Medicine', createdAt: twoMonthsAgo },
      { id: 'cat-08', name: 'Respiratory', code: 'RESP', description: 'Inhalers, bronchodilators, antihistamines', status: 'Active', type: 'Medicine', createdAt: twoMonthsAgo },
      { id: 'cat-09', name: 'Hematology Reagents', code: 'HEM', description: 'Diluents, lyse, and stain solutions for blood cell analyzers', status: 'Active', type: 'Reagent', createdAt: twoMonthsAgo },
      { id: 'cat-10', name: 'Biochemistry Diagnostics', code: 'BIO', description: 'Enzymatic substrate reagents for clinical chemistry automated analyzers', status: 'Active', type: 'Reagent', createdAt: twoMonthsAgo },
      { id: 'cat-11', name: 'Serology & Rapid Tests', code: 'SERO', description: 'Immunochromatographic rapid diagnostic cards and infectious disease kits', status: 'Active', type: 'Reagent', createdAt: twoMonthsAgo },
      { id: 'cat-12', name: 'Blood Bank & Typing', code: 'BLD', description: 'Monoclonal blood grouping typing sera (Anti-A, B, D) and crossmatching', status: 'Active', type: 'Reagent', createdAt: twoMonthsAgo },
      { id: 'cat-13', name: 'Microbiology & Stains', code: 'MICR', description: 'Differential bacterial staining kits and culture media diagnostics', status: 'Active', type: 'Reagent', createdAt: twoMonthsAgo },
    ];

    const suppliers: Supplier[] = [
      {
        id: 'sup-01',
        name: 'ABC Medical Suppliers Ltd',
        contactPerson: 'Robert Sterling',
        phone: '+1 (800) 555-0199',
        email: 'orders@abcmedsupply.com',
        address: '742 Healthcare Parkway, Suite 400, Chicago, IL',
        status: 'Active',
        createdAt: twoMonthsAgo,
      },
      {
        id: 'sup-02',
        name: 'Apex Pharma Distributors',
        contactPerson: 'Sarah Jenkins',
        phone: '+1 (800) 555-0245',
        email: 'sales@apexpharma.com',
        address: '1200 Industrial Blvd, Houston, TX',
        status: 'Active',
        createdAt: twoMonthsAgo,
      },
      {
        id: 'sup-03',
        name: 'BioGen Life Sciences',
        contactPerson: 'Dr. Neil Campbell',
        phone: '+1 (800) 555-0378',
        email: 'supply@biogenlife.com',
        address: '500 Innovation Way, Boston, MA',
        status: 'Active',
        createdAt: twoMonthsAgo,
      },
    ];

    const medicines: Medicine[] = [
      {
        id: 'med-01',
        name: 'Paracetamol 500mg',
        genericName: 'Acetaminophen',
        categoryId: 'cat-01',
        categoryName: 'Tablets',
        baseNumber: 'PARA500',
        description: 'First-line analgesic and antipyretic for mild to moderate pain and fever.',
        unit: 'Tablet',
        minStockLevel: 25,
        status: 'Active',
        allergyTags: ['Acetaminophen'],
        createdAt: twoMonthsAgo,
        updatedAt: now,
      },
      {
        id: 'med-02',
        name: 'Amoxicillin 500mg',
        genericName: 'Amoxicillin Trihydrate',
        categoryId: 'cat-05',
        categoryName: 'Antibiotics',
        baseNumber: 'AMOX500',
        description: 'Broad-spectrum beta-lactam antibiotic for bacterial infections.',
        unit: 'Capsule',
        minStockLevel: 30,
        status: 'Active',
        allergyTags: ['Penicillin', 'Beta-Lactam', 'Amoxicillin'],
        createdAt: twoMonthsAgo,
        updatedAt: now,
      },
      {
        id: 'med-03',
        name: 'Cetirizine 10mg',
        genericName: 'Cetirizine Hydrochloride',
        categoryId: 'cat-01',
        categoryName: 'Tablets',
        baseNumber: 'CETI010',
        description: 'Second-generation antihistamine for allergic rhinitis and urticaria.',
        unit: 'Tablet',
        minStockLevel: 20,
        status: 'Active',
        allergyTags: ['Antihistamine'],
        createdAt: twoMonthsAgo,
        updatedAt: now,
      },
      {
        id: 'med-04',
        name: 'Ibuprofen 400mg',
        genericName: 'Ibuprofen',
        categoryId: 'cat-06',
        categoryName: 'Painkillers & NSAIDs',
        baseNumber: 'IBUP400',
        description: 'Non-steroidal anti-inflammatory drug for pain, swelling and inflammation.',
        unit: 'Tablet',
        minStockLevel: 30,
        status: 'Active',
        allergyTags: ['NSAID', 'Aspirin', 'Ibuprofen'],
        createdAt: twoMonthsAgo,
        updatedAt: now,
      },
      {
        id: 'med-05',
        name: 'Azithromycin 250mg',
        genericName: 'Azithromycin',
        categoryId: 'cat-05',
        categoryName: 'Antibiotics',
        baseNumber: 'AZITH250',
        description: 'Macrolide antibiotic for respiratory and skin bacterial infections.',
        unit: 'Tablet',
        minStockLevel: 20,
        status: 'Active',
        allergyTags: ['Macrolide', 'Azithromycin'],
        createdAt: twoMonthsAgo,
        updatedAt: now,
      },
      {
        id: 'med-06',
        name: 'Metformin 500mg',
        genericName: 'Metformin Hydrochloride',
        categoryId: 'cat-01',
        categoryName: 'Tablets',
        baseNumber: 'METF500',
        description: 'Biguanide antidiabetic medication for Type 2 diabetes management.',
        unit: 'Tablet',
        minStockLevel: 40,
        status: 'Active',
        allergyTags: ['Biguanide'],
        createdAt: twoMonthsAgo,
        updatedAt: now,
      },
      {
        id: 'med-07',
        name: 'Salbutamol Inhaler 100mcg',
        genericName: 'Albuterol Sulfate',
        categoryId: 'cat-08',
        categoryName: 'Respiratory',
        baseNumber: 'SALB100',
        description: 'Short-acting beta2-agonist bronchodilator for asthma and COPD bronchospasm.',
        unit: 'Inhaler',
        minStockLevel: 10,
        status: 'Active',
        allergyTags: [],
        createdAt: twoMonthsAgo,
        updatedAt: now,
      },
      {
        id: 'med-08',
        name: 'Ceftriaxone 1g Injection',
        genericName: 'Ceftriaxone Sodium',
        categoryId: 'cat-04',
        categoryName: 'Injections & IV',
        baseNumber: 'CEFT1000',
        description: 'Third-generation cephalosporin antibiotic for severe bacterial infections.',
        unit: 'Vial',
        minStockLevel: 15,
        status: 'Active',
        allergyTags: ['Cephalosporin', 'Beta-Lactam', 'Penicillin Cross-Reactive'],
        createdAt: twoMonthsAgo,
        updatedAt: now,
      },
      {
        id: 'med-09',
        name: 'Cough Relief Syrup 100ml',
        genericName: 'Dextromethorphan + Guaifenesin',
        categoryId: 'cat-03',
        categoryName: 'Syrups & Liquids',
        baseNumber: 'SYR100',
        description: 'Expectorant and antitussive syrup for chesty cough relief.',
        unit: 'Bottle',
        minStockLevel: 15,
        status: 'Active',
        allergyTags: [],
        createdAt: twoMonthsAgo,
        updatedAt: now,
      },
      {
        id: 'med-10',
        name: 'Amlodipine 5mg',
        genericName: 'Amlodipine Besylate',
        categoryId: 'cat-07',
        categoryName: 'Cardiovascular',
        baseNumber: 'AMLO005',
        description: 'Calcium channel blocker for hypertension and coronary artery disease.',
        unit: 'Tablet',
        minStockLevel: 25,
        status: 'Active',
        allergyTags: [],
        createdAt: twoMonthsAgo,
        updatedAt: now,
      },
      {
        id: 'med-11',
        name: 'Morphine Sulfate 10mg',
        genericName: 'Morphine Sulfate Injection',
        categoryId: 'cat-04',
        categoryName: 'Injections & IV',
        baseNumber: 'MORPH010',
        description: 'Potent opioid analgesic for severe acute trauma and post-operative pain management.',
        unit: 'Ampoule',
        minStockLevel: 10,
        status: 'Active',
        isControlled: true,
        controlledSchedule: 'Schedule II - Narcotic (Double Witness Sign-Off)',
        allergyTags: ['Opioid', 'Morphine'],
        createdAt: twoMonthsAgo,
        updatedAt: now,
      },
      {
        id: 'med-12',
        name: 'Diazepam 5mg Tablets',
        genericName: 'Diazepam',
        categoryId: 'cat-01',
        categoryName: 'Tablets',
        baseNumber: 'DIAZ005',
        description: 'Benzodiazepine anxiolytic and anticonvulsant for acute agitation and status epilepticus.',
        unit: 'Tablet',
        minStockLevel: 15,
        status: 'Active',
        isControlled: true,
        controlledSchedule: 'Schedule IV - Controlled Sedative',
        allergyTags: ['Benzodiazepine'],
        createdAt: twoMonthsAgo,
        updatedAt: now,
      },
      // --- LABORATORY REAGENTS & DIAGNOSTIC KITS ---
      {
        id: 'reag-01',
        name: 'Sysmex Cellpack DCL Hematology Diluent 20L',
        genericName: 'Hematology Diluent (Buffered Saline Solution)',
        categoryId: 'cat-09',
        categoryName: 'Hematology Reagents',
        baseNumber: 'REAG-HEM-DCL',
        description: 'Ready-to-use isotonic diluent for 3-part / 5-part automated hematology differential cell counting.',
        unit: 'Kit (20L Box)',
        minStockLevel: 4,
        status: 'Active',
        itemType: 'Reagent',
        department: 'Hematology',
        storageCondition: '15°C - 25°C (Room Temp)',
        targetTemperature: '18°C - 25°C',
        analyzerCompatibility: 'Sysmex XN-550 / KX-21N Automated Cell Counters',
        testsPerUnit: 1000, // 1000 CBC tests per 20L pack
        openVialShelfLifeDays: 60,
        hazardClass: 'Non-Hazardous',
        qcFrequency: 'Daily Calibrator',
        requiresReconstitution: false,
        createdAt: twoMonthsAgo,
        updatedAt: now,
      },
      {
        id: 'reag-02',
        name: 'Glucose Hexokinase Liquid Diagnostic Reagent',
        genericName: 'Enzymatic Hexokinase Glucose Reagent 4x50ml',
        categoryId: 'cat-10',
        categoryName: 'Biochemistry Diagnostics',
        baseNumber: 'REAG-BIO-GLUC',
        description: 'Quantitative in-vitro determination of glucose in serum or plasma by UV Hexokinase enzymatic method.',
        unit: 'Vial Kit (4x50ml)',
        minStockLevel: 5,
        status: 'Active',
        itemType: 'Reagent',
        department: 'Biochemistry',
        storageCondition: '2°C - 8°C (Refrigerated)',
        targetTemperature: '4°C ± 2°C (Lab Fridge A)',
        analyzerCompatibility: 'Roche Cobas c311 / Mindray BS-240 / Semi-Auto Chem',
        testsPerUnit: 200, // 200 tests per kit
        openVialShelfLifeDays: 28,
        hazardClass: 'Non-Hazardous',
        qcFrequency: 'Per Batch Run',
        requiresReconstitution: false,
        createdAt: twoMonthsAgo,
        updatedAt: now,
      },
      {
        id: 'reag-03',
        name: 'Lipid Profile Reagent Kit (Cholesterol / Triglycerides)',
        genericName: 'Enzymatic CHOD-PAP / GPO-PAP Liquid Reagents',
        categoryId: 'cat-10',
        categoryName: 'Biochemistry Diagnostics',
        baseNumber: 'REAG-BIO-LIPID',
        description: 'Complete enzymatic assay reagents for Total Cholesterol, HDL, and Triglycerides profile analysis.',
        unit: 'Kit (6x50ml)',
        minStockLevel: 3,
        status: 'Active',
        itemType: 'Reagent',
        department: 'Biochemistry',
        storageCondition: '2°C - 8°C (Refrigerated)',
        targetTemperature: '4°C ± 2°C (Lab Fridge A)',
        analyzerCompatibility: 'Roche Cobas / Beckman Coulter AU480',
        testsPerUnit: 300,
        openVialShelfLifeDays: 30,
        hazardClass: 'Non-Hazardous',
        qcFrequency: 'Daily Calibrator',
        requiresReconstitution: false,
        createdAt: twoMonthsAgo,
        updatedAt: now,
      },
      {
        id: 'reag-04',
        name: 'Blood Grouping Typing Sera (Anti-A, Anti-B, Anti-D)',
        genericName: 'Monoclonal ABO & Rh(D) Agglutination Reagents',
        categoryId: 'cat-12',
        categoryName: 'Blood Bank & Typing',
        baseNumber: 'REAG-BLD-ABO',
        description: 'Monoclonal IgM antibodies for direct slide and tube agglutination blood grouping and Rh factor determination.',
        unit: 'Set (3x10ml Dropper Vials)',
        minStockLevel: 6,
        status: 'Active',
        itemType: 'Reagent',
        department: 'Blood Bank',
        storageCondition: '2°C - 8°C (Refrigerated)',
        targetTemperature: '2°C - 6°C (Blood Bank Refrigerator)',
        analyzerCompatibility: 'Manual Slide / Microplate / Tube Agglutination',
        testsPerUnit: 250,
        openVialShelfLifeDays: 45,
        hazardClass: 'Biohazard',
        qcFrequency: 'Per Batch Run',
        requiresReconstitution: false,
        createdAt: twoMonthsAgo,
        updatedAt: now,
      },
      {
        id: 'reag-05',
        name: 'Malaria Rapid Antigen Test Cassettes (Pf/Pv)',
        genericName: 'Plasmodium Falciparum / Vivax HRP-II & pLDH Antigen Card',
        categoryId: 'cat-11',
        categoryName: 'Serology & Rapid Tests',
        baseNumber: 'REAG-SERO-MAL',
        description: 'Qualitative immunochromatographic rapid cassette test for differential diagnosis of malaria species in whole blood.',
        unit: 'Box (25 Test Cassettes)',
        minStockLevel: 8,
        status: 'Active',
        itemType: 'Reagent',
        department: 'Immunology / Serology',
        storageCondition: '2°C - 30°C (Cool & Dry)',
        targetTemperature: 'Room Temp (20°C - 28°C)',
        analyzerCompatibility: 'Visual Lateral Flow Rapid Cassette',
        testsPerUnit: 25,
        openVialShelfLifeDays: 1, // Single-use sealed foil pouches
        hazardClass: 'Non-Hazardous',
        qcFrequency: 'Ready-to-Use',
        requiresReconstitution: false,
        createdAt: twoMonthsAgo,
        updatedAt: now,
      },
      {
        id: 'reag-06',
        name: 'Widal Agglutination Salmonella Antigen Set',
        genericName: 'Salmonella Typhi & Paratyphi (O, H, AH, BH) Antigens',
        categoryId: 'cat-11',
        categoryName: 'Serology & Rapid Tests',
        baseNumber: 'REAG-SERO-WIDAL',
        description: 'Slide and tube agglutination antigen suspensions for detection of enteric fever and typhoid antibodies.',
        unit: 'Set (4x5ml Vials)',
        minStockLevel: 4,
        status: 'Active',
        itemType: 'Reagent',
        department: 'Immunology / Serology',
        storageCondition: '2°C - 8°C (Refrigerated)',
        targetTemperature: '2°C - 8°C (Cold Storage Shelf 3)',
        analyzerCompatibility: 'Manual Slide Agglutination Tile',
        testsPerUnit: 100,
        openVialShelfLifeDays: 30,
        hazardClass: 'Biohazard',
        qcFrequency: 'Per Batch Run',
        requiresReconstitution: false,
        createdAt: twoMonthsAgo,
        updatedAt: now,
      },
      {
        id: 'reag-07',
        name: 'Gram Stain Differential Staining Kit',
        genericName: 'Crystal Violet, Gram Iodine, Decolorizer, Safranin',
        categoryId: 'cat-13',
        categoryName: 'Microbiology & Stains',
        baseNumber: 'REAG-MICR-GRAM',
        description: 'Standard 4-reagent diagnostic kit for bacteriological classification into Gram-positive and Gram-negative organisms.',
        unit: 'Kit (4x250ml Bottles)',
        minStockLevel: 2,
        status: 'Active',
        itemType: 'Reagent',
        department: 'Microbiology',
        storageCondition: '15°C - 25°C (Room Temp)',
        targetTemperature: 'Ambient Lab Room Temp',
        analyzerCompatibility: 'Brightfield Optical Microscopy',
        testsPerUnit: 250,
        openVialShelfLifeDays: 180,
        hazardClass: 'Flammable',
        qcFrequency: 'Weekly',
        requiresReconstitution: false,
        createdAt: twoMonthsAgo,
        updatedAt: now,
      },
      {
        id: 'reag-08',
        name: 'Urine 10-Parameter Test Strips',
        genericName: 'Urinalysis Multi-Reagent Dry Dipstick Strips',
        categoryId: 'cat-11',
        categoryName: 'Serology & Rapid Tests',
        baseNumber: 'REAG-URI-10G',
        description: 'Reagent strips for Leukocytes, Nitrite, Urobilinogen, Protein, pH, Blood, Specific Gravity, Ketone, Bilirubin, Glucose.',
        unit: 'Canister (100 Strips)',
        minStockLevel: 5,
        status: 'Active',
        itemType: 'Reagent',
        department: 'Urinalysis',
        storageCondition: '2°C - 30°C (Cool & Dry)',
        targetTemperature: 'Desiccated Vial (Keep Cap Tight)',
        analyzerCompatibility: 'Uritek-150 / Visual Color Chart Readout',
        testsPerUnit: 100,
        openVialShelfLifeDays: 90,
        hazardClass: 'Non-Hazardous',
        qcFrequency: 'Daily Calibrator',
        requiresReconstitution: false,
        createdAt: twoMonthsAgo,
        updatedAt: now,
      }
    ];

    // Build Batches with diverse dates for testing (Available, Expiring Soon, Expired, Depleted)
    const batches: MedicineBatch[] = [
      // Paracetamol: Multiple batches for multi-batch dispensing test
      {
        id: 'bat-01',
        medicineId: 'med-01',
        medicineName: 'Paracetamol 500mg',
        baseNumber: 'PARA500',
        batchNumber: 'TEST-PARA-001',
        manufacturingDate: '2024-01-15',
        expiryDate: '2028-07-31',
        quantityReceived: 150,
        currentQuantity: 130,
        purchasePrice: 18.5,
        sellingPrice: 30.0,
        supplierId: 'sup-01',
        supplierName: 'ABC Medical Suppliers Ltd',
        status: 'Available',
        createdAt: twoMonthsAgo,
      },
      {
        id: 'bat-02',
        medicineId: 'med-01',
        medicineName: 'Paracetamol 500mg',
        baseNumber: 'PARA500',
        batchNumber: 'PARA-BATCH-A',
        manufacturingDate: '2023-09-10',
        expiryDate: '2026-09-15', // Near expiry / earliest
        quantityReceived: 50,
        currentQuantity: 20,
        purchasePrice: 18.0,
        sellingPrice: 30.0,
        supplierId: 'sup-01',
        supplierName: 'ABC Medical Suppliers Ltd',
        status: 'Expiring Soon',
        createdAt: twoMonthsAgo,
      },
      {
        id: 'bat-03',
        medicineId: 'med-01',
        medicineName: 'Paracetamol 500mg',
        baseNumber: 'PARA500',
        batchNumber: 'PARA-BATCH-OLD',
        manufacturingDate: '2022-01-10',
        expiryDate: '2024-05-15', // Expired
        quantityReceived: 30,
        currentQuantity: 12,
        purchasePrice: 16.0,
        sellingPrice: 28.0,
        supplierId: 'sup-02',
        supplierName: 'Apex Pharma Distributors',
        status: 'Expired',
        createdAt: twoMonthsAgo,
      },
      // Amoxicillin
      {
        id: 'bat-04',
        medicineId: 'med-02',
        medicineName: 'Amoxicillin 500mg',
        baseNumber: 'AMOX500',
        batchNumber: 'AMOX-2026-B1',
        manufacturingDate: '2024-04-10',
        expiryDate: '2027-11-20',
        quantityReceived: 100,
        currentQuantity: 85,
        purchasePrice: 40.0,
        sellingPrice: 60.0,
        supplierId: 'sup-01',
        supplierName: 'ABC Medical Suppliers Ltd',
        status: 'Available',
        createdAt: oneMonthAgo,
      },
      {
        id: 'bat-05',
        medicineId: 'med-02',
        medicineName: 'Amoxicillin 500mg',
        baseNumber: 'AMOX500',
        batchNumber: 'AMOX-EXP-SOON',
        manufacturingDate: '2023-08-01',
        expiryDate: '2026-09-05', // Expiring in ~15 days
        quantityReceived: 60,
        currentQuantity: 14,
        purchasePrice: 38.0,
        sellingPrice: 58.0,
        supplierId: 'sup-02',
        supplierName: 'Apex Pharma Distributors',
        status: 'Expiring Soon',
        createdAt: twoMonthsAgo,
      },
      // Cetirizine
      {
        id: 'bat-06',
        medicineId: 'med-03',
        medicineName: 'Cetirizine 10mg',
        baseNumber: 'CETI010',
        batchNumber: 'CET-2025-01',
        manufacturingDate: '2024-02-01',
        expiryDate: '2027-08-15',
        quantityReceived: 80,
        currentQuantity: 65,
        purchasePrice: 8.5,
        sellingPrice: 15.0,
        supplierId: 'sup-01',
        supplierName: 'ABC Medical Suppliers Ltd',
        status: 'Available',
        createdAt: oneMonthAgo,
      },
      // Ibuprofen - Low Stock Example (8 total across batches)
      {
        id: 'bat-07',
        medicineId: 'med-04',
        medicineName: 'Ibuprofen 400mg',
        baseNumber: 'IBUP400',
        batchNumber: 'IBU-LOW-01',
        manufacturingDate: '2024-03-01',
        expiryDate: '2027-10-01',
        quantityReceived: 50,
        currentQuantity: 8, // Below minStockLevel 30 -> triggers Low Stock alert!
        purchasePrice: 22.0,
        sellingPrice: 35.0,
        supplierId: 'sup-02',
        supplierName: 'Apex Pharma Distributors',
        status: 'Available',
        createdAt: oneMonthAgo,
      },
      // Azithromycin
      {
        id: 'bat-08',
        medicineId: 'med-05',
        medicineName: 'Azithromycin 250mg',
        baseNumber: 'AZITH250',
        batchNumber: 'AZI-2026-A',
        manufacturingDate: '2024-01-20',
        expiryDate: '2027-06-30',
        quantityReceived: 60,
        currentQuantity: 42,
        purchasePrice: 65.0,
        sellingPrice: 95.0,
        supplierId: 'sup-03',
        supplierName: 'BioGen Life Sciences',
        status: 'Available',
        createdAt: oneMonthAgo,
      },
      // Metformin
      {
        id: 'bat-09',
        medicineId: 'med-06',
        medicineName: 'Metformin 500mg',
        baseNumber: 'METF500',
        batchNumber: 'MET-2026-X',
        manufacturingDate: '2024-02-15',
        expiryDate: '2028-02-15',
        quantityReceived: 200,
        currentQuantity: 180,
        purchasePrice: 12.0,
        sellingPrice: 22.0,
        supplierId: 'sup-01',
        supplierName: 'ABC Medical Suppliers Ltd',
        status: 'Available',
        createdAt: oneMonthAgo,
      },
      // Salbutamol Inhaler - Low Stock (5 left)
      {
        id: 'bat-10',
        medicineId: 'med-07',
        medicineName: 'Salbutamol Inhaler 100mcg',
        baseNumber: 'SALB100',
        batchNumber: 'SAL-2025-09',
        manufacturingDate: '2024-05-10',
        expiryDate: '2026-12-31',
        quantityReceived: 30,
        currentQuantity: 5, // Below minStockLevel 10
        purchasePrice: 110.0,
        sellingPrice: 160.0,
        supplierId: 'sup-03',
        supplierName: 'BioGen Life Sciences',
        status: 'Available',
        createdAt: oneMonthAgo,
      },
      // Ceftriaxone Injection - Depleted batch
      {
        id: 'bat-11',
        medicineId: 'med-08',
        medicineName: 'Ceftriaxone 1g Injection',
        baseNumber: 'CEFT1000',
        batchNumber: 'CEF-DEP-00',
        manufacturingDate: '2023-01-10',
        expiryDate: '2025-06-10',
        quantityReceived: 40,
        currentQuantity: 0,
        purchasePrice: 85.0,
        sellingPrice: 130.0,
        supplierId: 'sup-03',
        supplierName: 'BioGen Life Sciences',
        status: 'Depleted',
        createdAt: twoMonthsAgo,
      },
      {
        id: 'bat-12',
        medicineId: 'med-08',
        medicineName: 'Ceftriaxone 1g Injection',
        baseNumber: 'CEFT1000',
        batchNumber: 'CEF-2026-V2',
        manufacturingDate: '2024-06-01',
        expiryDate: '2027-09-30',
        quantityReceived: 50,
        currentQuantity: 38,
        purchasePrice: 88.0,
        sellingPrice: 135.0,
        supplierId: 'sup-03',
        supplierName: 'BioGen Life Sciences',
        status: 'Available',
        createdAt: oneMonthAgo,
      },
      {
        id: 'bat-13',
        medicineId: 'med-11',
        medicineName: 'Morphine Sulfate 10mg',
        baseNumber: 'MORPH010',
        batchNumber: 'MOR-2026-N1',
        manufacturingDate: '2024-05-10',
        expiryDate: '2027-11-30',
        quantityReceived: 40,
        currentQuantity: 28,
        purchasePrice: 120.0,
        sellingPrice: 185.0,
        supplierId: 'sup-03',
        supplierName: 'BioGen Life Sciences',
        status: 'Available',
        createdAt: oneMonthAgo,
      },
      {
        id: 'bat-14',
        medicineId: 'med-12',
        medicineName: 'Diazepam 5mg Tablets',
        baseNumber: 'DIAZ005',
        batchNumber: 'DIAZ-2026-S4',
        manufacturingDate: '2024-04-01',
        expiryDate: '2028-04-01',
        quantityReceived: 100,
        currentQuantity: 75,
        purchasePrice: 15.0,
        sellingPrice: 28.0,
        supplierId: 'sup-02',
        supplierName: 'Apex Pharma Distributors',
        status: 'Available',
        createdAt: oneMonthAgo,
      },
      // --- REAGENT BATCHES (WITH QC, OPEN-VIAL, AND COLD CHAIN STORAGE) ---
      {
        id: 'bat-r01',
        medicineId: 'reag-01',
        medicineName: 'Sysmex Cellpack DCL Hematology Diluent 20L',
        baseNumber: 'REAG-HEM-DCL',
        batchNumber: 'SYS-DCL-2026-A1',
        manufacturingDate: '2024-03-01',
        expiryDate: '2027-08-30',
        quantityReceived: 10,
        currentQuantity: 8,
        purchasePrice: 1400.0,
        sellingPrice: 0.0, // Reagents are consumed in tests, not sold directly over counter
        supplierId: 'sup-03',
        supplierName: 'BioGen Life Sciences',
        status: 'Available',
        itemType: 'Reagent',
        testsPerUnit: 1000,
        totalTestsRemaining: 8000,
        storageLocation: 'Hematology Room Main Bay (Ambient 20°C)',
        isOpenVial: true,
        unsealedDate: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
        openVialExpiryDate: new Date(Date.now() + 55 * 24 * 3600 * 1000).toISOString(),
        qcStatus: 'QC Passed',
        lastQCDate: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
        qcNotes: '3-Level hematology commercial control running within ±1.5 SD across WBC, RBC, PLT.',
        createdAt: oneMonthAgo,
      },
      {
        id: 'bat-r02',
        medicineId: 'reag-02',
        medicineName: 'Glucose Hexokinase Liquid Diagnostic Reagent',
        baseNumber: 'REAG-BIO-GLUC',
        batchNumber: 'GLUC-HK-2026-B4',
        manufacturingDate: '2024-05-15',
        expiryDate: '2027-03-20',
        quantityReceived: 12,
        currentQuantity: 9,
        purchasePrice: 450.0,
        sellingPrice: 0.0,
        supplierId: 'sup-01',
        supplierName: 'ABC Medical Suppliers Ltd',
        status: 'Available',
        itemType: 'Reagent',
        testsPerUnit: 200,
        totalTestsRemaining: 1800,
        storageLocation: 'Clinical Chemistry Cold Refrigerator (2°C - 8°C)',
        isOpenVial: true,
        unsealedDate: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
        openVialExpiryDate: new Date(Date.now() + 18 * 24 * 3600 * 1000).toISOString(),
        qcStatus: 'Calibrated',
        lastQCDate: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        qcNotes: 'Multi-calibrator level 1 & 2 verified on automated biochemistry analyzer.',
        createdAt: oneMonthAgo,
      },
      {
        id: 'bat-r03',
        medicineId: 'reag-02',
        medicineName: 'Glucose Hexokinase Liquid Diagnostic Reagent',
        baseNumber: 'REAG-BIO-GLUC',
        batchNumber: 'GLUC-HK-SOON-01',
        manufacturingDate: '2023-09-01',
        expiryDate: '2026-09-10', // Near expiry
        quantityReceived: 6,
        currentQuantity: 2,
        purchasePrice: 420.0,
        sellingPrice: 0.0,
        supplierId: 'sup-01',
        supplierName: 'ABC Medical Suppliers Ltd',
        status: 'Expiring Soon',
        itemType: 'Reagent',
        testsPerUnit: 200,
        totalTestsRemaining: 400,
        storageLocation: 'Clinical Chemistry Cold Refrigerator (2°C - 8°C)',
        isOpenVial: false,
        qcStatus: 'QC Passed',
        lastQCDate: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
        qcNotes: 'Standard curve validation passed.',
        createdAt: twoMonthsAgo,
      },
      {
        id: 'bat-r04',
        medicineId: 'reag-03',
        medicineName: 'Lipid Profile Reagent Kit (Cholesterol / Triglycerides)',
        baseNumber: 'REAG-BIO-LIPID',
        batchNumber: 'LIP-CHOD-2026-01',
        manufacturingDate: '2024-04-10',
        expiryDate: '2027-10-15',
        quantityReceived: 8,
        currentQuantity: 6,
        purchasePrice: 950.0,
        sellingPrice: 0.0,
        supplierId: 'sup-03',
        supplierName: 'BioGen Life Sciences',
        status: 'Available',
        itemType: 'Reagent',
        testsPerUnit: 300,
        totalTestsRemaining: 1800,
        storageLocation: 'Clinical Chemistry Cold Refrigerator (2°C - 8°C)',
        isOpenVial: false,
        qcStatus: 'QC Passed',
        lastQCDate: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
        qcNotes: 'Biorad QC level 1, 2, and 3 validated within target range.',
        createdAt: oneMonthAgo,
      },
      {
        id: 'bat-r05',
        medicineId: 'reag-04',
        medicineName: 'Blood Grouping Typing Sera (Anti-A, Anti-B, Anti-D)',
        baseNumber: 'REAG-BLD-ABO',
        batchNumber: 'ABO-SERA-2026-X',
        manufacturingDate: '2024-06-01',
        expiryDate: '2027-05-30',
        quantityReceived: 15,
        currentQuantity: 12,
        purchasePrice: 650.0,
        sellingPrice: 0.0,
        supplierId: 'sup-01',
        supplierName: 'ABC Medical Suppliers Ltd',
        status: 'Available',
        itemType: 'Reagent',
        testsPerUnit: 250,
        totalTestsRemaining: 3000,
        storageLocation: 'Blood Bank Refrigerator (2°C - 6°C)',
        isOpenVial: true,
        unsealedDate: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
        openVialExpiryDate: new Date(Date.now() + 31 * 24 * 3600 * 1000).toISOString(),
        qcStatus: 'QC Passed',
        lastQCDate: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
        qcNotes: 'Avidity and titer testing tested against known A, B, O positive control red cells.',
        createdAt: oneMonthAgo,
      },
      {
        id: 'bat-r06',
        medicineId: 'reag-05',
        medicineName: 'Malaria Rapid Antigen Test Cassettes (Pf/Pv)',
        baseNumber: 'REAG-SERO-MAL',
        batchNumber: 'MAL-AG-2026-K9',
        manufacturingDate: '2024-02-10',
        expiryDate: '2027-01-31',
        quantityReceived: 20,
        currentQuantity: 14,
        purchasePrice: 380.0,
        sellingPrice: 0.0,
        supplierId: 'sup-02',
        supplierName: 'Apex Pharma Distributors',
        status: 'Available',
        itemType: 'Reagent',
        testsPerUnit: 25,
        totalTestsRemaining: 350,
        storageLocation: 'Serology Room Dry Storage Cabinet',
        isOpenVial: false,
        qcStatus: 'QC Passed',
        lastQCDate: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
        qcNotes: 'Positive extraction buffer control verified clear band at C and Pf/Pv lines.',
        createdAt: oneMonthAgo,
      },
      {
        id: 'bat-r07',
        medicineId: 'reag-06',
        medicineName: 'Widal Agglutination Salmonella Antigen Set',
        baseNumber: 'REAG-SERO-WIDAL',
        batchNumber: 'WIDAL-SAL-2025',
        manufacturingDate: '2023-11-01',
        expiryDate: '2026-09-02', // Near Expiry (< 10 days)
        quantityReceived: 8,
        currentQuantity: 2,
        purchasePrice: 290.0,
        sellingPrice: 0.0,
        supplierId: 'sup-01',
        supplierName: 'ABC Medical Suppliers Ltd',
        status: 'Expiring Soon',
        itemType: 'Reagent',
        testsPerUnit: 100,
        totalTestsRemaining: 200,
        storageLocation: 'Serology Refrigerator Shelf 2',
        isOpenVial: true,
        unsealedDate: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString(),
        openVialExpiryDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
        qcStatus: 'QC Passed',
        lastQCDate: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
        qcNotes: 'Agglutination observed with 1:160 positive control sera.',
        createdAt: twoMonthsAgo,
      },
      {
        id: 'bat-r08',
        medicineId: 'reag-07',
        medicineName: 'Gram Stain Differential Staining Kit',
        baseNumber: 'REAG-MICR-GRAM',
        batchNumber: 'GRAM-STAIN-2026-V1',
        manufacturingDate: '2024-01-10',
        expiryDate: '2027-12-31',
        quantityReceived: 5,
        currentQuantity: 4,
        purchasePrice: 320.0,
        sellingPrice: 0.0,
        supplierId: 'sup-03',
        supplierName: 'BioGen Life Sciences',
        status: 'Available',
        itemType: 'Reagent',
        testsPerUnit: 250,
        totalTestsRemaining: 1000,
        storageLocation: 'Microbiology Staining Bench Station',
        isOpenVial: true,
        unsealedDate: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
        openVialExpiryDate: new Date(Date.now() + 160 * 24 * 3600 * 1000).toISOString(),
        qcStatus: 'QC Passed',
        lastQCDate: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
        qcNotes: 'Known S. aureus (Gram+) and E. coli (Gram-) control smears verified.',
        createdAt: oneMonthAgo,
      },
      {
        id: 'bat-r09',
        medicineId: 'reag-08',
        medicineName: 'Urine 10-Parameter Test Strips',
        baseNumber: 'REAG-URI-10G',
        batchNumber: 'URI-10G-2026-S3',
        manufacturingDate: '2024-03-20',
        expiryDate: '2027-09-30',
        quantityReceived: 10,
        currentQuantity: 7,
        purchasePrice: 220.0,
        sellingPrice: 0.0,
        supplierId: 'sup-02',
        supplierName: 'Apex Pharma Distributors',
        status: 'Available',
        itemType: 'Reagent',
        testsPerUnit: 100,
        totalTestsRemaining: 700,
        storageLocation: 'Clinical Pathology Urinalysis Bench',
        isOpenVial: true,
        unsealedDate: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
        openVialExpiryDate: new Date(Date.now() + 75 * 24 * 3600 * 1000).toISOString(),
        qcStatus: 'QC Passed',
        lastQCDate: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
        qcNotes: 'Quantimetrix liquid urinalysis dipstick control passed all 10 parameter pads.',
        createdAt: oneMonthAgo,
      }
    ];

    const patients: Patient[] = [
      {
        id: 'pat-01',
        patientId: 'PAT-2026-001',
        name: 'James Wilson',
        age: 48,
        gender: 'Male',
        contact: '+1 (555) 789-0123',
        address: '14 Elmwood Terrace, Springfield',
        medicalRecordNumber: 'MRN-88491',
        allergies: 'Penicillin (mild rash)',
        bloodGroup: 'O+',
        createdAt: twoMonthsAgo,
      },
      {
        id: 'pat-02',
        patientId: 'PAT-2026-002',
        name: 'Maria Sanchez',
        age: 34,
        gender: 'Female',
        contact: '+1 (555) 890-1234',
        address: '89 Maple Road, Oakville',
        medicalRecordNumber: 'MRN-65203',
        allergies: 'None',
        bloodGroup: 'A+',
        createdAt: twoMonthsAgo,
      },
      {
        id: 'pat-03',
        patientId: 'PAT-2026-003',
        name: 'David Chen',
        age: 62,
        gender: 'Male',
        contact: '+1 (555) 901-2345',
        address: '302 Birch Avenue, Metro City',
        medicalRecordNumber: 'MRN-41908',
        allergies: 'Sulfa drugs',
        bloodGroup: 'B+',
        createdAt: oneMonthAgo,
      },
      {
        id: 'pat-04',
        patientId: 'PAT-2026-004',
        name: 'Sarah Connor',
        age: 29,
        gender: 'Female',
        contact: '+1 (555) 012-3456',
        address: '45 Tech Plaza, Highland',
        medicalRecordNumber: 'MRN-19024',
        allergies: 'Aspirin',
        bloodGroup: 'AB-',
        createdAt: oneMonthAgo,
      },
    ];

    const purchaseOrders: PurchaseOrder[] = [
      {
        id: 'po-01',
        poNumber: 'PO-2026-0001',
        supplierId: 'sup-01',
        supplierName: 'ABC Medical Suppliers Ltd',
        orderDate: '2026-08-10',
        expectedDeliveryDate: '2026-08-18',
        receivedDate: '2026-08-16',
        totalAmount: 3850.0,
        paymentStatus: 'Paid',
        orderStatus: 'Received',
        createdBy: 'usr-admin-01',
        createdByName: 'Dr. Arthur Vance (Chief Admin)',
        notes: 'Annual restock for emergency ward tablets.',
        createdAt: '2026-08-10T09:00:00.000Z',
        updatedAt: '2026-08-16T14:30:00.000Z',
      },
      {
        id: 'po-02',
        poNumber: 'PO-2026-0002',
        supplierId: 'sup-01',
        supplierName: 'ABC Medical Suppliers Ltd',
        orderDate: '2026-08-18',
        expectedDeliveryDate: '2026-09-01',
        totalAmount: 3850.0,
        paymentStatus: 'Pending',
        orderStatus: 'Ordered',
        createdBy: 'usr-admin-01',
        createdByName: 'Dr. Arthur Vance (Chief Admin)',
        notes: 'Restock order for Paracetamol and Amoxicillin',
        createdAt: '2026-08-18T10:15:00.000Z',
        updatedAt: '2026-08-18T10:15:00.000Z',
      },
      {
        id: 'po-03',
        poNumber: 'PO-2026-0003',
        supplierId: 'sup-02',
        supplierName: 'Apex Pharma Distributors',
        orderDate: '2026-08-15',
        expectedDeliveryDate: '2026-08-25',
        totalAmount: 2200.0,
        paymentStatus: 'Partial',
        orderStatus: 'Partially Received',
        createdBy: 'usr-pharm-01',
        createdByName: 'Elena Rostova, PharmD',
        notes: 'Ibuprofen critical restock - 60 received of 100.',
        createdAt: '2026-08-15T11:00:00.000Z',
        updatedAt: '2026-08-19T16:00:00.000Z',
      },
      {
        id: 'po-04',
        poNumber: 'PO-2026-0004',
        supplierId: 'sup-01',
        supplierName: 'ABC Medical Suppliers Ltd',
        orderDate: '2026-08-22',
        expectedDeliveryDate: '2026-09-05',
        totalAmount: 14500.0,
        paymentStatus: 'Pending',
        orderStatus: 'Ordered',
        createdBy: 'usr-admin-01',
        createdByName: 'Dr. Arthur Vance (Chief Admin)',
        notes: 'Diagnostic Lab Reagents & Hematology Diluent replenishment for central pathology lab.',
        createdAt: '2026-08-22T08:30:00.000Z',
        updatedAt: '2026-08-22T08:30:00.000Z',
      },
    ];

    const purchaseOrderItems: PurchaseOrderItem[] = [
      // PO 1 items (Received)
      {
        id: 'poi-01',
        purchaseOrderId: 'po-01',
        medicineId: 'med-01',
        medicineName: 'Paracetamol 500mg',
        baseNumber: 'PARA500',
        orderedQuantity: 100,
        receivedQuantity: 100,
        purchasePrice: 18.5,
        sellingPrice: 30.0,
        subtotal: 1850.0,
        batchNumber: 'TEST-PARA-001',
        expiryDate: '2028-07-31',
        itemType: 'Medicine',
      },
      {
        id: 'poi-02',
        purchaseOrderId: 'po-01',
        medicineId: 'med-02',
        medicineName: 'Amoxicillin 500mg',
        baseNumber: 'AMOX500',
        orderedQuantity: 50,
        receivedQuantity: 50,
        purchasePrice: 40.0,
        sellingPrice: 60.0,
        subtotal: 2000.0,
        batchNumber: 'AMOX-2026-B1',
        expiryDate: '2027-11-20',
        itemType: 'Medicine',
      },
      // PO 2 items (Ordered)
      {
        id: 'poi-03',
        purchaseOrderId: 'po-02',
        medicineId: 'med-01',
        medicineName: 'Paracetamol 500mg',
        baseNumber: 'PARA500',
        orderedQuantity: 100,
        receivedQuantity: 0,
        purchasePrice: 18.5,
        sellingPrice: 30.0,
        subtotal: 1850.0,
        itemType: 'Medicine',
      },
      {
        id: 'poi-04',
        purchaseOrderId: 'po-02',
        medicineId: 'med-02',
        medicineName: 'Amoxicillin 500mg',
        baseNumber: 'AMOX500',
        orderedQuantity: 50,
        receivedQuantity: 0,
        purchasePrice: 40.0,
        sellingPrice: 60.0,
        subtotal: 2000.0,
        itemType: 'Medicine',
      },
      // PO 3 items (Partially Received: 100 ordered, 60 received)
      {
        id: 'poi-05',
        purchaseOrderId: 'po-03',
        medicineId: 'med-04',
        medicineName: 'Ibuprofen 400mg',
        baseNumber: 'IBUP400',
        orderedQuantity: 100,
        receivedQuantity: 60,
        purchasePrice: 22.0,
        sellingPrice: 35.0,
        subtotal: 2200.0,
        batchNumber: 'IBU-LOW-01',
        expiryDate: '2027-10-01',
        itemType: 'Medicine',
      },
      // PO 4 items (Diagnostic Reagents PO)
      {
        id: 'poi-06',
        purchaseOrderId: 'po-04',
        medicineId: 'med-09',
        medicineName: 'Sysmex Cellpack DCL Hematology Diluent 20L',
        baseNumber: 'REAG-HEM-01',
        orderedQuantity: 4,
        receivedQuantity: 0,
        purchasePrice: 1200.0,
        sellingPrice: 0.0,
        subtotal: 4800.0,
        itemType: 'Reagent',
        department: 'Hematology',
        storageCondition: '15°C - 25°C (Room Temp)',
        testsPerUnit: 500,
        unit: '20L Cubitainer',
      },
      {
        id: 'poi-07',
        purchaseOrderId: 'po-04',
        medicineId: 'med-10',
        medicineName: 'Glucose Hexokinase Liquid Diagnostic Reagent',
        baseNumber: 'REAG-BIO-01',
        orderedQuantity: 5,
        receivedQuantity: 0,
        purchasePrice: 950.0,
        sellingPrice: 0.0,
        subtotal: 4750.0,
        itemType: 'Reagent',
        department: 'Biochemistry',
        storageCondition: '2°C - 8°C (Refrigerated)',
        testsPerUnit: 250,
        unit: 'Kit (4x50ml)',
      },
      {
        id: 'poi-08',
        purchaseOrderId: 'po-04',
        medicineId: 'med-13',
        medicineName: 'Malaria Rapid Antigen Test Cassettes (Pf/Pv)',
        baseNumber: 'REAG-SERO-01',
        orderedQuantity: 10,
        receivedQuantity: 0,
        purchasePrice: 495.0,
        sellingPrice: 0.0,
        subtotal: 4950.0,
        itemType: 'Reagent',
        department: 'Serology / Infectious Disease',
        storageCondition: '2°C - 30°C (Cool & Dry)',
        testsPerUnit: 50,
        unit: 'Box (50 Cards)',
      },
    ];

    const dispensings: Dispensing[] = [
      {
        id: 'disp-01',
        dispensingNumber: 'DISP-2026-0001',
        patientId: 'pat-01',
        patientName: 'James Wilson',
        doctorId: 'usr-doc-01',
        doctorName: 'Dr. Gregory House, MD',
        pharmacistId: 'usr-pharm-01',
        pharmacistName: 'Elena Rostova, PharmD',
        totalAmount: 450.0,
        status: 'Completed',
        notes: 'Post-op pain management prescription.',
        createdAt: '2026-08-19T10:30:00.000Z',
      },
      {
        id: 'disp-02',
        dispensingNumber: 'DISP-2026-0002',
        patientId: 'pat-02',
        patientName: 'Maria Sanchez',
        doctorId: 'usr-doc-01',
        doctorName: 'Dr. Gregory House, MD',
        pharmacistId: 'usr-pharm-01',
        pharmacistName: 'Elena Rostova, PharmD',
        totalAmount: 600.0,
        status: 'Completed',
        notes: 'Upper respiratory infection treatment.',
        createdAt: '2026-08-20T14:15:00.000Z',
      },
    ];

    const dispensingDetails: DispensingDetail[] = [
      {
        id: 'dd-01',
        dispensingId: 'disp-01',
        medicineId: 'med-01',
        medicineName: 'Paracetamol 500mg',
        baseNumber: 'PARA500',
        batchId: 'bat-02',
        batchNumber: 'PARA-BATCH-A',
        quantity: 15,
        unitPrice: 30.0,
        subtotal: 450.0,
        expiryDate: '2026-09-15',
      },
      {
        id: 'dd-02',
        dispensingId: 'disp-02',
        medicineId: 'med-02',
        medicineName: 'Amoxicillin 500mg',
        baseNumber: 'AMOX500',
        batchId: 'bat-04',
        batchNumber: 'AMOX-2026-B1',
        quantity: 10,
        unitPrice: 60.0,
        subtotal: 600.0,
        expiryDate: '2027-11-20',
      },
    ];

    const returns: MedicineReturn[] = [
      {
        id: 'ret-01',
        returnNumber: 'RET-2026-0001',
        returnType: 'Patient Return',
        referenceNumber: 'DISP-2026-0001',
        patientId: 'pat-01',
        patientName: 'James Wilson',
        reason: 'Patient experienced mild nausea, switched medication.',
        status: 'Processed',
        processedBy: 'usr-pharm-01',
        processedByName: 'Elena Rostova, PharmD',
        createdAt: '2026-08-20T16:00:00.000Z',
      }
    ];

    const returnDetails: MedicineReturnDetail[] = [
      {
        id: 'rd-01',
        returnId: 'ret-01',
        medicineId: 'med-01',
        medicineName: 'Paracetamol 500mg',
        batchId: 'bat-02',
        batchNumber: 'PARA-BATCH-A',
        quantity: 5,
        reason: 'Unused sealed blister pack returned.',
        restockAction: 'Restocked',
      }
    ];

    const stockTransactions: StockTransaction[] = [
      {
        id: 'st-01',
        transactionNumber: 'ST-2026-0001',
        batchId: 'bat-01',
        batchNumber: 'TEST-PARA-001',
        medicineId: 'med-01',
        medicineName: 'Paracetamol 500mg',
        userId: 'usr-pharm-01',
        userName: 'Elena Rostova, PharmD',
        transactionType: 'Purchase',
        quantity: 150,
        quantityBefore: 0,
        quantityAfter: 150,
        referenceNumber: 'PO-2026-0001',
        remarks: 'Received goods from PO-2026-0001',
        date: '2026-08-16T14:30:00.000Z',
      },
      {
        id: 'st-02',
        transactionNumber: 'ST-2026-0002',
        batchId: 'bat-01',
        batchNumber: 'TEST-PARA-001',
        medicineId: 'med-01',
        medicineName: 'Paracetamol 500mg',
        userId: 'usr-pharm-01',
        userName: 'Elena Rostova, PharmD',
        transactionType: 'Dispense',
        quantity: -20,
        quantityBefore: 150,
        quantityAfter: 130,
        referenceNumber: 'DISP-2026-INIT',
        remarks: 'Dispensed to Inpatient Ward A',
        date: '2026-08-17T09:10:00.000Z',
      },
      {
        id: 'st-03',
        transactionNumber: 'ST-2026-0003',
        batchId: 'bat-02',
        batchNumber: 'PARA-BATCH-A',
        medicineId: 'med-01',
        medicineName: 'Paracetamol 500mg',
        userId: 'usr-pharm-01',
        userName: 'Elena Rostova, PharmD',
        transactionType: 'Dispense',
        quantity: -15,
        quantityBefore: 30,
        quantityAfter: 15,
        referenceNumber: 'DISP-2026-0001',
        remarks: 'Dispensed to James Wilson',
        date: '2026-08-19T10:30:00.000Z',
      },
      {
        id: 'st-04',
        transactionNumber: 'ST-2026-0004',
        batchId: 'bat-02',
        batchNumber: 'PARA-BATCH-A',
        medicineId: 'med-01',
        medicineName: 'Paracetamol 500mg',
        userId: 'usr-pharm-01',
        userName: 'Elena Rostova, PharmD',
        transactionType: 'Return',
        quantity: 5,
        quantityBefore: 15,
        quantityAfter: 20,
        referenceNumber: 'RET-2026-0001',
        remarks: 'Patient return restocked safely',
        date: '2026-08-20T16:00:00.000Z',
      },
    ];

    const stockMovements: StockMovement[] = [
      {
        id: 'sm-01',
        movementNumber: 'MOV-2026-0001',
        batchId: 'bat-01',
        batchNumber: 'TEST-PARA-001',
        medicineId: 'med-01',
        medicineName: 'Paracetamol 500mg',
        userId: 'usr-pharm-01',
        userName: 'Elena Rostova, PharmD',
        movementType: 'Purchase',
        quantityIn: 150,
        quantityOut: 0,
        balanceAfter: 150,
        referenceNumber: 'PO-2026-0001',
        remarks: 'Initial PO receipt',
        createdAt: '2026-08-16T14:30:00.000Z',
      },
      {
        id: 'sm-02',
        movementNumber: 'MOV-2026-0002',
        batchId: 'bat-01',
        batchNumber: 'TEST-PARA-001',
        medicineId: 'med-01',
        medicineName: 'Paracetamol 500mg',
        userId: 'usr-pharm-01',
        userName: 'Elena Rostova, PharmD',
        movementType: 'Dispense',
        quantityIn: 0,
        quantityOut: 20,
        balanceAfter: 130,
        referenceNumber: 'DISP-2026-INIT',
        remarks: 'Ward dispensation',
        createdAt: '2026-08-17T09:10:00.000Z',
      },
      {
        id: 'sm-03',
        movementNumber: 'MOV-2026-0003',
        batchId: 'bat-02',
        batchNumber: 'PARA-BATCH-A',
        medicineId: 'med-01',
        medicineName: 'Paracetamol 500mg',
        userId: 'usr-pharm-01',
        userName: 'Elena Rostova, PharmD',
        movementType: 'Dispense',
        quantityIn: 0,
        quantityOut: 15,
        balanceAfter: 15,
        referenceNumber: 'DISP-2026-0001',
        remarks: 'Dispensed for Patient James Wilson',
        createdAt: '2026-08-19T10:30:00.000Z',
      },
      {
        id: 'sm-04',
        movementNumber: 'MOV-2026-0004',
        batchId: 'bat-02',
        batchNumber: 'PARA-BATCH-A',
        medicineId: 'med-01',
        medicineName: 'Paracetamol 500mg',
        userId: 'usr-pharm-01',
        userName: 'Elena Rostova, PharmD',
        movementType: 'Return',
        quantityIn: 5,
        quantityOut: 0,
        balanceAfter: 20,
        referenceNumber: 'RET-2026-0001',
        remarks: 'Restocked returned items',
        createdAt: '2026-08-20T16:00:00.000Z',
      },
    ];

    const notifications: AppNotification[] = [
      {
        id: 'notif-01',
        title: 'Low Stock Alert',
        message: 'Ibuprofen 400mg (IBUP400) has only 8 items remaining (Threshold: 30). Please generate purchase order.',
        notificationType: 'Low Stock',
        priority: 'High',
        isRead: false,
        metadata: { medicineId: 'med-04', baseNumber: 'IBUP400', currentStock: 8 },
        createdAt: '2026-08-21T06:00:00.000Z',
      },
      {
        id: 'notif-02',
        title: 'Batch Expiring Soon',
        message: 'Batch PARA-BATCH-A of Paracetamol 500mg expires on 15-Sep-2026 (25 days left). Prioritize in FEFO dispensing.',
        notificationType: 'Expiry',
        priority: 'High',
        isRead: false,
        metadata: { batchId: 'bat-02', batchNumber: 'PARA-BATCH-A', expiryDate: '2026-09-15' },
        createdAt: '2026-08-21T06:15:00.000Z',
      },
      {
        id: 'notif-03',
        title: 'Expired Batch Detected',
        message: 'Batch PARA-BATCH-OLD of Paracetamol 500mg expired on 15-May-2024. Stock of 12 units quarantined from dispensing.',
        notificationType: 'Expiry',
        priority: 'Critical',
        isRead: false,
        metadata: { batchId: 'bat-03', batchNumber: 'PARA-BATCH-OLD' },
        createdAt: '2026-08-21T06:30:00.000Z',
      },
      {
        id: 'notif-04',
        title: 'Purchase Order Delivered',
        message: 'Purchase Order PO-2026-0001 was fully received and verified by Elena Rostova.',
        notificationType: 'Purchase',
        priority: 'Medium',
        isRead: true,
        metadata: { poNumber: 'PO-2026-0001' },
        createdAt: '2026-08-16T14:35:00.000Z',
      },
    ];

    const auditLogs: AuditLog[] = [
      {
        id: 'aud-01',
        userId: 'usr-admin-01',
        userName: 'Dr. Arthur Vance (Chief Admin)',
        role: 'Admin',
        action: 'Login',
        table: 'users',
        recordId: 'usr-admin-01',
        description: 'Administrator logged in from Terminal #1 (Administration Wing).',
        ipAddress: '192.168.1.10',
        timestamp: '2026-08-21T07:00:00.000Z',
      },
      {
        id: 'aud-02',
        userId: 'usr-pharm-01',
        userName: 'Elena Rostova, PharmD',
        role: 'Pharmacist',
        action: 'Purchase',
        table: 'purchase_orders',
        recordId: 'po-01',
        description: 'Purchase order PO-2026-0001 received. 150 items added to batches and inventory updated.',
        ipAddress: '192.168.1.25',
        timestamp: '2026-08-16T14:30:00.000Z',
      },
      {
        id: 'aud-03',
        userId: 'usr-pharm-01',
        userName: 'Elena Rostova, PharmD',
        role: 'Pharmacist',
        action: 'Dispense',
        table: 'dispensing',
        recordId: 'disp-01',
        description: 'Dispensed 15x Paracetamol 500mg to Patient James Wilson (DISP-2026-0001). Stock auto-decreased.',
        ipAddress: '192.168.1.25',
        timestamp: '2026-08-19T10:30:00.000Z',
      },
      {
        id: 'aud-04',
        userId: 'usr-pharm-01',
        userName: 'Elena Rostova, PharmD',
        role: 'Pharmacist',
        action: 'Return',
        table: 'medicine_returns',
        recordId: 'ret-01',
        description: 'Processed medicine return RET-2026-0001 for James Wilson. 5x Paracetamol restocked.',
        ipAddress: '192.168.1.25',
        timestamp: '2026-08-20T16:00:00.000Z',
      },
    ];

    const prescriptions: Prescription[] = [
      {
        id: 'prsc-01',
        prescriptionNumber: 'RX-2026-001',
        patientId: 'pat-01',
        patientName: 'James Wilson',
        doctorId: 'usr-doc-01',
        doctorName: 'Dr. Gregory House, MD',
        diagnosis: 'Acute Lumbosacral strain & fever',
        status: 'Dispensed',
        items: [
          {
            medicineId: 'med-01',
            medicineName: 'Paracetamol 500mg',
            dosage: '500mg',
            frequency: 'Every 6 hours as needed',
            duration: '5 days',
            quantity: 15,
            instructions: 'Take with food or water after meals',
          }
        ],
        createdAt: '2026-08-19T10:00:00.000Z',
      },
      {
        id: 'prsc-02',
        prescriptionNumber: 'RX-2026-002',
        patientId: 'pat-03',
        patientName: 'David Chen',
        doctorId: 'usr-doc-01',
        doctorName: 'Dr. Gregory House, MD',
        diagnosis: 'Bacterial pharyngitis',
        status: 'Pending',
        items: [
          {
            medicineId: 'med-02',
            medicineName: 'Amoxicillin 500mg',
            dosage: '500mg',
            frequency: '3 times daily (TID)',
            duration: '7 days',
            quantity: 21,
            instructions: 'Complete full course even if feeling better',
          },
          {
            medicineId: 'med-01',
            medicineName: 'Paracetamol 500mg',
            dosage: '500mg',
            frequency: 'Twice daily (PRN for fever)',
            duration: '5 days',
            quantity: 10,
            instructions: 'Do not exceed 4000mg per day',
          }
        ],
        createdAt: '2026-08-21T07:15:00.000Z',
      }
    ];

    const emailLogs: EmailLog[] = [
      {
        id: 'em-01',
        to: 'pharmacist@hospital.org, chief.officer@hospital.org',
        subject: 'URGENT: Batch Expiry Warning - Hospital Pharmacy Notification',
        type: 'Expiry Alert',
        body: 'Automated Hospital System Alert: Batch PARA-BATCH-A of Paracetamol 500mg (Base: PARA500) expires on 15-Sep-2026. Remaining quantity: 20 units. Please review dispensing priority.',
        sentAt: '2026-08-21T06:00:00.000Z',
        status: 'Delivered',
      },
      {
        id: 'em-02',
        to: 'purchasing@hospital.org',
        subject: 'CRITICAL: Low Stock Re-order Notice - Ibuprofen 400mg',
        type: 'Low Stock Alert',
        body: 'Current stock of Ibuprofen 400mg (IBUP400) is 8 units, which is below the minimum threshold of 30. Please approve purchase order.',
        sentAt: '2026-08-21T06:30:00.000Z',
        status: 'Delivered',
      }
    ];

    const shifts: ShiftHandover[] = [
      {
        id: 'shift-01',
        shiftNumber: 'SHIFT-2026-0001',
        staffId: 'usr-pharm-01',
        staffName: 'Elena Rostova, PharmD',
        staffRole: 'Pharmacist',
        relievingStaffId: 'usr-admin-01',
        relievingStaffName: 'Dr. Arthur Vance (Chief Admin)',
        registerName: 'Main OPD Pharmacy Counter 1',
        shiftType: 'Morning',
        startTime: '2026-08-20T08:00:00.000Z',
        endTime: '2026-08-20T16:00:00.000Z',
        status: 'Closed',
        openingFloat: 2000,
        totalCashSales: 3450,
        totalCardSales: 1200,
        totalInsuranceSales: 4500,
        totalUPIOrOtherSales: 850,
        totalRefunds: 0,
        cashIn: 0,
        cashOut: 0,
        expectedCash: 5450,
        actualCashCounted: 5450,
        variance: 0,
        varianceReason: 'Reconciled exact match at shift handover',
        denominations: [
          { denomination: 500, count: 8, subtotal: 4000 },
          { denomination: 200, count: 5, subtotal: 1000 },
          { denomination: 100, count: 4, subtotal: 400 },
          { denomination: 50, count: 1, subtotal: 50 },
        ],
        totalTransactions: 14,
        totalItemsDispensed: 38,
        notes: 'Smooth morning OPD flow. Stocked up on Paracetamol and ORS sachets.',
        handoverNotes: 'All narcotic keys handed over to Chief Admin. Evening prescription queue is clear.',
        verifiedBy: 'usr-admin-01',
        verifiedByName: 'Dr. Arthur Vance (Chief Admin)',
        createdAt: '2026-08-20T08:00:00.000Z',
        updatedAt: '2026-08-20T16:05:00.000Z',
      },
      {
        id: 'shift-02',
        shiftNumber: 'SHIFT-2026-0002',
        staffId: 'usr-pharm-01',
        staffName: 'Elena Rostova, PharmD',
        staffRole: 'Pharmacist',
        registerName: 'Main OPD Pharmacy Counter 1',
        shiftType: 'Morning',
        startTime: new Date(Date.now() - 4 * 3600 * 1000).toISOString(), // Started 4 hours ago
        status: 'Open',
        openingFloat: 2000,
        totalCashSales: 1850,
        totalCardSales: 620,
        totalInsuranceSales: 2100,
        totalUPIOrOtherSales: 450,
        totalRefunds: 0,
        cashIn: 500,
        cashOut: 0,
        expectedCash: 4350,
        totalTransactions: 6,
        totalItemsDispensed: 18,
        notes: 'Active shift for NEEPCO Health Center dispensary.',
        createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];

    const cashMovements: CashMovement[] = [
      {
        id: 'cm-01',
        shiftId: 'shift-02',
        type: 'Float In',
        amount: 500,
        reason: 'Added small change coins and ₹10/₹20 notes from central vault',
        performedBy: 'usr-pharm-01',
        performedByName: 'Elena Rostova, PharmD',
        timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      }
    ];

    const reagentConsumptionLogs: ReagentConsumptionLog[] = [
      {
        id: 'rcl-01',
        reagentId: 'reag-01',
        reagentName: 'Sysmex Cellpack DCL Hematology Diluent 20L',
        batchId: 'bat-r01',
        batchNumber: 'SYS-DCL-2026-A1',
        department: 'Hematology',
        testName: 'Complete Blood Count (CBC) with 5-Part Diff',
        testsConsumed: 25,
        unitsDeducted: 0.025,
        patientId: 'pat-01',
        patientName: 'James Wilson',
        prescribedByDoctor: 'Dr. Gregory House, MD',
        performedByUserId: 'usr-lab-01',
        performedByUserName: 'Dr. Maya Sharma, MSc',
        analyzerUsed: 'Sysmex XN-550 Automated Hematology Analyzer',
        qcChecked: true,
        remarks: 'Routine pre-op CBC test. Internal controls valid.',
        timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      },
      {
        id: 'rcl-02',
        reagentId: 'reag-02',
        reagentName: 'Glucose Hexokinase Liquid Diagnostic Reagent',
        batchId: 'bat-r02',
        batchNumber: 'GLUC-HK-2026-B4',
        department: 'Biochemistry',
        testName: 'Fasting Plasma Blood Glucose (FBG)',
        testsConsumed: 12,
        unitsDeducted: 0.06,
        patientId: 'pat-02',
        patientName: 'Maria Sanchez',
        prescribedByDoctor: 'Dr. Gregory House, MD',
        performedByUserId: 'usr-lab-01',
        performedByUserName: 'Dr. Maya Sharma, MSc',
        analyzerUsed: 'Mindray BS-240 Clinical Chemistry Analyzer',
        qcChecked: true,
        remarks: 'Diabetic follow-up panel. Calibrator zero baseline confirmed.',
        timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      },
      {
        id: 'rcl-03',
        reagentId: 'reag-05',
        reagentName: 'Malaria Rapid Antigen Test Cassettes (Pf/Pv)',
        batchId: 'bat-r06',
        batchNumber: 'MAL-AG-2026-K9',
        department: 'Immunology / Serology',
        testName: 'Rapid Malaria Antigen Card (Pf/Pv Detection)',
        testsConsumed: 2,
        unitsDeducted: 2,
        patientId: 'pat-01',
        patientName: 'James Wilson',
        prescribedByDoctor: 'Dr. Gregory House, MD',
        performedByUserId: 'usr-lab-01',
        performedByUserName: 'Dr. Maya Sharma, MSc',
        analyzerUsed: 'Visual Lateral Flow Cassette Reader',
        qcChecked: true,
        remarks: 'Acute pyrexia evaluation. Negative for Pf & Pv.',
        timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      }
    ];

    const coldChainLogs: ColdChainLog[] = [
      {
        id: 'ccl-01',
        storageUnit: 'Clinical Chemistry Cold Refrigerator (2°C - 8°C)',
        recordedTemperature: 4.2,
        minThreshold: 2.0,
        maxThreshold: 8.0,
        status: 'Normal',
        recordedBy: 'Dr. Maya Sharma, MSc (Chief Lab Technologist)',
        timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        notes: 'Morning routine cold chain temperature verification. Compressor operating normally.',
      },
      {
        id: 'ccl-02',
        storageUnit: 'Blood Bank Refrigerator (2°C - 6°C)',
        recordedTemperature: 3.8,
        minThreshold: 2.0,
        maxThreshold: 6.0,
        status: 'Normal',
        recordedBy: 'Dr. Maya Sharma, MSc (Chief Lab Technologist)',
        timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        notes: 'Digital thermometer calibrated. Crossmatch sera intact.',
      },
      {
        id: 'ccl-03',
        storageUnit: 'Deep Vaccine & Control Specimen Freezer (-20°C)',
        recordedTemperature: -19.5,
        minThreshold: -25.0,
        maxThreshold: -15.0,
        status: 'Normal',
        recordedBy: 'Dr. Maya Sharma, MSc (Chief Lab Technologist)',
        timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        notes: 'Enzyme calibrators and lyophilized QC standards safely frozen.',
      }
    ];

    return {
      users,
      categories,
      medicines,
      batches,
      suppliers,
      patients,
      purchaseOrders,
      purchaseOrderItems,
      dispensings,
      dispensingDetails,
      returns,
      returnDetails,
      stockTransactions,
      stockMovements,
      notifications,
      auditLogs,
      prescriptions,
      emailLogs,
      shifts,
      cashMovements,
      reagentConsumptionLogs,
      coldChainLogs,
    };
  }
}

export const db = new DatabaseStore();
