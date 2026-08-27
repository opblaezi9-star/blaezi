import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db, User, AuditLog } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'smart-pharmacy-hospital-secret-key-2026';
const JWT_EXPIRES_IN = '7d';

// In-memory brute force protection tracking
interface LoginAttemptRecord {
  failedCount: number;
  lockedUntil: number | null;
  lastAttempt: number;
}

const loginAttempts = new Map<string, LoginAttemptRecord>();

export function checkLoginLockout(identifier: string): { isLocked: boolean; minutesRemaining: number } {
  const record = loginAttempts.get(identifier.toLowerCase());
  if (!record || !record.lockedUntil) {
    return { isLocked: false, minutesRemaining: 0 };
  }

  const now = Date.now();
  if (now >= record.lockedUntil) {
    // Lockout expired, reset
    loginAttempts.delete(identifier.toLowerCase());
    return { isLocked: false, minutesRemaining: 0 };
  }

  const minutesRemaining = Math.ceil((record.lockedUntil - now) / (60 * 1000));
  return { isLocked: true, minutesRemaining };
}

export function recordFailedLogin(identifier: string, ip: string, threshold = 5, lockMinutes = 15): { isLocked: boolean; attemptsLeft: number } {
  const key = identifier.toLowerCase();
  const record = loginAttempts.get(key) || { failedCount: 0, lockedUntil: null, lastAttempt: Date.now() };
  
  record.failedCount += 1;
  record.lastAttempt = Date.now();

  if (record.failedCount >= threshold) {
    record.lockedUntil = Date.now() + lockMinutes * 60 * 1000;
    loginAttempts.set(key, record);
    return { isLocked: true, attemptsLeft: 0 };
  }

  loginAttempts.set(key, record);
  return { isLocked: false, attemptsLeft: threshold - record.failedCount };
}

export function recordSuccessfulLogin(identifier: string) {
  loginAttempts.delete(identifier.toLowerCase());
}

export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) {
    return { valid: false, message: 'Password must contain both letters and numbers for healthcare data security.' };
  }
  return { valid: true };
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function comparePassword(password: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(password, hash);
  } catch (e) {
    return false;
  }
}

export function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(12); // High-security 12 rounds
  return bcrypt.hashSync(password, salt);
}

export function logAudit(
  req: Request | AuthenticatedRequest,
  action: AuditLog['action'],
  table: string,
  recordId: string,
  description: string,
  userOverride?: { id: string; name: string; role: string }
) {
  const user = (req as AuthenticatedRequest).user;
  const userId = userOverride?.id || user?.id || 'system';
  const userName = userOverride?.name || user?.fullName || 'System';
  const role = userOverride?.role || user?.role || 'System';
  const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  const auditEntry: AuditLog = {
    id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    userId,
    userName,
    role,
    action,
    table,
    recordId,
    description,
    ipAddress,
    timestamp: new Date().toISOString(),
  };

  db.auditLogs.unshift(auditEntry);
  db.save();
  return auditEntry;
}

export function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Authorization token missing. Please log in to proceed.',
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authorization header format. Expected Bearer <token>.',
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = db.users.find(u => u.id === decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User account does not exist.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact your system administrator.',
      });
    }

    req.user = user;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session has expired. Please log in again.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid or corrupt authentication token.',
    });
  }
}

export type UserRole = 'Admin' | 'Pharmacist' | 'Doctor' | 'Nurse' | 'Laboratorian';

export function requireRole(..._roles: (UserRole | UserRole[])[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    // Every authenticated user can access and modify all data across all tabs
    next();
  };
}
