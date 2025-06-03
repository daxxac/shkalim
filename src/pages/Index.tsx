
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../store/financeStore';
import { DashboardLayout } from '../components/DashboardLayout';
import { UploadZone } from '../components/UploadZone';
import { TransactionTable } from '../components/TransactionTable';
import { AnalyticsPanel } from '../components/AnalyticsPanel';
import { SecurityModal } from '../components/SecurityModal';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Shield, AlertTriangle, TrendingUp, TrendingDown, Wallet, Calendar } from 'lucide-react';
import { toast } from '../hooks/use-toast';

const Index = () => {
  const { t } = useTranslation();
  const { 
    isLocked, 
    unlock, 
    panicMode, 
    transactions, 
    isInitialized,
    initializeStore 
  } = useFinanceStore();
  
  const [showSecurity, setShowSecurity] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  const handleUnlock = async () => {
    try {
      await unlock(masterPassword);
      setMasterPassword('');
      toast({
        title: t('auth.welcome'),
        description: t('auth.systemUnlocked'),
      });
    } catch (error) {
      toast({
        title: t('auth.error'),
        description: t('auth.wrongPassword'),
        variant: "destructive",
      });
    }
  };

  const handlePanicMode = () => {
    if (window.confirm(t('auth.confirmDelete'))) {
      panicMode();
      toast({
        title: t('auth.dataDeleted'),
        description: t('auth.allDataDeleted'),
        variant: "destructive",
      });
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
        <div className="premium-card p-8 max-w-md w-full mx-4">
          <div className="absolute top-4 right-4">
            <LanguageSwitcher />
          </div>
          
          <div className="text-center mb-6">
            <Shield className="mx-auto h-12 w-12 text-primary mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">SHKALIM</h1>
            <p className="text-xs text-muted-foreground mb-4">by daxxac</p>
            <p className="text-muted-foreground">{t('auth.enterPassword')}</p>
          </div>
          
          <div className="space-y-4">
            <input
              type="password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              placeholder={t('auth.masterPassword')}
              className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-right bg-background text-foreground"
              onKeyPress={(e) => e.key === 'Enter' && handleUnlock()}
            />
            
            <Button 
              onClick={handleUnlock} 
              className="w-full premium-button"
              disabled={!masterPassword}
            >
              {t('auth.unlock')}
            </Button>
            
            <div className="flex justify-between items-center pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setShowSecurity(true)}
                className="text-sm"
              >
                {t('auth.securitySettings')}
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                onClick={handlePanicMode}
                className="flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                {t('auth.panicMode')}
              </Button>
            </div>
          </div>
        </div>
        
        {showSecurity && (
          <SecurityModal
            onClose={() => setShowSecurity(false)}
            onPasswordSet={(password) => {
              setShowSecurity(false);
            }}
          />
        )}
      </div>
    );
  }

  // Calculate dashboard stats
  const totalBalance = transactions.reduce((sum, t) => sum + t.amount, 0);
  const currentMonth = new Date();
  const monthTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate.getMonth() === currentMonth.getMonth() && 
           transactionDate.getFullYear() === currentMonth.getFullYear();
  });
  
  const monthIncome = monthTransactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
    
  const monthExpenses = Math.abs(monthTransactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + t.amount, 0));

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Balance */}
            <Card className="premium-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('dashboard.currentBalance')}
                </CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₪{totalBalance.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {totalBalance >= 0 ? t('categories.salary') : t('navigation.expenses')}
                </p>
              </CardContent>
            </Card>

            {/* Total Transactions */}
            <Card className="premium-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('dashboard.totalTransactions')}
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {transactions.length.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('transactions.recentTransactions')}
                </p>
              </CardContent>
            </Card>

            {/* Month Income */}
            <Card className="premium-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('navigation.income')}
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ₪{monthIncome.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('dashboard.monthTransactions')}
                </p>
              </CardContent>
            </Card>

            {/* Month Expenses */}
            <Card className="premium-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('navigation.expenses')}
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  ₪{monthExpenses.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('dashboard.monthTransactions')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Transactions */}
            <div className="lg:col-span-2">
              <Card className="premium-card">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-foreground">
                    {t('transactions.recentTransactions')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TransactionTable limit={10} />
                </CardContent>
              </Card>
            </div>

            {/* Analytics Panel */}
            <div>
              <AnalyticsPanel />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="space-y-6">
          <UploadZone />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TransactionTable />
            </div>
            <div>
              <AnalyticsPanel />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'autoSync' && (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {t('autoSync.title')}
          </h2>
          <p className="text-muted-foreground">
            {t('autoSync.description')}
          </p>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {t('settings.title')}
          </h2>
          <p className="text-muted-foreground">
            {t('settings.data')}
          </p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Index;
