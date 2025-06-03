
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../store/financeStore';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { ScrollArea } from './ui/scroll-area';

export const AnalyticsPanel: React.FC = () => {
  const { t } = useTranslation();
  const { transactions, categories, getTransactionsByCategory, getMonthlyBalance } = useFinanceStore();

  const getCategoryDisplayName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      const translatedName = t(`categories.${category.id}`);
      // If translation is the same as the key, show the original name without kebab-case
      if (translatedName === `categories.${category.id}`) {
        return category.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
      return translatedName;
    }
    return categoryId;
  };

  const { expenseData, incomeData } = React.useMemo(() => {
    const transactionsByCategory = getTransactionsByCategory();
    
    const expenses = categories.map(category => ({
      name: getCategoryDisplayName(category.id),
      value: Math.abs(
        transactionsByCategory[category.id]?.reduce((sum, t) => sum + Math.min(0, t.amount), 0) || 0
      ),
      color: category.color,
      category: category.name
    })).filter(item => item.value > 0);

    const income = categories.map(category => ({
      name: getCategoryDisplayName(category.id),
      value: transactionsByCategory[category.id]?.reduce((sum, t) => sum + Math.max(0, t.amount), 0) || 0,
      color: category.color,
      category: category.name
    })).filter(item => item.value > 0);

    return { expenseData: expenses, incomeData: income };
  }, [transactions, categories, getTransactionsByCategory, t]);

  const monthlyData = React.useMemo(() => {
    return getMonthlyBalance().slice(-6).map(item => ({
      month: new Date(item.month + '-01').toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short' 
      }),
      balance: item.balance
    }));
  }, [getMonthlyBalance]);

  const totalExpenses = expenseData.reduce((sum, item) => sum + item.value, 0);
  const totalIncome = incomeData.reduce((sum, item) => sum + item.value, 0);

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string | number;
    value?: string | number | (string | number)[];
    payload?: { name?: string | number; }; // Made nested payload optional
  }>;
  label?: string | number;
  dataType: 'income' | 'expense';
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, dataType }) => {
  if (active && payload && payload.length > 0) {
    const dataItem = payload[0];

    if (dataItem.value === undefined) {
      return null;
    }
    
    let rawValue = dataItem.value;
    if (Array.isArray(rawValue)) {
      rawValue = rawValue.length > 0 ? rawValue[0] : undefined;
    }
    
    if (rawValue === undefined) {
      return null;
    }

    const numericValue = typeof rawValue === 'string' ? parseFloat(rawValue) : (typeof rawValue === 'number' ? rawValue : NaN);

    if (isNaN(numericValue)) {
      return null;
    }

    const total = dataType === 'expense' ? totalExpenses : totalIncome;
    
    // Check if nested payload and its name exist
    const rawName = dataItem.payload?.name;
    const displayName = rawName !== undefined ? (typeof rawName === 'number' ? String(rawName) : rawName) : 'N/A';
    
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-foreground">{displayName}</p>
        <p className="text-sm text-muted-foreground">
          ₪{numericValue.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-muted-foreground">
          {total > 0 ? ((numericValue / total) * 100).toFixed(1) + '%' : 'N/A'}
        </p>
      </div>
    );
  }
  return null;
};

  return (
    <div className="space-y-6">
      {/* Income by Category */}
      {incomeData.length > 0 && (
        <div className="premium-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {t('analytics.incomeByCategory')}
          </h3>
          
          <div className="h-64 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={incomeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={100}
                  paddingAngle={0}
                  dataKey="value"
                >
                  {incomeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={(props) => <CustomTooltip {...props} dataType="income" />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ScrollArea className="h-64">
            <div className="space-y-2 pr-4">
              {incomeData.map((item, index) => {
                const percentage = (item.value / totalIncome) * 100;
                return (
                  <div key={index} className="flex items-center gap-3 p-2 rounded">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-muted-foreground truncate block">{item.name}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-medium text-foreground">
                        ₪{item.value.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Expenses by Category */}
      {expenseData.length > 0 && (
        <div className="premium-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {t('analytics.expensesByCategory')}
          </h3>
          
          <div className="h-64 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={100}
                  paddingAngle={0}
                  dataKey="value"
                >
                  {expenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={(props) => <CustomTooltip {...props} dataType="expense" />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ScrollArea className="h-64">
            <div className="space-y-2 pr-4">
              {expenseData.map((item, index) => {
                const percentage = (item.value / totalExpenses) * 100;
                return (
                  <div key={index} className="flex items-center gap-3 p-2 rounded">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-muted-foreground truncate block">{item.name}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-medium text-foreground">
                        ₪{item.value.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Monthly Balance Trend */}
      <div className="premium-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {t('analytics.monthlyTrend')}
        </h3>
        
        {monthlyData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `₪${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  formatter={(value: number) => [
                    `₪${value.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`,
                    t('dashboard.currentBalance')
                  ]}
                />
                <Bar 
                  dataKey="balance" 
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>{t('transactions.noTransactions')}</p>
          </div>
        )}
      </div>
    </div>
  );
};
