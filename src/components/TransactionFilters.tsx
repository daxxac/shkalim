
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Button } from './ui/button';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Toggle } from './ui/toggle';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface DateFilter {
  start?: Date;
  end?: Date;
}

interface TransactionFiltersProps {
  dateFilter: DateFilter;
  onDateFilterChange: (filter: DateFilter) => void;
  searchText: string;
  onSearchTextChange: (text: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (category: string) => void;
  categories: Array<{ id: string; name: string }>;
  incomeFilter: boolean;
  expenseFilter: boolean;
  onIncomeFilterChange: (value: boolean) => void;
  onExpenseFilterChange: (value: boolean) => void;
  dateFilterType?: 'transaction' | 'charge';
  onDateFilterTypeChange?: (type: 'transaction' | 'charge') => void;
}

export const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  dateFilter,
  onDateFilterChange,
  searchText,
  onSearchTextChange,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  incomeFilter,
  expenseFilter,
  onIncomeFilterChange,
  onExpenseFilterChange,
  dateFilterType = 'transaction',
  onDateFilterTypeChange
}) => {
  const { t } = useTranslation();

  const clearDateFilter = () => {
    onDateFilterChange({});
  };

  const hasDateFilter = dateFilter.start || dateFilter.end;

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

  return (
    <div className="space-y-4 p-4 bg-card border border-border rounded-lg">
      <div className="flex flex-wrap gap-4">
        {/* Search */}
        <div className="flex-1 min-w-64">
          <input
            type="text"
            placeholder={t('transactions.search')}
            value={searchText}
            onChange={(e) => onSearchTextChange(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => onCategoryFilterChange(e.target.value)}
          className="px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
        >
          <option value="">{t('categories.all')}</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {getCategoryDisplayName(category.id)}
            </option>
          ))}
        </select>
      </div>

      {/* Income/Expense Toggles */}
      <div className="flex gap-2">
        <Toggle
          pressed={incomeFilter}
          onPressedChange={onIncomeFilterChange}
          variant="outline"
          className="text-sm"
        >
          {t('navigation.income')}
        </Toggle>
        <Toggle
          pressed={expenseFilter}
          onPressedChange={onExpenseFilterChange}
          variant="outline"
          className="text-sm"
        >
          {t('navigation.expenses')}
        </Toggle>
      </div>

      {/* Date Filter Type Toggle */}
      {onDateFilterTypeChange && (
        <div className="flex gap-2">
          <Toggle
            pressed={dateFilterType === 'transaction'}
            onPressedChange={(pressed) => onDateFilterTypeChange(pressed ? 'transaction' : 'charge')}
            variant="outline"
            className="text-sm"
          >
            Дата транзакции
          </Toggle>
          <Toggle
            pressed={dateFilterType === 'charge'}
            onPressedChange={(pressed) => onDateFilterTypeChange(pressed ? 'charge' : 'transaction')}
            variant="outline"
            className="text-sm"
          >
            Дата списания
          </Toggle>
        </div>
      )}

      {/* Date Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Start Date */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-muted-foreground">
            {dateFilterType === 'transaction' ? 'Дата транзакции с:' : 'Дата списания с:'}
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-48 justify-start text-left font-normal",
                  !dateFilter.start && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFilter.start ? format(dateFilter.start, 'dd/MM/yyyy') : 'Выберите дату'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFilter.start}
                onSelect={(date) => onDateFilterChange({ ...dateFilter, start: date })}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* End Date */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-muted-foreground">
            {dateFilterType === 'transaction' ? 'Дата транзакции до:' : 'Дата списания до:'}
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-48 justify-start text-left font-normal",
                  !dateFilter.end && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFilter.end ? format(dateFilter.end, 'dd/MM/yyyy') : 'Выберите дату'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFilter.end}
                onSelect={(date) => onDateFilterChange({ ...dateFilter, end: date })}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Clear Date Filter */}
        {hasDateFilter && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground opacity-0">
              Очистить
            </label>
            <Button
              variant="outline"
              onClick={clearDateFilter}
              className="w-auto"
            >
              <X className="mr-2 h-4 w-4" />
              Очистить даты
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
