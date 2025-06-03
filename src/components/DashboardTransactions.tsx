
import type { DateFilter } from '../pages/Index'; // Temporary import
import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../store/financeStore';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from './ui/pagination';


interface DashboardTransactionsProps {
  limit?: number;
  searchText: string;
  categoryFilter: string;
  dateFilter: DateFilter; 
  incomeFilter: boolean;
  expenseFilter: boolean;
  dateFilterType: 'transaction' | 'charge';
}

const ITEMS_PER_PAGE = 20;

export const DashboardTransactions: React.FC<DashboardTransactionsProps> = ({
  limit,
  searchText,
  categoryFilter,
  dateFilter,
  incomeFilter,
  expenseFilter,
  dateFilterType,
}) => {
  const { t } = useTranslation();
  const { transactions, categories, updateTransactionCategory } = useFinanceStore();

  const [currentPage, setCurrentPage] = useState(1);


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
        const chargeDate = t.chargeDate ? new Date(t.chargeDate) : transactionDate;
        
        const filterDate = dateFilterType === 'charge' ? chargeDate : transactionDate;
        const startDate = dateFilter.start;
        const endDate = dateFilter.end;

        if (startDate && endDate) {
          return filterDate >= startDate && filterDate <= endDate;
        } else if (startDate) {
          return filterDate >= startDate;
        } else if (endDate) {
          return filterDate <= endDate;
        }
        return true;
      });
    }

    return filtered;
  }, [transactions, searchText, categoryFilter, dateFilter, incomeFilter, expenseFilter, dateFilterType]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  
  // Apply limit only after pagination calculation
  const paginatedTransactions = limit ? 
    filteredTransactions.slice(0, limit) : 
    filteredTransactions.slice(startIndex, endIndex);


  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, categoryFilter, dateFilter, incomeFilter, expenseFilter, dateFilterType]);

  // const stats = useMemo(() => { ... }); // Removed stats calculation

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
      {/* Stats Cards Removed */}
      {/* Filters Removed */}

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
                      {transaction.chargeDate && transaction.chargeDate !== transaction.date && (
                        <span className="ml-2 text-orange-600">
                          ({t('transactions.chargeDateInfo', { date: new Date(transaction.chargeDate).toLocaleDateString() })})
                        </span>
                      )}
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

      {/* Pagination - only show if no limit is applied */}
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
              {t('transactions.showing')} {startIndex + 1}-{Math.min(endIndex, filteredTransactions.length)} {t('transactions.of')} {filteredTransactions.length.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      )}

      {limit && (
        <Card className="premium-card">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {t('transactions.showing')} {Math.min(limit, filteredTransactions.length)} {t('transactions.of')} {filteredTransactions.length.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
