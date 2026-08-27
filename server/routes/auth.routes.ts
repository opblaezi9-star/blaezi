import { Router } from 'express';
import { db } from '../db';
import {
  comparePassword,
  generateToken,
  authenticateJWT,
  logAudit,
  AuthenticatedRequest,
  checkLoginLockout,
  recordFailedLogin,
  recordSuccessfulLogin,
  validatePasswordStrength,
  hashPassword,
} from '../auth';

const router = Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide both username and password.',
    });
  }

  // Check brute force lockout
  const lockoutStatus = checkLoginLockout(username);
  if (lockoutStatus.isLocked) {
    logAudit(
      req,
      'System',
      'users',
      username,
      `Blocked login attempt on locked account "${username}" from IP ${ip}`
    );
    return res.status(429).json({
      success: false,
      message: `Account is temporarily locked due to excessive failed attempts. Please retry in ${lockoutStatus.minutesRemaining} minute(s) or contact your administrator.`,
      isLocked: true,
      minutesRemaining: lockoutStatus.minutesRemaining,
    });
  }

  const user = db.users.find(
    u => u.username.toLowerCase() === username.trim().toLowerCase()
  );

  if (!user) {
    const failResult = recordFailedLogin(username, ip, db.settings.lockoutThreshold, db.settings.lockoutDurationMinutes);
    logAudit(
      req,
      'System',
      'users',
      username,
      `Failed login attempt for non-existent username "${username}" from IP ${ip}`
    );
    return res.status(401).json({
      success: false,
      message: failResult.isLocked
        ? `Too many failed attempts. Account locked for ${db.settings.lockoutDurationMinutes} minutes.`
        : 'Invalid username or password.',
      attemptsLeft: failResult.attemptsLeft,
    });
  }

  // Check if account is active
  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Account is deactivated. Please contact your hospital administrator.',
    });
  }

  // Compare password using bcrypt
  const isMatch = comparePassword(password, user.passwordHash);
  if (!isMatch) {
    const failResult = recordFailedLogin(username, ip, db.settings.lockoutThreshold, db.settings.lockoutDurationMinutes);
    logAudit(
      req,
      'System',
      'users',
      user.id,
      `Failed password attempt for user ${user.username} (${user.role}) from IP ${ip}`
    );
    return res.status(401).json({
      success: false,
      message: failResult.isLocked
        ? `Too many failed attempts. Account locked for ${db.settings.lockoutDurationMinutes} minutes.`
        : 'Invalid username or password.',
      attemptsLeft: failResult.attemptsLeft,
    });
  }

  // Reset failed login counter on success
  recordSuccessfulLogin(username);

  // Generate JWT token
  const token = generateToken(user);

  // Log successful login in audit trail
  logAudit(
    req,
    'Login',
    'users',
    user.id,
    `User ${user.fullName} (${user.role}) logged in securely from IP ${ip}.`,
    { id: user.id, name: user.fullName, role: user.role }
  );

  const { passwordHash, ...safeUser } = user;

  res.json({
    success: true,
    message: 'Login successful.',
    token,
    user: safeUser,
  });
});

// GET /api/auth/me
router.get('/me', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { passwordHash, ...safeUser } = user;
  res.json({
    success: true,
    user: safeUser,
    settings: db.settings,
  });
});

// POST /api/auth/change-password
router.post('/change-password', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Current password and new password are required.',
    });
  }

  // Verify current password
  const isMatch = comparePassword(currentPassword, user.passwordHash);
  if (!isMatch) {
    return res.status(400).json({
      success: false,
      message: 'Current password provided is incorrect.',
    });
  }

  // Check password strength if policy is enabled
  if (db.settings.requireStrongPasswords) {
    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return res.status(400).json({
        success: false,
        message: strength.message || 'Password does not meet security requirements.',
      });
    }
  }

  // Hash new password with 12-round bcrypt
  const targetUser = db.users.find(u => u.id === user.id);
  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  targetUser.passwordHash = hashPassword(newPassword);
  targetUser.updatedAt = new Date().toISOString();
  db.save();

  logAudit(
    req,
    'Update',
    'users',
    user.id,
    `User ${user.fullName} (${user.role}) changed their account password securely.`
  );

  res.json({
    success: true,
    message: 'Password updated successfully.',
  });
});

// GET /api/auth/security-settings
router.get('/security-settings', (_req, res) => {
  res.json({
    success: true,
    settings: db.settings,
  });
});

// PUT /api/auth/security-settings
router.put('/security-settings', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const {
    clinicName,
    clinicSecurityMode,
    sessionTimeoutMinutes,
    requireStrongPasswords,
    lockoutThreshold,
    lockoutDurationMinutes,
  } = req.body;

  const updated = db.updateSettings({
    ...(clinicName ? { clinicName: clinicName.trim() } : {}),
    ...(clinicSecurityMode !== undefined ? { clinicSecurityMode: Boolean(clinicSecurityMode) } : {}),
    ...(sessionTimeoutMinutes ? { sessionTimeoutMinutes: Number(sessionTimeoutMinutes) } : {}),
    ...(requireStrongPasswords !== undefined ? { requireStrongPasswords: Boolean(requireStrongPasswords) } : {}),
    ...(lockoutThreshold ? { lockoutThreshold: Number(lockoutThreshold) } : {}),
    ...(lockoutDurationMinutes ? { lockoutDurationMinutes: Number(lockoutDurationMinutes) } : {}),
  });

  logAudit(
    req,
    'System',
    'system_settings',
    'security_policy',
    `Administrator updated clinic security configuration. Clinic Security Mode: ${updated.clinicSecurityMode ? 'ENABLED' : 'DISABLED'}, Lockout Threshold: ${updated.lockoutThreshold}`
  );

  res.json({
    success: true,
    message: 'Clinic security settings saved.',
    settings: updated,
  });
});

// POST /api/auth/logout
router.post('/logout', authenticateJWT, (req: AuthenticatedRequest, res) => {
  if (req.user) {
    logAudit(
      req,
      'Logout',
      'users',
      req.user.id,
      `User ${req.user.fullName} logged out.`
    );
  }
  res.json({
    success: true,
    message: 'Logged out successfully.',
  });
});

// GET /api/auth/demo-users
router.get('/demo-users', (_req, res) => {
  // If Clinic Security Mode is active, do not expose quick demo accounts
  if (db.settings.clinicSecurityMode) {
    return res.json({
      success: true,
      clinicSecurityMode: true,
      clinicName: db.settings.clinicName,
      demoAccounts: [],
    });
  }

  const demoAccounts = [
    {
      username: 'admin',
      role: 'Admin',
      name: 'Dr. Arthur Vance',
      title: 'Chief Medical Administrator',
      defaultPass: 'admin123',
      badge: '👑 Admin (Full Access)',
    },
    {
      username: 'pharmacist',
      role: 'Pharmacist',
      name: 'Elena Rostova, PharmD',
      title: 'Head Pharmacist',
      defaultPass: 'pharm123',
      badge: '💊 Pharmacist (Ops & Dispensing)',
    },
    {
      username: 'doctor',
      role: 'Doctor',
      name: 'Dr. Gregory House, MD',
      title: 'Attending Physician',
      defaultPass: 'doc123',
      badge: '👨⚕️ Doctor (Clinical & Prescribing)',
    },
  ];

  res.json({
    success: true,
    clinicSecurityMode: false,
    clinicName: db.settings.clinicName,
    demoAccounts,
  });
});

// POST /api/auth/reset-demo
router.post('/reset-demo', authenticateJWT, (req: AuthenticatedRequest, res) => {
  db.resetToSeed();
  if (req.user) {
    logAudit(
      req,
      'System',
      'system',
      'reset',
      `Database reset to initial hospital seed data by ${req.user.fullName}.`
    );
  }
  res.json({
    success: true,
    message: 'Database has been reset to original factory demo data.',
  });
});

export default router;
