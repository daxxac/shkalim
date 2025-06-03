
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../store/financeStore';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Button } from './ui/button';
import { 
  TrendingUp, 
  Upload, 
  Settings, 
  LogOut, 
  Shield,
  Download,
  Menu,
  X,
  Sync
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const { lock, transactions } = useFinanceStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const exportData = () => {
    const dataStr = JSON.stringify({ transactions }, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `financial-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-white shadow-lg"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Language Switcher - top right */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-600 to-green-600 p-2 rounded-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{t('app.title')}</h1>
                <p className="text-sm text-gray-500">{t('app.subtitle')}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            <NavItem icon={TrendingUp} label={t('navigation.dashboard')} active />
            <NavItem icon={Upload} label={t('navigation.upload')} />
            <NavItem icon={Sync} label={t('navigation.autoSync')} />
            <NavItem icon={Settings} label={t('navigation.settings')} />
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={exportData}
            >
              <Download className="h-4 w-4 mr-2" />
              {t('navigation.exportData')}
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={lock}
            >
              <Shield className="h-4 w-4 mr-2" />
              {t('navigation.lockSystem')}
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={lock}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t('navigation.logout')}
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        <main className="p-6">
          {children}
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

interface NavItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
      active
        ? 'bg-blue-50 text-blue-700 border border-blue-200'
        : 'text-gray-700 hover:bg-gray-100'
    }`}
  >
    <Icon className="h-5 w-5" />
    <span className="font-medium">{label}</span>
  </button>
);
