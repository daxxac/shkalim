
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../store/financeStore';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Search } from 'lucide-react';

interface DashboardTransactionsProps {
  limit?: number;
}

export const DashboardTransactions: React.FC<DashboardTransactionsProps> = ({ limit = 10 }) => {
  const { t } = useTranslation();
  const { transactions, categories, updateTransactionCategory } = useFinanceStore();
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    if (searchText) {
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (categoryFilter && categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }

    return filtered.slice(0, limit);
  }, [transactions, searchText, categoryFilter, limit]);

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return t('categories.other');
    const category = categories.find(c => c.id === categoryId);
    return category ? t(`categories.${category.id}`) || category.name : t('categories.other');
  };

  const getCategoryColor = (categoryId?: string) => {
    if (!categoryId) return '#6b7280';
    return categories.find(c => c.id === categoryId)?.color || '#6b7280';
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('transactions.search')}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t('transactions.filter')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('categories.all')}</SelectItem>
            {categories.map(category => (
              <SelectItem key={category.id} value={category.id}>
                {t(`categories.${category.id}`) || category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {filteredTransactions.map((transaction) => (
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
                      <SelectValue placeholder={t('categories.other')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('categories.other')}</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {t(`categories.${category.id}`) || category.name}
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

      {filteredTransactions.length === 0 && (
        <Card className="premium-card">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">{t('transactions.noTransactions')}</p>
          </CardContent>
        </Card>
      )}

      {transactions.length > limit && (
        <Card className="premium-card">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {t('transactions.showing')} {Math.min(limit, transactions.length)} {t('transactions.of')} {transactions.length.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
