
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
      color: category.color
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

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('dashboard.currentBalance')}
        </h3>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">{t('categories.salary')}:</span>
            <span className="font-bold text-green-600">
              ₪{totalIncome.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600">{t('upload.error')}:</span>
            <span className="font-bold text-red-600">
              ₪{totalExpenses.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
            </span>
          </div>
          
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="text-gray-900 font-medium">{t('dashboard.currentBalance')}:</span>
            <span className={`font-bold text-lg ${
              totalIncome - totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              ₪{(totalIncome - totalExpenses).toLocaleString('he-IL', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Expenses by Category */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('categories.other')}
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
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [
                      `₪${value.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`,
                      t('dashboard.currentBalance')
                    ]}
                  />
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
                      <span className="text-sm text-gray-700">{item.name}</span>
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-900">
                        ₪{item.value.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>{t('upload.error')}</p>
          </div>
        )}
      </div>

      {/* Monthly Balance Trend */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('dashboard.monthTransactions')}
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
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>{t('upload.error')}</p>
          </div>
        )}
      </div>
    </div>
  );
};
