
import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../store/financeStore';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { TransactionFilters } from './TransactionFilters';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from './ui/pagination';

interface DateFilter {
  start?: Date;
  end?: Date;
}

interface DashboardTransactionsProps {
  limit?: number;
}

const ITEMS_PER_PAGE = 20;

export const DashboardTransactions: React.FC<DashboardTransactionsProps> = ({ limit }) => {
  const { t } = useTranslation();
  const { transactions, categories, updateTransactionCategory } = useFinanceStore();
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<DateFilter>({});
  const [incomeFilter, setIncomeFilter] = useState(false);
  const [expenseFilter, setExpenseFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

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

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    if (searchText) {
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (categoryFilter) {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }

    // Income/Expense filter
    if (incomeFilter && !expenseFilter) {
      filtered = filtered.filter(t => t.amount > 0);
    } else if (expenseFilter && !incomeFilter) {
      filtered = filtered.filter(t => t.amount < 0);
    }

    // Date filter
    if (dateFilter.start || dateFilter.end) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.date);
        const startDate = dateFilter.start;
        const endDate = dateFilter.end;

        if (startDate && endDate) {
          return transactionDate >= startDate && transactionDate <= endDate;
        } else if (startDate) {
          return transactionDate >= startDate;
        } else if (endDate) {
          return transactionDate <= endDate;
        }
        return true;
      });
    }

    return filtered;
  }, [transactions, searchText, categoryFilter, dateFilter, incomeFilter, expenseFilter]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedTransactions = limit ? filteredTransactions.slice(0, limit) : filteredTransactions.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, categoryFilter, dateFilter, incomeFilter, expenseFilter]);

  // Calculate stats for filtered period
  const stats = useMemo(() => {
    let periodTransactions = transactions;

    // Apply date filter
    if (dateFilter.start || dateFilter.end) {
      periodTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        const startDate = dateFilter.start;
        const endDate = dateFilter.end;

        if (startDate && endDate) {
          return transactionDate >= startDate && transactionDate <= endDate;
        } else if (startDate) {
          return transactionDate >= startDate;
        } else if (endDate) {
          return transactionDate <= endDate;
        }
        return true;
      });
    }

    const income = periodTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = Math.abs(periodTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0));

    const totalDebit = expenses;

    // Get latest balance from Discount Bank
    const discountTransactions = transactions
      .filter(t => t.bank?.toLowerCase() === 'discount')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const currentBalance = discountTransactions.length > 0 ? discountTransactions[0].balance || 0 : 0;

    return { income, expenses, totalDebit, currentBalance };
  }, [transactions, dateFilter]);

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return t('categories.other');
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      const translatedName = t(`categories.${category.id}`);
      // If translation is the same as the key, show the original name without kebab-case
      if (translatedName === `categories.${category.id}`) {
        return category.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
      return translatedName;
    }
    return t('categories.other');
  };

  const getCategoryColor = (categoryId?: string) => {
    if (!categoryId) return '#6b7280';
    return categories.find(c => c.id === categoryId)?.color || '#6b7280';
  };

  return (
    <div className="space-y-6">
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
            <div className="text-sm text-muted-foreground mb-2">Доходы за период</div>
            <div className="text-2xl font-bold text-green-600">
              ₪{stats.income.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground mb-2">Расходы за период</div>
            <div className="text-2xl font-bold text-red-600">
              ₪{stats.expenses.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground mb-2">Списано в текущем месяце</div>
            <div className="text-2xl font-bold text-orange-600">
              ₪{stats.totalDebit.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
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
      />

      {/* Transactions List */}
      <div className="space-y-3">
        {paginatedTransactions.map((transaction) => (
          <Card key={transaction.id} className="premium-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-sm text-muted-foreground">
                      {new Date(transaction.date).toLocaleDateString()}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {transaction.bank?.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="font-medium text-foreground truncate mb-2">
                    {transaction.description}
                  </div>
                  <Select
                    value={transaction.category || 'none'}
                    onValueChange={(value) => updateTransactionCategory(transaction.id, value === 'none' ? undefined : value)}
                  >
                    <SelectTrigger 
                      className="w-full sm:w-48 h-8 text-xs"
                      style={{ 
                        backgroundColor: getCategoryColor(transaction.category) + '20',
                        borderColor: getCategoryColor(transaction.category) + '40'
                      }}
                    >
                      <SelectValue placeholder={getCategoryName()} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('categories.other')}</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {getCategoryName(category.id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="text-right ml-4">
                  <div className={`text-lg font-bold ${
                    transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.amount >= 0 ? '+' : ''}₪{Math.abs(transaction.amount).toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                  </div>
                  {transaction.balance !== undefined && (
                    <div className="text-sm text-muted-foreground">
                      {t('transactions.balance')}: ₪{transaction.balance.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {paginatedTransactions.length === 0 && (
        <Card className="premium-card">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">{t('transactions.noTransactions')}</p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {!limit && totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setCurrentPage(pageNum)}
                      isActive={currentPage === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Results info */}
      {!limit && (
        <Card className="premium-card">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Показано {startIndex + 1}-{Math.min(endIndex, filteredTransactions.length)} из {filteredTransactions.length.toLocaleString()} транзакций
            </p>
          </CardContent>
        </Card>
      )}

      {limit && transactions.length > limit && (
        <Card className="premium-card">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {t('transactions.showing')} {Math.min(limit, paginatedTransactions.length)} {t('transactions.of')} {transactions.length.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
