import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../store/financeStore';
import { UploadZone } from '../components/UploadZone';
import { DashboardTransactions } from '../components/DashboardTransactions';
import { AnalyticsPanel } from '../components/AnalyticsPanel';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { DateFilter } from './Index'; // Assuming DateFilter is exported from Index or moved to types

export const UploadPage = () => {
  const { t } = useTranslation();
  const { transactions, categories } = useFinanceStore(); // Only take what's needed

  // State for filters, similar to DashboardPage, if needed for DashboardTransactions
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<DateFilter>({});
  const [incomeFilter, setIncomeFilter] = useState(false);
  const [expenseFilter, setExpenseFilter] = useState(false);
  const [dateFilterType, setDateFilterType] = useState<'transaction' | 'charge'>('transaction');

  useEffect(() => {
    // Initialize date filter if necessary, e.g., to show all transactions by default
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    // Or set to empty if you want to show all transactions initially for the upload page context
    setDateFilter({ start: startOfMonth, end: endOfMonth }); 
  }, []);

  return (
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
                dateFilter={dateFilter} // Pass the dateFilter
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
  );
};

export default UploadPage;