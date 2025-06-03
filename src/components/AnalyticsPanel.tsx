
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../store/financeStore';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export const AnalyticsPanel: React.FC = () => {
  const { t } = useTranslation();
  const { transactions, categories, getTransactionsByCategory, getMonthlyBalance } = useFinanceStore();

  const categoryData = React.useMemo(() => {
    const transactionsByCategory = getTransactionsByCategory();
    return categories.map(category => ({
      name: t(`categories.${category.id}`) || category.name,
      value: Math.abs(
        transactionsByCategory[category.id]?.reduce((sum, t) => sum + Math.min(0, t.amount), 0) || 0
      ),
      color: category.color,
      category: category.name
    })).filter(item => item.value > 0);
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

  const totalExpenses = categoryData.reduce((sum, item) => sum + item.value, 0);
  const totalIncome = transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0];
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{data.payload.name}</p>
          <p className="text-sm text-muted-foreground">
            ₪{data.value.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground">
            {((data.value / totalExpenses) * 100).toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="premium-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {t('dashboard.currentBalance')}
        </h3>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">{t('categories.salary')}:</span>
            <span className="font-bold text-green-600">
              ₪{totalIncome.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">{t('navigation.expenses')}:</span>
            <span className="font-bold text-red-600">
              ₪{totalExpenses.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
            </span>
          </div>
          
          <div className="flex justify-between items-center pt-2 border-t border-border">
            <span className="text-foreground font-medium">{t('dashboard.currentBalance')}:</span>
            <span className={`font-bold text-lg ${
              totalIncome - totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              ₪{(totalIncome - totalExpenses).toLocaleString('he-IL', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Expenses by Category */}
      <div className="premium-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {t('analytics.categoryBreakdown')}
        </h3>
        
        {categoryData.length > 0 ? (
          <>
            <div className="h-64 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={100}
                    paddingAngle={0}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2">
              {categoryData.map((item, index) => {
                const percentage = (item.value / totalExpenses) * 100;
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-muted-foreground">{item.name}</span>
                    </div>
                    <div className="text-left">
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
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>{t('transactions.noTransactions')}</p>
          </div>
        )}
      </div>

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
