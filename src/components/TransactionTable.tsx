
import React, { useState, useMemo } from 'react';
import { useFinanceStore } from '../store/financeStore';
import { TransactionFilters } from './TransactionFilters';

interface DateFilter {
  start?: Date;
  end?: Date;
}

export const TransactionTable: React.FC = () => {
  const { transactions, categories, updateTransactionCategory } = useFinanceStore();
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<DateFilter>({});
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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

    return filtered.slice(0, 100); // Limit for performance
  }, [transactions, searchText, categoryFilter, dateFilter, sortBy, sortOrder]);

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return 'ללא קטגוריה';
    return categories.find(c => c.id === categoryId)?.name || 'לא ידוע';
  };

  const getCategoryColor = (categoryId?: string) => {
    if (!categoryId) return '#6b7280';
    return categories.find(c => c.id === categoryId)?.color || '#6b7280';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">עסקאות אחרונות</h2>
          
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
              <option value="date-desc">תאריך (חדש לישן)</option>
              <option value="date-asc">תאריך (ישן לחדש)</option>
              <option value="amount-desc">סכום (גבוה לנמוך)</option>
              <option value="amount-asc">סכום (נמוך לגבוה)</option>
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
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                תאריך
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                תיאור
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                סכום
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                קטגוריה
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                בנק
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTransactions.map((transaction) => (
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
                    <option value="">ללא קטגוריה</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
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

      {filteredTransactions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">לא נמצאו עסקאות</p>
        </div>
      )}

      {transactions.length > 100 && (
        <div className="p-4 text-center border-t border-gray-200">
          <p className="text-sm text-gray-500">
            מוצגות {Math.min(100, filteredTransactions.length)} עסקאות ראשונות מתוך {transactions.length.toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
};
