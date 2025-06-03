import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../store/financeStore';
import { DashboardLayout } from '../components/DashboardLayout';
import { UploadZone } from '../components/UploadZone';
import { DashboardTransactions } from '../components/DashboardTransactions';
import { TransactionFilters } from '../components/TransactionFilters';
import { AnalyticsPanel } from '../components/AnalyticsPanel';
import { SecurityModal } from '../components/SecurityModal';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { DataManagement } from '../components/DataManagement';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Shield, AlertTriangle, TrendingUp, TrendingDown, Wallet, Calendar, DollarSign, CreditCard } from 'lucide-react';
import { toast } from '../hooks/use-toast';
import { UpcomingCharges } from '../components/UpcomingCharges';
export interface DateFilter {
  start?: Date;
  end?: Date;
}

const Index = () => {
  const { t } = useTranslation();
  const {
    isLocked,
    unlock,
    panicMode,
    transactions,
    upcomingCharges,
    isInitialized,
    initializeStore,
    categories // Add categories from store
  } = useFinanceStore();

  const [showSecurity, setShowSecurity] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');

  // Filter states
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<DateFilter>({});
  const [incomeFilter, setIncomeFilter] = useState(false);
  const [expenseFilter, setExpenseFilter] = useState(false);
  const [dateFilterType, setDateFilterType] = useState<'transaction' | 'charge'>('transaction');

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  // Set default date filter to current month
  useEffect(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setDateFilter({
      start: startOfMonth,
      end: endOfMonth
    });
  }, []);

  // Reset to first page when filters change (DashboardTransactions will handle its own pagination reset)
  // useEffect(() => {
  //   // This might be needed if pagination is also moved here or managed globally
  // }, [searchText, categoryFilter, dateFilter, incomeFilter, expenseFilter, dateFilterType]);

  // Calculate stats for filtered period
  const stats = useMemo(() => {
    const startDate = dateFilter.start;
    const endDate = dateFilter.end;

    // Income & Expenses based on the selected dateFilterType (transaction or charge date)
    let transactionsForPeriodBasedOnFilterType = transactions;
    if (startDate || endDate) {
      transactionsForPeriodBasedOnFilterType = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        const chargeDate = t.chargeDate ? new Date(t.chargeDate) : transactionDate;
        const filterDate = dateFilterType === 'charge' ? chargeDate : transactionDate;
        if (startDate && endDate) return filterDate >= startDate && filterDate <= endDate;
        if (startDate) return filterDate >= startDate;
        if (endDate) return filterDate <= endDate;
        return true;
      });
    }
    const incomeBasedOnFilterType = transactionsForPeriodBasedOnFilterType
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    const expensesBasedOnFilterType = Math.abs(transactionsForPeriodBasedOnFilterType
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0));

    // Actually spent in period (based on transaction.date)
    let spentTransactions = transactions;
    if (startDate || endDate) {
      spentTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        if (startDate && endDate) return transactionDate >= startDate && transactionDate <= endDate;
        if (startDate) return transactionDate >= startDate;
        if (endDate) return transactionDate <= endDate;
        return true;
      });
    }
    const actuallySpentInPeriod = Math.abs(spentTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0));


    // Get latest balance from Discount Bank
    const discountBankTransactions = transactions
      .filter(t => t.bank?.toLowerCase() === 'discount')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const currentBalance = discountBankTransactions.length > 0 ? discountBankTransactions[0].balance || 0 : 0;

    return {
      income: incomeBasedOnFilterType, // For "Доходы за период"
      expenses: expensesBasedOnFilterType, // General expenses based on filter type (can be used or replaced)
      actuallySpentInPeriod,      // For "Расходы (по дате операции)"
      currentBalance
    };
  }, [transactions, dateFilter, dateFilterType]);



  // Scheduled to charge in period (based on transaction.chargeDate)
  const filteredCharges = useMemo(() => {
    let filtered = upcomingCharges;

    if (searchText) {
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (categoryFilter && categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }

    return filtered;
  }, [upcomingCharges, searchText, categoryFilter]);
  const scheduledToChargeInPeriod = filteredCharges.reduce((sum, charge) => sum + Math.abs(charge.amount), 0);

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
            mode="set" // Указываем режим для установки нового пароля
            onClose={() => setShowSecurity(false)}
            onSuccess={() => {
              toast({
                title: t('auth.passwordSetTitle'),
                description: t('auth.passwordSetDescription'),
              });
              // setShowSecurity(false); // onClose уже это делает
            }}
          />
        )}
      </div>
    );
  }

  // Calculate dashboard stats - only use regular transactions, not upcoming charges
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

  const currentWeek = new Date();
  const weekStart = new Date(currentWeek.setDate(currentWeek.getDate() - currentWeek.getDay()));
  const weekTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate >= weekStart;
  });

  const weekExpenses = Math.abs(weekTransactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + t.amount, 0));

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              {t('dashboard.welcome')}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t('dashboard.subtitle')}
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="premium-card">
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground mb-2">Текущий баланс (Дисконт)</div>
                <div className="text-2xl font-bold text-foreground">
                  ₪{stats.currentBalance.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>

            <Card className="premium-card">
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground mb-2">{t('dashboard.stats.incomeForPeriod')}</div>
                <div className="text-2xl font-bold text-green-600">
                  ₪{stats.income.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>

            <Card className="premium-card">
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground mb-2">{t('dashboard.stats.spentByTransactionDate')}</div>
                <div className="text-2xl font-bold text-red-600">
                  ₪{stats.actuallySpentInPeriod.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>

            <Card className="premium-card">
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground mb-2">{t('dashboard.stats.chargedByChargeDate')}</div>
                <div className="text-2xl font-bold text-orange-600">
                  ₪{scheduledToChargeInPeriod.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <TransactionFilters
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            searchText={searchText}
            onSearchTextChange={setSearchText}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            categories={categories}
            incomeFilter={incomeFilter}
            expenseFilter={expenseFilter}
            onIncomeFilterChange={setIncomeFilter}
            onExpenseFilterChange={setExpenseFilter}
            dateFilterType={dateFilterType}
            onDateFilterTypeChange={setDateFilterType}
          />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Transactions */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="premium-card">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {t('transactions.recentTransactions')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DashboardTransactions
                    // limit={8} // Removed limit to enable full pagination
                    searchText={searchText}
                    categoryFilter={categoryFilter}
                    dateFilter={dateFilter}
                    incomeFilter={incomeFilter}
                    expenseFilter={expenseFilter}
                    dateFilterType={dateFilterType}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Analytics Panel */}
            <div className="space-y-6">
              <AnalyticsPanel />

              {/* Quick Stats Card */}
              <Card className="premium-card">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">{t('dashboard.quickStats')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('dashboard.weekExpenses')}</span>
                    <span className="font-semibold text-red-600">
                      ₪{weekExpenses.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('dashboard.avgTransaction')}</span>
                    <span className="font-semibold">
                      ₪{transactions.length > 0 ? (totalBalance / transactions.length).toLocaleString('he-IL', { minimumFractionDigits: 2 }) : '0.00'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="space-y-6">
          <UploadZone />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="premium-card">
                <CardHeader>
                  <CardTitle>{t('transactions.allTransactions')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <DashboardTransactions
                    searchText={searchText}
                    categoryFilter={categoryFilter}
                    dateFilter={dateFilter}
                    incomeFilter={incomeFilter}
                    expenseFilter={expenseFilter}
                    dateFilterType={dateFilterType}
                  />
                </CardContent>
              </Card>
            </div>
            <div>
              <AnalyticsPanel />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'upcomingCharges' && (
        <UpcomingCharges />
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">{t('settings.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <DataManagement />
            </CardContent>
          </Card>
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
    </DashboardLayout>
  );
};

export default Index;
