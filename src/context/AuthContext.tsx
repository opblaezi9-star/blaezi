import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api, setToken, removeToken } from '../services/api';

interface ClinicSettings {
  clinicName: string;
  clinicSecurityMode: boolean;
  sessionTimeoutMinutes: number;
  requireStrongPasswords: boolean;
  lockoutThreshold: number;
  lockoutDurationMinutes: number;
  encryptionStandard: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isDoctor: boolean;
  isPharmacist: boolean;
  isNurse: boolean;
  isLaboratorian: boolean;
  sessionNotice: string | null;
  clearSessionNotice: () => void;
  clinicSettings: ClinicSettings | null;
  isWorkstationLocked: boolean;
  lockWorkstation: () => void;
  unlockWorkstation: () => void;
  privacyMode: boolean;
  togglePrivacyMode: () => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  quickLogin: (username: string, pass: string) => Promise<void>;
  changePassword: (currentPass: string, newPass: string) => Promise<void>;
  updateSecuritySettings: (settings: Partial<ClinicSettings>) => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
  canAccess: (feature: string) => boolean;
  resetDatabase: () => Promise<void>;
  clearDatabase: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem('smart_pharmacy_token'));
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isWorkstationLocked, setIsWorkstationLocked] = useState<boolean>(false);
  const [privacyMode, setPrivacyMode] = useState<boolean>(() => {
    return localStorage.getItem('smart_pharmacy_privacy_mode') === 'true';
  });

  const togglePrivacyMode = () => {
    setPrivacyMode((prev) => {
      const next = !prev;
      localStorage.setItem('smart_pharmacy_privacy_mode', String(next));
      return next;
    });
  };

  const lockWorkstation = () => {
    setIsWorkstationLocked(true);
  };

  const unlockWorkstation = () => {
    setIsWorkstationLocked(false);
  };

  useEffect(() => {
    async function initAuth() {
      const storedToken = localStorage.getItem('smart_pharmacy_token');
      if (storedToken) {
        try {
          const res = await api.getMe();
          if (res.success && res.user) {
            setUser(res.user);
            if (res.settings) setClinicSettings(res.settings);
          } else {
            removeToken();
            setTokenState(null);
            setUser(null);
          }
        } catch (e) {
          removeToken();
          setTokenState(null);
          setUser(null);
        }
      } else {
        setUser(null);
        // Fetch public settings (e.g. clinic security mode)
        try {
          const res = await api.getSecuritySettings();
          if (res.success && res.settings) setClinicSettings(res.settings);
        } catch (e) {
          // ignore
        }
      }
      setIsLoading(false);
    }
    initAuth();
  }, []);

  // Global Auth Expiration Event Listener
  useEffect(() => {
    const handleAuthExpired = (e: Event) => {
      const customEvent = e as CustomEvent;
      const message = customEvent.detail?.message || 'Your session has expired. Please log in again to continue.';
      removeToken();
      setTokenState(null);
      setUser(null);
      setSessionNotice(message);
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => {
      window.removeEventListener('auth:expired', handleAuthExpired);
    };
  }, []);

  // Inactivity Auto-Lock for Healthcare / Clinical Security Compliance (Safe for iframes)
  useEffect(() => {
    if (!user) return;

    const timeoutMinutes = clinicSettings?.sessionTimeoutMinutes || 15;
    const timeoutMs = timeoutMinutes * 60 * 1000;
    let lockTimer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(lockTimer);
      // Only set auto-lock if not already locked
      if (!isWorkstationLocked) {
        lockTimer = setTimeout(() => {
          setIsWorkstationLocked(true);
        }, timeoutMs);
      }
    };

    // Keyboard shortcut Ctrl+L / Cmd+L for instantaneous workstation locking
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setIsWorkstationLocked(true);
      }
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer, { passive: true }));
    window.addEventListener('keydown', handleKeyDown);
    resetTimer();

    return () => {
      clearTimeout(lockTimer);
      events.forEach(event => window.removeEventListener(event, resetTimer));
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [user, clinicSettings?.sessionTimeoutMinutes, isWorkstationLocked]);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    setSessionNotice(null);
    try {
      const res = await api.login({ username, password });
      if (res.success && res.token) {
        setToken(res.token);
        setTokenState(res.token);
        setUser(res.user);
        setIsWorkstationLocked(false);
        // Refresh settings
        const meRes = await api.getMe().catch(() => null);
        if (meRes?.settings) setClinicSettings(meRes.settings);
      } else {
        throw new Error(res.message || 'Login failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = async (username: string, pass: string) => {
    await login(username, pass);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // ignore
    } finally {
      removeToken();
      setTokenState(null);
      setUser(null);
    }
  };

  const clearSessionNotice = () => {
    setSessionNotice(null);
  };

  const changePassword = async (currentPass: string, newPass: string) => {
    const res = await api.changePassword({ currentPassword: currentPass, newPassword: newPass });
    if (!res.success) {
      throw new Error(res.message || 'Failed to update password.');
    }
  };

  const updateSecuritySettings = async (settings: Partial<ClinicSettings>) => {
    const res = await api.updateSecuritySettings(settings);
    if (res.success && res.settings) {
      setClinicSettings(res.settings);
    } else {
      throw new Error(res.message || 'Failed to update security settings.');
    }
  };

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      if (res.success && res.user) {
        setUser(res.user);
        if (res.settings) setClinicSettings(res.settings);
      }
    } catch (e) {
      // ignore
    }
  };

  const resetDatabase = async () => {
    await api.resetDemoData();
    await refreshUser();
  };

  const clearDatabase = async () => {
    await api.clearDemoData();
    await refreshUser();
  };

  const hasRole = (_roles: UserRole[]): boolean => {
    if (!user) return false;
    return true; // Full access for all roles
  };

  const canAccess = (_feature: string): boolean => {
    if (!user) return false;
    return true; // Full access to all tabs and features for all users
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        isAdmin: !!user,
        isDoctor: false,
        isPharmacist: !!user,
        isNurse: !!user,
        isLaboratorian: !!user,
        sessionNotice,
        clearSessionNotice,
        clinicSettings,
        isWorkstationLocked,
        lockWorkstation,
        unlockWorkstation,
        privacyMode,
        togglePrivacyMode,
        login,
        logout,
        quickLogin,
        changePassword,
        updateSecuritySettings,
        hasRole,
        canAccess,
        resetDatabase,
        clearDatabase,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
