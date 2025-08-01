
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon, X, Download } from 'lucide-react';
import { Button } from './ui/button';
import { useFinanceStore } from '../store/financeStore';
import { useTheme } from '../hooks/useTheme';
import {
  generatePdfReport,
  generateExcelReport,
  FilterState
} from '../services/exportService';
import type { ThemeColors } from '../utils/pdfGenerator'; // For PDF theme
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Toggle } from './ui/toggle';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from './ui/dropdown-menu'; // Added Dropdown imports
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export interface DateFilter { // Added export
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
  const { transactions: allTransactions, categories: allCategories } = useFinanceStore();
  const { theme } = useTheme();

  const handleExportPDF = async () => {
    const activeFilters: FilterState = {
      dateFilter,
      searchText,
      categoryFilter,
      incomeFilter,
      expenseFilter,
    };

    // Define basic theme colors based on the app's theme
    // This can be expanded with more specific colors from your Tailwind config if needed
    const themeColors: ThemeColors = {
      textColor: theme === 'dark' ? '#FFFFFF' : '#000000',
      headerColor: theme === 'dark' ? '#E5E7EB' : '#1F2937', // Example: light gray for dark, dark gray for light
      accentColor: theme === 'dark' ? '#3B82F6' : '#2563EB', // Example: blue accent
    };
    const logoSrc = '/logo.png'; // Path to your logo in the public folder

    await generatePdfReport(activeFilters, allTransactions, allCategories, themeColors, logoSrc, t);
  };

  const handleExportExcel = async () => {
    const activeFilters: FilterState = {
      dateFilter,
      searchText,
      categoryFilter,
      incomeFilter,
      expenseFilter,
    };
    await generateExcelReport(activeFilters, allTransactions, allCategories, t);
  };

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
            {t('transactionFilters.dateFilterType.transaction')}
          </Toggle>
          <Toggle
            pressed={dateFilterType === 'charge'}
            onPressedChange={(pressed) => onDateFilterTypeChange(pressed ? 'charge' : 'transaction')}
            variant="outline"
            className="text-sm"
          >
            {t('transactionFilters.dateFilterType.charge')}
          </Toggle>
        </div>
      )}

      {/* Date Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Start Date */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-muted-foreground">
            {dateFilterType === 'transaction' ? t('transactionFilters.startDate.transactionLabel') : t('transactionFilters.startDate.chargeLabel')}
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
                {dateFilter.start ? format(dateFilter.start, 'dd/MM/yyyy') : t('transactionFilters.datePlaceholder')}
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
            {dateFilterType === 'transaction' ? t('transactionFilters.endDate.transactionLabel') : t('transactionFilters.endDate.chargeLabel')}
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
                {dateFilter.end ? format(dateFilter.end, 'dd/MM/yyyy') : t('transactionFilters.datePlaceholder')}
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
              {t('transactionFilters.clearDatesLabel')}
            </label>
            <Button
              variant="outline"
              onClick={clearDateFilter}
              className="w-auto"
            >
              <X className="mr-2 h-4 w-4" />
              {t('transactionFilters.clearDatesButton')}
            </Button>
          </div>
        )}
      </div>

      {/* Export Button */}
      <div className="flex justify-end mt-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              {t('navigation.exportData')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={handleExportPDF}>
              {t('export.asPdf', 'Export as PDF')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleExportExcel}>
              {t('export.asExcel', 'Export as Excel')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
