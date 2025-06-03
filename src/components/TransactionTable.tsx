
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next'; // Added
import { useFinanceStore } from '../store/financeStore';
import { TransactionFilters } from './TransactionFilters';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from './ui/pagination';

interface DateFilter {
  start?: Date;
  end?: Date;
}

const ITEMS_PER_PAGE = 50;

export const TransactionTable: React.FC = () => {
  const { t } = useTranslation(); // Added
  const { transactions, categories, updateTransactionCategory } = useFinanceStore();
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<DateFilter>({});
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [incomeFilter, setIncomeFilter] = useState(false);
  const [expenseFilter, setExpenseFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Search filter
    if (searchText) {
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Category filter
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

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let aVal, bVal;
      if (sortBy === 'date') {
        aVal = new Date(a.date).getTime();
        bVal = new Date(b.date).getTime();
      } else {
        aVal = a.amount;
        bVal = b.amount;
      }
      
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  }, [transactions, searchText, categoryFilter, dateFilter, sortBy, sortOrder, incomeFilter, expenseFilter]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchText, categoryFilter, dateFilter, sortBy, sortOrder, incomeFilter, expenseFilter]);

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return t('transactionTable.noCategory');
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      // If translation exists for category.id, use it, otherwise format name
      const translatedName = t(`categories.${category.id}`);
      if (translatedName !== `categories.${category.id}`) {
        return translatedName;
      }
      return category.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return t('transactionTable.unknownCategory');
  };

  const getCategoryColor = (categoryId?: string) => {
    if (!categoryId) return '#6b7280';
    return categories.find(c => c.id === categoryId)?.color || '#6b7280';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{t('transactionTable.title')}</h2>
          
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Sort */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, order] = e.target.value.split('-');
                setSortBy(by as 'date' | 'amount');
                setSortOrder(order as 'asc' | 'desc');
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="date-desc">{t('transactionTable.sort.dateDesc')}</option>
              <option value="date-asc">{t('transactionTable.sort.dateAsc')}</option>
              <option value="amount-desc">{t('transactionTable.sort.amountDesc')}</option>
              <option value="amount-asc">{t('transactionTable.sort.amountAsc')}</option>
            </select>
          </div>
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
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('transactionTable.header.date')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('transactionTable.header.description')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('transactionTable.header.amount')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('transactionTable.header.category')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('transactionTable.header.bank')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedTransactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(transaction.date).toLocaleDateString('he-IL')}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                  {transaction.description}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                  transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.amount >= 0 ? '+' : ''}₪{Math.abs(transaction.amount).toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={transaction.category || ''}
                    onChange={(e) => updateTransactionCategory(transaction.id, e.target.value)}
                    className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    style={{ backgroundColor: getCategoryColor(transaction.category) + '20' }}
                  >
                    <option value="">{t('transactionTable.noCategory')}</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {getCategoryName(category.id)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 uppercase">
                  {transaction.bank}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {paginatedTransactions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">{t('transactionTable.noTransactionsFound')}</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center p-4 border-t border-gray-200">
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
      <div className="p-4 text-center border-t border-gray-200">
        <p className="text-sm text-gray-500">
          {t('transactionTable.showingInfo', { start: startIndex + 1, end: Math.min(endIndex, filteredTransactions.length), total: filteredTransactions.length.toLocaleString() })}
        </p>
      </div>
    </div>
  );
};
