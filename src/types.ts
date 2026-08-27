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
  registerName: string; // e.g. "Main OPD Counter 1", "Emergency Window"
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

export type TabType =
  | 'dashboard'
  | 'medicines'
  | 'reagents'
  | 'categories'
  | 'batches'
  | 'inventory'
  | 'purchases'
  | 'dispensing'
  | 'returns'
  | 'suppliers'
  | 'patients'
  | 'reports'
  | 'audit'
  | 'users'
  | 'emailLogs'
  | 'email-logs'
  | 'security';


export type UserRole = 'Admin' | 'Pharmacist' | 'Doctor' | 'Nurse' | 'Laboratorian';

export type ItemType = 'Medicine' | 'Reagent';
export type StorageCondition = '2°C - 8°C (Refrigerated)' | '-20°C (Deep Freezer)' | '15°C - 25°C (Room Temp)' | '2°C - 30°C (Cool & Dry)';
export type LabDepartment = 'Biochemistry' | 'Hematology' | 'Microbiology' | 'Clinical Pathology' | 'Blood Bank' | 'Immunology / Serology' | 'Molecular Diagnostics' | 'Urinalysis' | 'General Laboratory';
export type QCStatus = 'QC Passed' | 'Pending QC' | 'Failed QC' | 'Calibrated' | 'Not Required';

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
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
  type?: ItemType;
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
  unit: string;
  minStockLevel: number;
  status: 'Active' | 'Inactive';
  itemType?: ItemType; // 'Medicine' | 'Reagent'
  
  // Reagent-Specific Properties
  department?: LabDepartment;
  storageCondition?: StorageCondition;
  targetTemperature?: string;
  analyzerCompatibility?: string;
  testsPerUnit?: number; // e.g. 100 tests / kit
  openVialShelfLifeDays?: number; // e.g. 14 / 30 / 60 days
  hazardClass?: 'Non-Hazardous' | 'Corrosive' | 'Biohazard' | 'Flammable' | 'Toxic';
  qcFrequency?: 'Daily Calibrator' | 'Per Batch Run' | 'Weekly' | 'Ready-to-Use';
  requiresReconstitution?: boolean;

  // Medicine-Specific Properties
  isControlled?: boolean;
  controlledSchedule?: string;
  allergyTags?: string[];

  // Dynamic Calculated Stock
  totalStock?: number;
  totalBatches?: number;
  isLowStock?: boolean;
  unitPrice?: number;
  sellingPrice?: number;
  purchasePrice?: number;
  activeBatchNumber?: string;
  activeBatchExpiry?: string;
  batches?: MedicineBatch[];
  totalTestsAvailable?: number;
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
  itemType?: ItemType;

  // Reagent Batch Properties
  testsPerUnit?: number;
  totalTestsRemaining?: number;
  storageLocation?: string; // e.g. "Main Lab Refrigerator A (2-8°C) Shelf 2"
  unsealedDate?: string; // When the vial was first opened
  openVialExpiryDate?: string;
  isOpenVial?: boolean;
  isOpenVialExpired?: boolean;
  qcStatus?: QCStatus;
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
  department: LabDepartment;
  testName: string; // e.g. "CBC (Complete Blood Count)", "Lipid Profile", "HbA1c Test"
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
  storageUnit: string; // e.g. "Lab Cold Room / Fridge A (2°C-8°C)"
  recordedTemperature: number; // e.g. 4.2
  minThreshold: number; // 2.0
  maxThreshold: number; // 8.0
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
  totalOrders?: number;
  totalSpent?: number;
  createdAt: string;
}

export interface Patient {
  id: string;
  patientId: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  contact: string;
  address: string;
  medicalRecordNumber: string;
  allergies?: string;
  bloodGroup?: string;
  dispensingsCount?: number;
  prescriptionsCount?: number;
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
  itemType?: ItemType;
  categoryName?: string;
  department?: LabDepartment;
  storageCondition?: StorageCondition;
  unit?: string;
  testsPerUnit?: number;
  analyzerCompatibility?: string;
  qcStatus?: QCStatus;
  storageLocation?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
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
  dispensingNumber: string;
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
  itemCount?: number;
  totalQuantity?: number;
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
  returnNumber: string;
  returnType: 'Patient Return' | 'Supplier Return';
  referenceNumber: string;
  patientId?: string;
  patientName?: string;
  supplierId?: string;
  supplierName?: string;
  reason: string;
  status: 'Processed' | 'Pending';
  processedBy: string;
  processedByName: string;
  itemCount?: number;
  totalQuantity?: number;
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
  userId?: string;
  title: string;
  message: string;
  notificationType: 'Low Stock' | 'Expiry' | 'Purchase' | 'Dispensing' | 'System';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface Role {
  id: string;
  name: 'Admin' | 'Pharmacist' | 'Doctor';
  description: string;
  permissions: string[];
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  role?: string;
  userRole?: string;
  action: 'Login' | 'Logout' | 'Create' | 'Update' | 'Delete' | 'Dispense' | 'Purchase' | 'Stock Update' | 'System' | 'Return' | string;
  table?: string;
  module?: string;
  recordId?: string;
  entityId?: string;
  description?: string;
  details?: string;
  ipAddress?: string;
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

export interface DashboardData {
  cards: {
    totalMedicines: number;
    activeMedicines: number;
    totalReagents: number;
    activeReagents: number;
    totalReagentKits: number;
    totalTestsAvailable: number;
    reagentInventoryValue: number;
    openVialsCount: number;
    openVialsNearExpiryCount: number;
    todayReagentTestsRun: number;
    todayReagentConsumptionCount: number;
    totalBatches: number;
    availableBatches: number;
    lowStockCount: number;
    lowStockReagentsCount: number;
    expiringSoonCount: number;
    expiringReagentsCount: number;
    expiredCount: number;
    expiredReagentsCount: number;
    todayDispensingCount: number;
    todayDispensingUnits: number;
    todayDispensingAmount: number;
    pendingPurchasesCount: number;
    pendingReagentPurchasesCount: number;
    totalStockUnits: number;
    totalInventoryValue: number;
    coldChainNormalCount?: number;
    coldChainAlertCount?: number;
  };
  lowStockList: Array<{
    id: string;
    name: string;
    baseNumber: string;
    categoryName: string;
    currentStock: number;
    minStockLevel: number;
    unit: string;
    itemType?: 'Medicine' | 'Reagent';
    department?: string;
    testsAvailable?: number;
  }>;
  lowStockReagentsList: Array<{
    id: string;
    name: string;
    baseNumber: string;
    department: string;
    currentStock: number;
    minStockLevel: number;
    unit: string;
    testsPerUnit: number;
    totalTestsRemaining: number;
    storageCondition?: string;
  }>;
  expiringBatchesList: Array<{
    id: string;
    medicineName: string;
    baseNumber: string;
    batchNumber: string;
    expiryDate: string;
    currentQuantity: number;
    itemType?: 'Medicine' | 'Reagent';
    department?: string;
    testsRemaining?: number;
    isOpenVial?: boolean;
    openVialExpiryDate?: string;
  }>;
  expiringReagentsList: Array<{
    id: string;
    reagentName: string;
    baseNumber: string;
    batchNumber: string;
    department: string;
    expiryDate: string;
    currentQuantity: number;
    totalTestsRemaining: number;
    isOpenVial?: boolean;
    openVialExpiryDate?: string;
    storageLocation?: string;
    qcStatus?: string;
  }>;
  expiredBatchesList: Array<{
    id: string;
    medicineName: string;
    baseNumber: string;
    batchNumber: string;
    expiryDate: string;
    currentQuantity: number;
    itemType?: 'Medicine' | 'Reagent';
  }>;
  recentPurchases: PurchaseOrder[];
  recentDispensing: Dispensing[];
  recentReturns: MedicineReturn[];
  recentReagentConsumptions?: ReagentConsumptionLog[];
  unreadNotifications: AppNotification[];
  recentActivity: AuditLog[];
  categoryStats: Array<{ name: string; stock: number; medicineCount: number }>;
  departmentReagentStats: Array<{ name: string; stockKits: number; testsAvailable: number; reagentCount: number }>;
  batchStatusBreakdown: Array<{ name: string; value: number; color: string }>;
  reagentStatusBreakdown?: Array<{ name: string; value: number; color: string }>;
}
