import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { EmailLog } from '../types';
import {
  Mail,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  RefreshCw,
  Settings,
  Eye,
  EyeOff,
  Copy,
  Check,
  ShieldAlert,
  Calendar,
  Layers,
  Sparkles,
  X,
  Server,
  Lock,
  Globe,
  Sliders,
  CheckSquare,
  Square,
  Trash2,
  ExternalLink,
  FlaskConical,
  Pill,
  Inbox,
  KeyRound,
  Info,
} from 'lucide-react';

interface FullEmailConfig {
  thresholdDays: number;
  adminEmails: string[];
  autoScanIntervalMs: number;
  lastRunTimestamp: string | null;
  isRunning: boolean;
  enableMedicineAlerts: boolean;
  enableReagentAlerts: boolean;
  enableOpenVialAlerts: boolean;
  enableStockoutAlerts: boolean;
  smtpEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  senderName: string;
  senderEmail: string;
}

export const EmailLogsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'logs' | 'settings'>('settings');
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Monitor & SMTP Config
  const [config, setConfig] = useState<FullEmailConfig>({
    thresholdDays: 30,
    adminEmails: ['opblaezi9@gmail.com'],
    autoScanIntervalMs: 60000,
    lastRunTimestamp: null,
    isRunning: true,
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
  });

  const [emailInput, setEmailInput] = useState('opblaezi9@gmail.com');
  const [showPassword, setShowPassword] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isTriggeringScan, setIsTriggeringScan] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getEmailLogs({ search });
      if (res.success) {
        setLogs(res.emailLogs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await api.getExpiryMonitorConfig();
      if (res.success && res.config) {
        setConfig(res.config);
        setEmailInput(res.config.adminEmails ? res.config.adminEmails.join(', ') : 'opblaezi9@gmail.com');
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchConfig();
  }, [search]);

  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setIsSavingConfig(true);
      setActionNotice(null);
      const emails = emailInput
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const payload = {
        ...config,
        adminEmails: emails.length > 0 ? emails : ['opblaezi9@gmail.com'],
      };

      const res = await api.updateExpiryMonitorConfig(payload);
      if (res.success) {
        setConfig(res.config);
        setActionNotice({
          type: 'success',
          message: 'Alert & SMTP Settings saved successfully. Changes take effect immediately.',
        });
      }
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err.message || 'Failed to update settings.',
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleTriggerScan = async () => {
    try {
      setIsTriggeringScan(true);
      setActionNotice(null);
      const res = await api.triggerExpiryEmailScan();
      if (res.success) {
        setActionNotice({
          type: 'success',
          message: res.message || 'Automated expiry scan completed successfully.',
        });
        await fetchLogs();
        await fetchConfig();
      }
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err.message || 'Failed to trigger automated scan.',
      });
    } finally {
      setIsTriggeringScan(false);
    }
  };

  const handleSendTestEmail = async () => {
    try {
      setIsSendingTestEmail(true);
      setActionNotice(null);
      const firstEmail = emailInput.split(',')[0]?.trim() || config.adminEmails[0] || 'opblaezi9@gmail.com';
      const res = await api.sendTestEmailAlert(firstEmail);
      if (res.success) {
        setActionNotice({
          type: 'success',
          message: res.message || `Test email dispatched successfully to ${firstEmail}!`,
        });
        await fetchLogs();
      } else {
        setActionNotice({
          type: 'error',
          message: res.message || 'Failed to send test email. Check SMTP settings.',
        });
      }
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err.message || 'Failed to dispatch test email.',
      });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const handleClearLogs = async () => {
    try {
      setIsClearing(true);
      const res = await api.clearEmailLogs();
      if (res.success) {
        setLogs([]);
        setShowClearConfirm(false);
        setActionNotice({ type: 'success', message: 'All outbound email logs have been cleared successfully.' });
      } else {
        setActionNotice({ type: 'error', message: res.message || 'Failed to clear email logs.' });
      }
    } catch (err: any) {
      console.error(err);
      setActionNotice({ type: 'error', message: err.message || 'Failed to clear email logs.' });
    } finally {
      setIsClearing(false);
    }
  };

  const handlePresetSelect = (preset: 'gmail' | 'outlook' | 'custom') => {
    if (preset === 'gmail') {
      setConfig(prev => ({
        ...prev,
        smtpHost: 'smtp.gmail.com',
        smtpPort: 465,
        smtpSecure: true,
        smtpEnabled: true,
        senderName: prev.senderName || 'SmartPharmacy Alerts',
      }));
    } else if (preset === 'outlook') {
      setConfig(prev => ({
        ...prev,
        smtpHost: 'smtp.office365.com',
        smtpPort: 587,
        smtpSecure: false,
        smtpEnabled: true,
        senderName: prev.senderName || 'SmartPharmacy Alerts',
      }));
    } else {
      setConfig(prev => ({
        ...prev,
        smtpHost: '',
        smtpPort: 587,
        smtpSecure: false,
      }));
    }
  };

  const handleCopyBody = (body: string, id: string) => {
    navigator.clipboard.writeText(body);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredLogs = logs.filter(log => {
    if (typeFilter !== 'all' && log.type !== typeFilter) return false;
    if (statusFilter !== 'all' && log.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Email Alerts & Outbound Dispatcher
            </h1>
            <span
              className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border flex items-center gap-1.5 ${
                config.smtpEnabled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  config.smtpEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              ></span>
              {config.smtpEnabled ? 'Real SMTP Outbound Active' : 'Simulation Mode (Dev Logs)'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated alerts for near-expiry medicines, expiring reagent lots, open-vial stability, and low stock warnings.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab(activeTab === 'settings' ? 'logs' : 'settings')}
            id="btn-toggle-email-settings"
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-indigo-200'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            {activeTab === 'settings' ? 'View Logs' : 'Alert & SMTP Settings'}
          </button>

          <button
            onClick={handleTriggerScan}
            disabled={isTriggeringScan}
            id="btn-trigger-expiry-scan"
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs shadow-rose-200"
          >
            <Send className="w-3.5 h-3.5" />
            {isTriggeringScan ? 'Scanning...' : 'Run Automated Expiry Scan Now'}
          </button>

          <button
            onClick={fetchLogs}
            id="btn-refresh-email-logs"
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            title="Refresh Logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs Navigation - High Visibility */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 bg-slate-200/80 rounded-2xl border border-slate-300/60">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('settings')}
            id="tab-btn-smtp-settings"
            className={`flex-1 sm:flex-none py-2.5 px-5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-600/30'
                : 'bg-white/80 text-slate-700 hover:bg-white hover:text-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>1. Alert Policy & Real SMTP Settings</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${activeTab === 'settings' ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-700'}`}>
              Config
            </span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            id="tab-btn-outbound-logs"
            className={`flex-1 sm:flex-none py-2.5 px-5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'logs'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-600/30'
                : 'bg-white/80 text-slate-700 hover:bg-white hover:text-slate-900'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>2. Outbound Dispatch History Logs</span>
            <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${activeTab === 'logs' ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-700'}`}>
              {logs.length}
            </span>
          </button>
        </div>

        <div className="text-[11px] text-slate-600 px-3 hidden lg:block">
          {activeTab === 'settings' ? 'Configure recipients, Gmail App Password, and test delivery' : 'View full clinical reports sent for expiring medicines & reagents'}
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border animate-in fade-in ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : actionNotice.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-sky-50 border-sky-200 text-sky-900'
          }`}
        >
          <div className="flex items-center gap-2.5 font-medium">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : actionNotice.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-sky-600 shrink-0" />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* VIEW 1: SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Main Settings Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Automated Alert & Outbound Mail Policy</h2>
                  <p className="text-xs text-slate-500">
                    Configure alert thresholds, target recipient mailboxes, and real SMTP dispatch credentials.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={isSendingTestEmail}
                  id="btn-send-test-email"
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  <Send className="w-3.5 h-3.5 text-indigo-600" />
                  {isSendingTestEmail ? 'Sending Test...' : 'Send Test Email'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveConfig()}
                  disabled={isSavingConfig}
                  id="btn-save-email-settings"
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  {isSavingConfig ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-6">
              {/* SECTION 1: ALERT RECIPIENTS & TIMING */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-8 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-indigo-600" />
                      Alert Recipient Emails (Comma separated)
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">e.g. opblaezi9@gmail.com, labhead@clinic.com</span>
                  </label>
                  <input
                    type="text"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    id="input-alert-recipients"
                    placeholder="opblaezi9@gmail.com, doctor@clinic.org, lab@clinic.org"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:border-indigo-600 transition-colors"
                  />
                </div>

                <div className="md:col-span-4 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      Expiry Threshold (Days)
                    </span>
                    <span className="text-xs font-bold text-indigo-600">{config.thresholdDays} Days</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={config.thresholdDays}
                    onChange={e => setConfig({ ...config, thresholdDays: Number(e.target.value) })}
                    id="input-threshold-days"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:bg-white focus:border-indigo-600 transition-colors"
                  />
                </div>
              </div>

              {/* SECTION 2: SCOPE CHECKBOXES */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  Target Inventory Scopes Included in Automated Scans
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                  <label className="flex items-center gap-2.5 p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-indigo-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={config.enableMedicineAlerts}
                      onChange={e => setConfig({ ...config, enableMedicineAlerts: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-slate-800 flex items-center gap-1">
                        <Pill className="w-3 h-3 text-indigo-500" /> Medicines
                      </div>
                      <span className="text-[10px] text-slate-500">Expiring drug batches</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-indigo-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={config.enableReagentAlerts}
                      onChange={e => setConfig({ ...config, enableReagentAlerts: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-slate-800 flex items-center gap-1">
                        <FlaskConical className="w-3 h-3 text-emerald-500" /> Lab Reagents
                      </div>
                      <span className="text-[10px] text-slate-500">Reagents & assay lots</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-indigo-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={config.enableOpenVialAlerts}
                      onChange={e => setConfig({ ...config, enableOpenVialAlerts: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-slate-800 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-500" /> Open-Vials
                      </div>
                      <span className="text-[10px] text-slate-500">On-board stability</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-indigo-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={config.enableStockoutAlerts}
                      onChange={e => setConfig({ ...config, enableStockoutAlerts: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-slate-800 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3 text-rose-500" /> Low Stock
                      </div>
                      <span className="text-[10px] text-slate-500">Depleted inventory</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* SECTION 3: OUTBOUND SMTP CONFIGURATION */}
              <div className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-slate-900 text-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-bold text-white">Real SMTP Mail Relay Configuration</h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Connect your Gmail or clinic email server to receive actual emails in your real inbox.
                    </p>
                  </div>

                  {/* Mode Toggle */}
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-xl border border-slate-700 cursor-pointer text-xs font-semibold text-slate-200">
                      <input
                        type="checkbox"
                        checked={config.smtpEnabled}
                        onChange={e => setConfig({ ...config, smtpEnabled: e.target.checked })}
                        id="toggle-smtp-enabled"
                        className="rounded border-slate-600 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span>{config.smtpEnabled ? 'Real Outbound SMTP (Active)' : 'Simulation / Dev Mode'}</span>
                    </label>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-semibold">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect('gmail')}
                    className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 font-medium transition-colors"
                  >
                    Gmail (smtp.gmail.com:465)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect('outlook')}
                    className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 font-medium transition-colors"
                  >
                    Outlook / Office 365
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect('custom')}
                    className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 font-medium transition-colors"
                  >
                    Custom SMTP
                  </button>
                </div>

                {/* SMTP Credentials Form */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-1">
                  <div className="md:col-span-5 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">SMTP Host Server</label>
                    <input
                      type="text"
                      value={config.smtpHost}
                      onChange={e => setConfig({ ...config, smtpHost: e.target.value })}
                      id="input-smtp-host"
                      placeholder="smtp.gmail.com"
                      className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-400"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Port</label>
                    <input
                      type="number"
                      value={config.smtpPort}
                      onChange={e => setConfig({ ...config, smtpPort: Number(e.target.value) })}
                      id="input-smtp-port"
                      placeholder="465"
                      className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-400"
                    />
                  </div>

                  <div className="md:col-span-4 flex items-end">
                    <label className="flex items-center gap-2 p-2 bg-slate-800/80 border border-slate-700 rounded-lg cursor-pointer w-full text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={config.smtpSecure}
                        onChange={e => setConfig({ ...config, smtpSecure: e.target.checked })}
                        className="rounded border-slate-600 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span>Use SSL/TLS (Port 465)</span>
                    </label>
                  </div>

                  <div className="md:col-span-6 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">
                      Sender Email / Username
                    </label>
                    <input
                      type="text"
                      value={config.smtpUser}
                      onChange={e => setConfig({ ...config, smtpUser: e.target.value })}
                      id="input-smtp-user"
                      placeholder="your.email@gmail.com"
                      className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-400"
                    />
                  </div>

                  <div className="md:col-span-6 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                      <span>SMTP / App Password</span>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                      >
                        {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={config.smtpPass}
                      onChange={e => setConfig({ ...config, smtpPass: e.target.value })}
                      id="input-smtp-pass"
                      placeholder="16-character Google App Password"
                      className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-400"
                    />
                  </div>

                  <div className="md:col-span-6 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Sender Display Name</label>
                    <input
                      type="text"
                      value={config.senderName}
                      onChange={e => setConfig({ ...config, senderName: e.target.value })}
                      placeholder="SmartPharmacy Clinical Alerts"
                      className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-400"
                    />
                  </div>
                </div>

                {/* Helpful Guide for Gmail */}
                <div className="p-3 bg-slate-800/60 border border-slate-700/80 rounded-xl text-[11px] text-slate-300 space-y-1">
                  <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" /> How to use with your Google / Gmail Account:
                  </div>
                  <ol className="list-decimal list-inside space-y-0.5 text-slate-300">
                    <li>
                      Ensure 2-Step Verification is active on your Google Account (myaccount.google.com).
                    </li>
                    <li>
                      Generate a 16-letter password under <strong>Security → App Passwords</strong>.
                    </li>
                    <li>
                      Paste your Gmail address in <strong>Username</strong> and the 16-letter App Password in <strong>Password</strong> above.
                    </li>
                  </ol>
                </div>
              </div>

              {/* Bottom Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={isSendingTestEmail}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  {isSendingTestEmail ? 'Sending Test...' : 'Send Live Test Email'}
                </button>
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  {isSavingConfig ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW 2: LOGS EXPLORER */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by recipient, subject, or content..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:border-indigo-600 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
              <div className="flex items-center gap-1.5">
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-hidden"
                >
                  <option value="all">All Alert Types</option>
                  <option value="Expiry Alert">Expiry Alerts</option>
                  <option value="Low Stock Alert">Low Stock Alerts</option>
                  <option value="System">System & Tests</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-hidden"
                >
                  <option value="all">All Statuses</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Pending">Pending / Simulated</option>
                </select>
              </div>

              {logs.length > 0 && (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  id="btn-clear-email-logs"
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-xl transition-all shadow-2xs cursor-pointer"
                  title="Clear all recorded outbound dispatch logs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Logs
                </button>
              )}

            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Dispatched At</th>
                    <th className="py-3 px-4">Recipient(s)</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                          <span>Loading outbound email history...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Mail className="w-8 h-8 text-slate-300" />
                          <p className="text-slate-600 font-semibold">No outbound email logs found</p>
                          <p className="text-xs text-slate-400">
                            Click "Run Automated Expiry Scan Now" or "Send Test Email" to generate alerts.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map(log => {
                      const isExpiry = log.type === 'Expiry Alert';
                      const isReagent = log.subject.toLowerCase().includes('reagent') || log.body.toLowerCase().includes('reagent');
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                            {new Date(log.sentAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800">{log.to}</span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border ${
                                isReagent
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : isExpiry
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              }`}
                            >
                              {isReagent ? 'Reagent Alert' : log.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate font-semibold text-slate-900">
                            {log.subject}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                                log.status === 'Delivered'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              {log.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedLog(log)}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-bold text-xs flex items-center gap-1"
                                title="View Email Report"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View</span>
                              </button>
                              <button
                                onClick={() => handleCopyBody(log.body, log.id)}
                                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Copy Email Text"
                              >
                                {copiedId === log.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW EMAIL DETAILS */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedLog.subject}</h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span>To: <strong>{selectedLog.to}</strong></span>
                    <span>•</span>
                    <span>{new Date(selectedLog.sentAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyBody(selectedLog.body, 'modal')}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 shadow-xs"
                >
                  {copiedId === 'modal' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === 'modal' ? 'Copied' : 'Copy Text'}
                </button>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto bg-slate-950 font-mono text-xs text-emerald-400 leading-relaxed space-y-2 whitespace-pre-wrap select-text">
              {selectedLog.body}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="text-[11px] text-slate-500">
                Log ID: <span className="font-mono text-slate-700">{selectedLog.id}</span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CLEAR LOGS CONFIRMATION */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                Clear All Outbound Email Logs?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-6">
                Are you sure you want to permanently purge all <strong>{logs.length}</strong> recorded outbound dispatch records? This action removes historic delivery receipts and cannot be undone.
              </p>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isClearing}
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="btn-confirm-clear-logs"
                  disabled={isClearing}
                  onClick={handleClearLogs}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl transition-colors shadow-xs disabled:opacity-50"
                >
                  {isClearing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Clearing Logs...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Yes, Clear All Logs</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

