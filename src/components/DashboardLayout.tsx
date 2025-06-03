
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../store/financeStore';
import { Button } from './ui/button';
import { LanguageSwitcher } from './LanguageSwitcher';
import { 
  BarChart3, 
  Upload, 
  Settings, 
  RotateCcw, 
  Download, 
  Lock,
  LogOut 
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
}) => {
  const { t } = useTranslation();
  const { lock } = useFinanceStore();

  const handleExportData = () => {
    // TODO: Implement data export
    console.log('Export data');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <img 
                src="/lovable-uploads/bed35785-60af-499c-bacb-f1cfc5f58db7.png" 
                alt="SHKALIM Logo" 
                className="h-8 w-8 mr-3"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  SHKALIM
                </h1>
                <p className="text-xs text-gray-400">by daxxac</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportData}
              >
                <Download className="h-4 w-4 mr-2" />
                {t('navigation.exportData')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={lock}
              >
                <Lock className="h-4 w-4 mr-2" />
                {t('navigation.lockSystem')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {t('navigation.dashboard')}
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              {t('navigation.upload')}
            </TabsTrigger>
            <TabsTrigger value="autoSync" className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              {t('navigation.autoSync')}
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {t('navigation.settings')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-6">
            {children}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};
