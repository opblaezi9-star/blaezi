import { Router } from 'express';
import { db } from '../db';
import { authenticateJWT, requireRole, logAudit, AuthenticatedRequest } from '../auth';

const router = Router();

// GET /api/shifts - List shifts
router.get('/', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const { status, staffId, registerName, startDate, endDate } = req.query;

  let list = db.shifts.map(s => db.enrichShiftWithLiveFinancials(s));

  if (status) {
    list = list.filter(s => s.status.toLowerCase() === (status as string).toLowerCase());
  }

  if (staffId) {
    list = list.filter(s => s.staffId === staffId);
  }

  if (registerName) {
    list = list.filter(s => s.registerName === registerName);
  }

  if (startDate) {
    list = list.filter(s => s.startTime >= (startDate as string));
  }

  if (endDate) {
    list = list.filter(s => s.startTime <= (endDate as string));
  }

  // Sort by startTime descending
  list.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  res.json({
    success: true,
    count: list.length,
    shifts: list,
  });
});

// GET /api/shifts/active - Get currently open shift
router.get('/active', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const staffId = req.user?.id;
  const activeShift = db.getActiveShift(staffId);

  if (!activeShift) {
    return res.json({
      success: true,
      hasActiveShift: false,
      shift: null,
    });
  }

  res.json({
    success: true,
    hasActiveShift: true,
    shift: activeShift,
  });
});

// GET /api/shifts/:id - Get specific shift details
router.get('/:id', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const shift = db.shifts.find(s => s.id === id);

  if (!shift) {
    return res.status(404).json({
      success: false,
      message: 'Shift record not found.',
    });
  }

  const enriched = db.enrichShiftWithLiveFinancials(shift);

  res.json({
    success: true,
    shift: enriched,
  });
});

// GET /api/shifts/:id/z-report - Get printable Z-Report & Audit Summary
router.get('/:id/z-report', authenticateJWT, (req, res) => {
  const { id } = req.params;

  try {
    const zReport = db.getShiftZReport(id);
    res.json({
      success: true,
      zReport,
    });
  } catch (err: any) {
    res.status(404).json({
      success: false,
      message: err.message || 'Failed to generate Z-Report.',
    });
  }
});

// POST /api/shifts/start - Start a new shift (Admin & Pharmacist)
router.post('/start', authenticateJWT, requireRole(['Admin', 'Pharmacist']), (req: AuthenticatedRequest, res) => {
  const { registerName, shiftType, openingFloat, notes } = req.body;

  if (openingFloat === undefined || openingFloat === null || isNaN(Number(openingFloat)) || Number(openingFloat) < 0) {
    return res.status(400).json({
      success: false,
      message: 'A valid non-negative opening cash float (₹) is required to open the register.',
    });
  }

  try {
    const shift = db.startShift({
      staffId: req.user!.id,
      staffName: req.user!.fullName,
      staffRole: req.user!.role,
      registerName: registerName || 'Main OPD Pharmacy Counter 1',
      shiftType: shiftType || 'Morning',
      openingFloat: Number(openingFloat),
      notes: notes || '',
    });

    logAudit(
      req,
      'Create',
      'shifts',
      shift.id,
      `Opened new shift #${shift.shiftNumber} at ${shift.registerName} with ₹${shift.openingFloat.toFixed(2)} opening float.`
    );

    res.status(201).json({
      success: true,
      message: `Shift #${shift.shiftNumber} successfully opened. Register is active for dispensing.`,
      shift,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message || 'Failed to open shift.',
    });
  }
});

// POST /api/shifts/:id/movements - Record cash movement (Drop to safe, Float in, Petty Expense)
router.post('/:id/movements', authenticateJWT, requireRole(['Admin', 'Pharmacist']), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { type, amount, reason } = req.body;

  if (!type || !['Float In', 'Cash Drop (Safe)', 'Petty Expense', 'Correction'].includes(type)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid cash movement type. Must be Float In, Cash Drop (Safe), Petty Expense, or Correction.',
    });
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Amount must be greater than zero.',
    });
  }

  if (!reason || !reason.trim()) {
    return res.status(400).json({
      success: false,
      message: 'A clear reason/justification is required for all cash drawer movements.',
    });
  }

  try {
    const movement = db.addCashMovement(id, {
      type,
      amount: numAmount,
      reason: reason.trim(),
      performedBy: req.user!.id,
      performedByName: req.user!.fullName,
    });

    const shift = db.shifts.find(s => s.id === id);
    const enriched = shift ? db.enrichShiftWithLiveFinancials(shift) : null;

    logAudit(
      req,
      'Update',
      'cash_movements',
      movement.id,
      `Recorded cash movement '${type}' of ₹${numAmount.toFixed(2)} on Shift #${shift?.shiftNumber || id}. Reason: ${reason}`
    );

    res.status(201).json({
      success: true,
      message: `Cash movement '${type}' of ₹${numAmount.toFixed(2)} recorded successfully.`,
      movement,
      shift: enriched,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message || 'Failed to record cash movement.',
    });
  }
});

// POST /api/shifts/:id/close - Reconcile cash drawer and close shift
router.post('/:id/close', authenticateJWT, requireRole(['Admin', 'Pharmacist']), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const {
    actualCashCounted,
    denominations,
    relievingStaffId,
    relievingStaffName,
    handoverNotes,
    varianceReason,
    witnessPassword,
  } = req.body;

  if (actualCashCounted === undefined || actualCashCounted === null || isNaN(Number(actualCashCounted)) || Number(actualCashCounted) < 0) {
    return res.status(400).json({
      success: false,
      message: 'Actual counted cash amount (₹) is required for drawer reconciliation.',
    });
  }

  try {
    const shift = db.shifts.find(s => s.id === id);
    if (!shift) {
      return res.status(404).json({ success: false, message: 'Shift not found.' });
    }

    const preEnriched = db.enrichShiftWithLiveFinancials(shift);
    const count = Number(actualCashCounted);
    const variance = Number((count - preEnriched.expectedCash).toFixed(2));

    if (variance !== 0 && (!varianceReason || !varianceReason.trim())) {
      return res.status(400).json({
        success: false,
        message: `Cash discrepancy detected (Variance: ₹${variance > 0 ? '+' : ''}${variance.toFixed(2)}). A mandatory explanation note is required for the audit trail.`,
      });
    }

    // Optional witness verification lookup
    let verifiedBy = undefined;
    let verifiedByName = undefined;

    if (relievingStaffId) {
      const relievingUser = db.users.find(u => u.id === relievingStaffId);
      if (relievingUser) {
        verifiedBy = relievingUser.id;
        verifiedByName = relievingUser.fullName;
      }
    }

    const closedShift = db.closeShift(id, {
      actualCashCounted: count,
      denominations: Array.isArray(denominations) ? denominations : [],
      relievingStaffId,
      relievingStaffName: relievingStaffName || verifiedByName,
      handoverNotes: handoverNotes || '',
      varianceReason: varianceReason || (variance === 0 ? 'Exact match' : 'Unspecified discrepancy'),
      verifiedBy,
      verifiedByName,
    });

    logAudit(
      req,
      'Update',
      'shifts',
      closedShift.id,
      `Closed and reconciled Shift #${closedShift.shiftNumber}. Expected Cash: ₹${closedShift.expectedCash.toFixed(2)}, Actual Counted: ₹${count.toFixed(2)}, Variance: ₹${variance.toFixed(2)}. Relieved by: ${closedShift.relievingStaffName || 'N/A'}`
    );

    res.json({
      success: true,
      message: `Shift #${closedShift.shiftNumber} successfully closed and reconciled. Official Z-Report generated.`,
      shift: closedShift,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message || 'Failed to close shift.',
    });
  }
});

export default router;
