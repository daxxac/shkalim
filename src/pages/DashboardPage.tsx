import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../store/financeStore';
import { TransactionFilters } from '../components/TransactionFilters';
import { AnalyticsPanel } from '../components/AnalyticsPanel';
import { DashboardTransactions } from '../components/DashboardTransactions';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Calendar } from 'lucide-react';
import { DateFilter } from './Index'; // Assuming DateFilter is exported from Index or moved to types

export const DashboardPage = () => {
  const { t } = useTranslation();
  const { transactions, categories, upcomingCharges } = useFinanceStore();

  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<DateFilter>({});
  const [incomeFilter, setIncomeFilter] = useState(false);
  const [expenseFilter, setExpenseFilter] = useState(false);
  const [dateFilterType, setDateFilterType] = useState<'transaction' | 'charge'>('transaction');

  useEffect(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setDateFilter({ start: startOfMonth, end: endOfMonth });
  }, []);

  const stats = useMemo(() => {
    const startDate = dateFilter.start;
    const endDate = dateFilter.end;
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

    const discountBankTransactions = transactions
      .filter(t => t.bank?.toLowerCase() === 'discount')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const currentBalance = discountBankTransactions.length > 0 ? discountBankTransactions[0].balance || 0 : 0;
    
    return {
      income: incomeBasedOnFilterType,
      expenses: expensesBasedOnFilterType,
      actuallySpentInPeriod,
      currentBalance
    };
  }, [transactions, dateFilter, dateFilterType]);

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
    // Note: Date filter for upcoming charges might need separate logic if it's different from transaction date filter
    return filtered;
  }, [upcomingCharges, searchText, categoryFilter]);

  const scheduledToChargeInPeriod = filteredCharges.reduce((sum, charge) => sum + Math.abs(charge.amount), 0);

  // Quick stats calculations
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
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          {t('dashboard.welcome')}
        </h1>
        <p className="text-lg text-muted-foreground">
          {t('dashboard.subtitle')}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground mb-2">{t('dashboard.stats.currentBalanceDiscount')}</div>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
        <div className="space-y-6">
          <AnalyticsPanel />
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
  );
};

export default DashboardPage;