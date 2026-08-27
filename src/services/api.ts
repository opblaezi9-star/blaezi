const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('smart_pharmacy_token');
}

export function setToken(token: string) {
  localStorage.setItem('smart_pharmacy_token', token);
}

export function removeToken() {
  localStorage.removeItem('smart_pharmacy_token');
}

export async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as any)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  let data: any;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = { success: false, message: `Invalid JSON response (${response.status})` };
    }
  } else {
    try {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = {
          success: false,
          message: text && text.length < 200 ? text : `Request failed with status ${response.status}`,
        };
      }
    } catch {
      data = { success: false, message: `Request failed with status ${response.status}` };
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      removeToken();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('auth:expired', {
            detail: {
              message: data?.message || 'Session has expired. Please log in again.',
            },
          })
        );
      }
    }
    const errorMsg = data?.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg) as any;
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

// API Service functions
export const api = {
  // Auth & Security
  login: (credentials: { username: string; password: string }) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getMe: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),
  getSecuritySettings: () => request('/auth/security-settings'),
  updateSecuritySettings: (settings: Record<string, any>) =>
    request('/auth/security-settings', { method: 'PUT', body: JSON.stringify(settings) }),
  getDemoUsers: () => request('/auth/demo-users'),
  resetDemoData: () => request('/dashboard/reset-demo-data', { method: 'POST' }),
  clearDemoData: () => request('/dashboard/clear-demo-data', { method: 'POST' }),
  exportBackupSnapshot: () => {
    const token = getToken();
    return fetch(`${API_BASE}/dashboard/backup/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then(res => {
      if (!res.ok) throw new Error('Backup export failed');
      return res.blob();
    });
  },
  restoreBackupSnapshot: (backupPayload: any) =>
    request('/dashboard/backup/restore', { method: 'POST', body: JSON.stringify(backupPayload) }),

  // Dashboard
  getDashboard: () => request('/dashboard'),

  // Medicines & Categories
  getMedicines: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/medicines${q}`);
  },
  getMedicineById: (id: string) => request(`/medicines/${id}`),
  createMedicine: (data: any) => request('/medicines', { method: 'POST', body: JSON.stringify(data) }),
  updateMedicine: (id: string, data: any) => request(`/medicines/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMedicine: (id: string) => request(`/medicines/${id}`, { method: 'DELETE' }),

  getCategories: () => request('/categories'),
  createCategory: (data: any) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: string, data: any) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: string) => request(`/categories/${id}`, { method: 'DELETE' }),

  // Batches
  getBatches: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/batches${q}`);
  },
  getBatchById: (id: string) => request(`/batches/${id}`),
  createBatch: (data: any) => request('/batches', { method: 'POST', body: JSON.stringify(data) }),
  adjustBatchStock: (id: string, data: { newQuantity: number; remarks?: string; reason?: string }) =>
    request(`/batches/${id}/adjust`, { method: 'POST', body: JSON.stringify(data) }),
  deleteBatch: (id: string) => request(`/batches/${id}`, { method: 'DELETE' }),

  // Inventory
  getInventorySummary: () => request('/inventory/summary'),
  getInventoryItems: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/inventory/items${q}`);
  },
  getStockTransactions: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/inventory/transactions${q}`);
  },
  getStockMovements: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/inventory/movements${q}`);
  },
  recordSpoilage: (data: {
    batchId: string;
    quantity: number;
    reason: string;
    remarks?: string;
    disposalMethod?: string;
    witnessName?: string;
    notes?: string;
    actionType?: string;
  }) => request('/inventory/spoilage', { method: 'POST', body: JSON.stringify(data) }),

  // Purchases
  getPurchases: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/purchases${q}`);
  },
  getPurchaseById: (id: string) => request(`/purchases/${id}`),
  createPurchase: (data: any) => request('/purchases', { method: 'POST', body: JSON.stringify(data) }),
  receivePurchase: (id: string, data: { items: any[] }) =>
    request(`/purchases/${id}/receive`, { method: 'POST', body: JSON.stringify(data) }),
  deletePurchase: (id: string) => request(`/purchases/${id}`, { method: 'DELETE' }),

  // Dispensing
  getDispensings: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/dispensing${q}`);
  },
  getDispensingById: (id: string) => request(`/dispensing/${id}`),
  dispenseMedicine: (data: any) => request('/dispensing', { method: 'POST', body: JSON.stringify(data) }),
  deleteDispensing: (id: string) => request(`/dispensing/${id}`, { method: 'DELETE' }),

  // Returns
  getReturns: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/returns${q}`);
  },
  processReturn: (data: any) => request('/returns', { method: 'POST', body: JSON.stringify(data) }),
  deleteReturn: (id: string) => request(`/returns/${id}`, { method: 'DELETE' }),

  // Suppliers
  getSuppliers: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/suppliers${q}`);
  },
  createSupplier: (data: any) => request('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id: string, data: any) => request(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSupplier: (id: string) => request(`/suppliers/${id}`, { method: 'DELETE' }),

  // Patients & Prescriptions
  getPatients: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/patients${q}`);
  },
  getPatientById: (id: string) => request(`/patients/${id}`),
  createPatient: (data: any) => request('/patients', { method: 'POST', body: JSON.stringify(data) }),
  deletePatient: (id: string) => request(`/patients/${id}`, { method: 'DELETE' }),
  getPrescriptions: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/patients/prescriptions/all${q}`);
  },
  createPrescription: (patientId: string, data: any) =>
    request(`/patients/${patientId}/prescriptions`, { method: 'POST', body: JSON.stringify(data) }),
  deletePrescription: (rxId: string) => request(`/patients/prescriptions/${rxId}`, { method: 'DELETE' }),

  // Notifications & Emails
  getNotifications: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/notifications${q}`);
  },
  markNotificationRead: (id: string) => request(`/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'POST' }),
  scanSystemAlerts: () => request('/notifications/scan-alerts', { method: 'POST' }),
  getEmailLogs: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/notifications/email-logs${q}`);
  },
  clearEmailLogs: () => request('/notifications/email-logs', { method: 'DELETE' }),
  sendEmailAlerts: (data: { recipientEmail?: string }) =>
    request('/notifications/send-email-alerts', { method: 'POST', body: JSON.stringify(data) }),
  getExpiryMonitorConfig: () => request('/notifications/expiry-monitor/config'),
  updateExpiryMonitorConfig: (data: any) =>
    request('/notifications/expiry-monitor/config', { method: 'PUT', body: JSON.stringify(data) }),
  sendTestEmailAlert: (toEmail?: string) =>
    request('/notifications/expiry-monitor/test-email', { method: 'POST', body: JSON.stringify({ toEmail }) }),
  triggerExpiryEmailScan: () => request('/notifications/expiry-monitor/trigger-scan', { method: 'POST' }),

  // Reports
  getInventoryReport: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/reports/inventory${q}`);
  },
  getExpiryReport: () => request('/reports/expiry'),
  getPurchasesReport: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/reports/purchases${q}`);
  },
  getDispensingReport: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/reports/dispensing${q}`);
  },
  getMovementsReport: () => request('/reports/movements'),
  getReturnsReport: () => request('/reports/returns'),
  getReport: (reportType: string, params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/reports/${reportType}${q}`);
  },

  // Shifts & Cash Drawer Reconciliation
  getShifts: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/shifts${q}`);
  },
  getActiveShift: () => request('/shifts/active'),
  getShiftById: (id: string) => request(`/shifts/${id}`),
  getShiftZReport: (id: string) => request(`/shifts/${id}/z-report`),
  startShift: (data: { registerName?: string; shiftType?: string; openingFloat: number; notes?: string }) =>
    request('/shifts/start', { method: 'POST', body: JSON.stringify(data) }),
  addCashMovement: (shiftId: string, data: { type: string; amount: number; reason: string }) =>
    request(`/shifts/${shiftId}/movements`, { method: 'POST', body: JSON.stringify(data) }),
  closeShift: (shiftId: string, data: any) =>
    request(`/shifts/${shiftId}/close`, { method: 'POST', body: JSON.stringify(data) }),

  // Audit Logs
  getAuditLogs: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/audit${q}`);
  },
  clearAuditLogs: () => request('/audit', { method: 'DELETE' }),

  // Users & Roles
  getUsers: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/users${q}`);
  },
  createUser: (data: any) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) => request(`/users/${id}`, { method: 'DELETE' }),
  getRoles: () => request('/users/roles'),

  // Laboratory Reagent & Diagnostic Kit Management
  getReagentsSummary: () => request('/reagents/summary'),
  getReagents: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/reagents${q}`);
  },
  getReagentById: (id: string) => request(`/reagents/${id}`),
  createReagent: (data: any) => request('/reagents', { method: 'POST', body: JSON.stringify(data) }),
  updateReagent: (id: string, data: any) => request(`/reagents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteReagent: (id: string) => request(`/reagents/${id}`, { method: 'DELETE' }),
  consumeReagent: (data: any) => request('/reagents/consume', { method: 'POST', body: JSON.stringify(data) }),
  unsealReagentBatch: (data: { batchId: string; shelfLifeDays?: number }) =>
    request('/reagents/unseal-batch', { method: 'POST', body: JSON.stringify(data) }),
  updateReagentQC: (data: { batchId: string; qcStatus: string; qcNotes?: string }) =>
    request('/reagents/update-qc', { method: 'POST', body: JSON.stringify(data) }),
  getColdChain: () => request('/reagents/cold-chain'),
  logColdChainTemperature: (data: any) => request('/reagents/cold-chain', { method: 'POST', body: JSON.stringify(data) }),
  getReagentConsumptionLogs: (params?: Record<string, any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/reagents/consumption-logs${q}`);
  },
  deleteReagentConsumptionLog: (id: string) => request(`/reagents/consumption-logs/${id}`, { method: 'DELETE' }),
};
