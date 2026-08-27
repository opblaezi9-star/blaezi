import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AppNotification } from '../types';
import {
  X,
  Bell,
  AlertTriangle,
  Clock,
  ShoppingCart,
  Syringe,
  Info,
  CheckCheck,
  Send,
  RefreshCw,
} from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshUnread?: () => void;
  onNavigate?: (view: any) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onRefreshUnread,
  onNavigate,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(false);
  const [sendingEmail, setSendingEmail] = useState<boolean>(false);
  const [emailStatusMsg, setEmailStatusMsg] = useState<string | null>(null);

  const fetchNotifs = async () => {
    try {
      setLoading(true);
      const res = await api.getNotifications();
      if (res.success) {
        setNotifications(res.notifications);
        if (onRefreshUnread) onRefreshUnread();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifs();
      setEmailStatusMsg(null);
    }
  }, [isOpen]);

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
      if (onRefreshUnread) onRefreshUnread();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      if (onRefreshUnread) onRefreshUnread();
    } catch (e) {
      console.error(e);
    }
  };

  const handleScanSystem = async () => {
    try {
      setLoading(true);
      const res = await api.scanSystemAlerts();
      if (res.success) {
        await fetchNotifs();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailAlerts = async () => {
    try {
      setSendingEmail(true);
      setEmailStatusMsg(null);
      const res = await api.sendEmailAlerts({
        recipientEmail: 'pharmacy-duty@hospital.org, admin@hospital.org',
      });
      if (res.success) {
        setEmailStatusMsg(res.message);
      }
    } catch (e: any) {
      setEmailStatusMsg(e.message || 'Failed to send email alerts.');
    } finally {
      setSendingEmail(false);
    }
  };

  if (!isOpen) return null;

  const filtered = notifications.filter(n => {
    if (filterType === 'all') return true;
    if (filterType === 'unread') return !n.isRead;
    return n.notificationType === filterType;
  });

  const getIcon = (type: AppNotification['notificationType']) => {
    switch (type) {
      case 'Low Stock':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'Expiry':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'Purchase':
        return <ShoppingCart className="w-4 h-4 text-sky-600" />;
      case 'Dispensing':
        return <Syringe className="w-4 h-4 text-emerald-600" />;
      default:
        return <Info className="w-4 h-4 text-slate-600" />;
    }
  };

  const getPriorityBadge = (p: AppNotification['priority']) => {
    switch (p) {
      case 'Critical':
        return (
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-50 text-rose-700">
            Critical
          </span>
        );
      case 'High':
        return (
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-50 text-amber-700">
            High
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-600">
            Info
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-900 text-white rounded-md">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">System Alerts & Notifications</h2>
              <p className="text-xs text-slate-500">Live inventory and clinical event notices</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Filter Bar */}
        <div className="p-3 border-b border-slate-100 bg-white flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1 overflow-x-auto">
            {['all', 'unread', 'Low Stock', 'Expiry', 'Purchase'].map(ft => (
              <button
                key={ft}
                onClick={() => setFilterType(ft)}
                className={`px-2.5 py-1 rounded capitalize font-medium transition-all ${
                  filterType === ft
                    ? 'bg-slate-900 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                }`}
              >
                {ft}
              </button>
            ))}
          </div>

          <button
            onClick={handleMarkAllRead}
            className="text-[11px] text-sky-600 hover:underline flex items-center gap-1 shrink-0 font-medium"
            title="Mark all as read"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark All Read
          </button>
        </div>

        {/* Scan & Send Buttons */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <button
            onClick={handleScanSystem}
            disabled={loading}
            className="flex-1 py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium rounded-md text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Scan Thresholds
          </button>
          <button
            onClick={handleSendEmailAlerts}
            disabled={sendingEmail}
            className="flex-1 py-1.5 px-3 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-md text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            {sendingEmail ? 'Dispatching...' : 'Email Digest'}
          </button>
        </div>

        {emailStatusMsg && (
          <div className="mx-3 mt-2 p-2 bg-sky-50 border border-sky-200 text-sky-800 text-xs rounded-md">
            {emailStatusMsg}
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-slate-100">
          {loading && notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Loading pharmacy notifications...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No notifications in this filter category.
            </div>
          ) : (
            filtered.map(item => (
              <div
                key={item.id}
                className={`pt-2.5 pb-2.5 px-2 rounded-lg transition-colors flex gap-3 ${
                  item.isRead ? 'bg-white opacity-80' : 'bg-slate-50 border border-slate-200/80'
                }`}
              >
                <div className="mt-0.5 shrink-0">{getIcon(item.notificationType)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {item.title}
                    </span>
                    {getPriorityBadge(item.priority)}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-snug">{item.message}</p>
                  <div className="flex items-center justify-between mt-2 pt-1 text-[10px] text-slate-400 border-t border-slate-100">
                    <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {!item.isRead && (
                      <button
                        onClick={() => handleMarkRead(item.id)}
                        className="text-sky-600 font-semibold hover:underline"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
