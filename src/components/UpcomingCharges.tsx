
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../store/financeStore';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Search, Calendar, AlertCircle } from 'lucide-react';

export const UpcomingCharges: React.FC = () => {
  const { t } = useTranslation();
  const { upcomingCharges, categories, updateUpcomingChargeCategory } = useFinanceStore();
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

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

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return t('categories.other');
    const category = categories.find(c => c.id === categoryId);
    return category ? t(`categories.${category.id}`) || category.name : t('categories.other');
  };

  const getCategoryColor = (categoryId?: string) => {
    if (!categoryId) return '#6b7280';
    return categories.find(c => c.id === categoryId)?.color || '#6b7280';
  };

  const totalUpcomingAmount = filteredCharges.reduce((sum, charge) => sum + Math.abs(charge.amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            {t('upcomingCharges.title')}
          </CardTitle>
          <div className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <span className="text-muted-foreground">{t('upcomingCharges.totalAmount')}:</span>
            <span className="font-bold text-orange-600">
              ₪{totalUpcomingAmount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card className="premium-card">
        <CardContent className="p-4">
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
        </CardContent>
      </Card>

      {/* Upcoming Charges List */}
      <div className="space-y-3">
        {filteredCharges.map((charge) => (
          <Card key={charge.id} className="premium-card border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-sm text-muted-foreground">
                      {new Date(charge.date).toLocaleDateString()}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {charge.bank?.toUpperCase()}
                    </Badge>
                    <Badge variant="secondary" className="text-xs text-orange-700 bg-orange-100">
                      {t('upcomingCharges.upcoming')}
                    </Badge>
                  </div>
                  <div className="font-medium text-foreground truncate mb-2">
                    {charge.description}
                  </div>
                  <Select
                    value={charge.category || 'none'}
                    onValueChange={(value) => updateUpcomingChargeCategory(charge.id, value === 'none' ? undefined : value)}
                  >
                    <SelectTrigger 
                      className="w-full sm:w-48 h-8 text-xs"
                      style={{ 
                        backgroundColor: getCategoryColor(charge.category) + '20',
                        borderColor: getCategoryColor(charge.category) + '40'
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
                  <div className="text-lg font-bold text-orange-600">
                    ₪{Math.abs(charge.amount).toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCharges.length === 0 && (
        <Card className="premium-card">
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t('upcomingCharges.noCharges')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
