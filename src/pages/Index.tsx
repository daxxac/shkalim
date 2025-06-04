
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { AnalyticsPanel } from '@/components/AnalyticsPanel';
import { UploadZone } from '@/components/UploadZone';
import { UpcomingCharges } from '@/components/UpcomingCharges';
import { DataManagement } from '@/components/DataManagement';
import { AboutPage } from '@/components/AboutPage';
import { SecurityModal } from '@/components/SecurityModal';
import { useFinanceStore } from '@/store/financeStore';
import '@/i18n/config';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { isDataLocked, showSecurityModal } = useFinanceStore();

  // Show security modal when data is locked
  useEffect(() => {
    if (isDataLocked) {
      console.log('Data is locked, showing security modal');
    }
  }, [isDataLocked]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AnalyticsPanel />;
      case 'upload':
        return <UploadZone />;
      case 'upcomingCharges':
        return <UpcomingCharges />;
      case 'about':
        return <AboutPage />;
      case 'settings':
        return <DataManagement />;
      default:
        return <AnalyticsPanel />;
    }
  };

  return (
    <>
      <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
        {renderTabContent()}
      </DashboardLayout>
      {showSecurityModal && <SecurityModal />}
    </>
  );
};

export default Index;
