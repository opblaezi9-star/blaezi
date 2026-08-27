import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { MedicinesView } from './views/MedicinesView';
import { ReagentsView } from './views/ReagentsView';
import { CategoriesView } from './views/CategoriesView';
import { BatchesView } from './views/BatchesView';
import { InventoryView } from './views/InventoryView';
import { PurchasesView } from './views/PurchasesView';
import { DispensingView } from './views/DispensingView';
import { ReturnsView } from './views/ReturnsView';
import { SuppliersView } from './views/SuppliersView';
import { PatientsView } from './views/PatientsView';
import { ReportsView } from './views/ReportsView';
import { AuditLogsView } from './views/AuditLogsView';
import { UsersView } from './views/UsersView';
import { EmailLogsView } from './views/EmailLogsView';

import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { NotificationDrawer } from './components/NotificationDrawer';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { SecuritySettingsModal } from './components/SecuritySettingsModal';
import { WorkstationLockModal } from './components/WorkstationLockModal';

const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading, isWorkstationLocked, unlockWorkstation } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-black text-2xl animate-pulse">
          +
        </div>
        <div className="text-sm font-semibold text-slate-300">
          Initializing SmartPharmacy Hospital Gateway...
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <LoginView />;
  }

  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView onNavigate={setCurrentView} />;
      case 'medicines':
        return <MedicinesView />;
      case 'reagents':
        return <ReagentsView />;
      case 'categories':
        return <CategoriesView />;
      case 'batches':
        return <BatchesView />;
      case 'inventory':
        return <InventoryView />;
      case 'purchases':
        return <PurchasesView />;
      case 'dispensing':
        return <DispensingView />;
      case 'returns':
        return <ReturnsView />;
      case 'suppliers':
        return <SuppliersView />;
      case 'patients':
        return <PatientsView />;
      case 'reports':
        return <ReportsView />;
      case 'audit':
        return <AuditLogsView />;
      case 'users':
        return <UsersView />;
      case 'email-logs':
        return <EmailLogsView />;
      default:
        return <DashboardView onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* Persistent App Sidebar */}
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        onOpenSecurity={() => setIsSecurityOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <Navbar
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenNotifications={() => setIsNotificationOpen(true)}
          onOpenSecurity={() => setIsSecurityOpen(true)}
          onNavigate={setCurrentView}
        />

        {/* Dynamic Route Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderActiveView()}
        </main>
      </div>

      {/* Security & Password Settings Modal */}
      <SecuritySettingsModal
        isOpen={isSecurityOpen}
        onClose={() => setIsSecurityOpen(false)}
      />

      {/* Global Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onNavigate={(view) => {
          setIsNotificationOpen(false);
          setCurrentView(view);
        }}
      />

      {/* Omnibox Search Modal (Ctrl+K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectResult={(view) => {
          setIsSearchOpen(false);
          setCurrentView(view);
        }}
      />

      {/* Interactive & Inactivity Workstation Screen Lock (Ctrl+L) */}
      <WorkstationLockModal
        isLocked={isWorkstationLocked}
        onUnlock={unlockWorkstation}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
