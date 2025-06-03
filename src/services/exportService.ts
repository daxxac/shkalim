import type { Transaction, Category } from '../types/finance';
import type { DateFilter } from '../components/TransactionFilters';
import { exportToPdf, ThemeColors } from '../utils/pdfGenerator';
import { exportToExcel } from '../utils/excelGenerator';
import { TFunction } from 'i18next';

// Define FilterState based on what TransactionFilters provides
// This might need adjustment based on the actual props of TransactionFilters
// or how we decide to pass filter values.
export interface FilterState { // Exporting for use in TransactionFilters
  dateFilter: DateFilter;
  searchText: string;
  categoryFilter: string;
  incomeFilter: boolean;
  expenseFilter: boolean;
  // Potentially dateFilterType if it affects transaction filtering for export
}

interface StatisticSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  numTransactions: number;
}

export interface ProcessedExportData {
  filteredTransactions: Transaction[];
  statistics: StatisticSummary;
}

/**
 * Fetches all transactions and categories from the store,
 * then filters transactions based on the provided filter state and calculates statistics.
 * 
 * @param filters - The current filter state from TransactionFilters.
 * @returns An object containing filtered transactions and calculated statistics.
 */
const fetchAndProcessData = (
  filters: FilterState,
  allTransactions: Transaction[], // Pass all transactions from the store
  // categories: Category[] // Categories might be needed for some stats later, or for display names
): ProcessedExportData => {
  let processedTransactions = [...allTransactions];

  // Apply search filter
  if (filters.searchText) {
    processedTransactions = processedTransactions.filter(t =>
      t.description.toLowerCase().includes(filters.searchText.toLowerCase())
    );
  }

  // Apply category filter
  if (filters.categoryFilter) {
    processedTransactions = processedTransactions.filter(t => t.category === filters.categoryFilter);
  }

  // Apply income/expense filter
  if (filters.incomeFilter && !filters.expenseFilter) {
    processedTransactions = processedTransactions.filter(t => t.amount > 0);
  } else if (filters.expenseFilter && !filters.incomeFilter) {
    processedTransactions = processedTransactions.filter(t => t.amount < 0);
  }

  // Apply date filter
  if (filters.dateFilter.start || filters.dateFilter.end) {
    processedTransactions = processedTransactions.filter(t => {
      const transactionDate = new Date(t.date);
      // Ensure start and end are valid Date objects if they exist
      const startDate = filters.dateFilter.start ? new Date(filters.dateFilter.start) : null;
      const endDate = filters.dateFilter.end ? new Date(filters.dateFilter.end) : null;

      if (startDate && endDate) {
        // Set endDate to the end of the day for inclusive filtering
        endDate.setHours(23, 59, 59, 999);
        return transactionDate >= startDate && transactionDate <= endDate;
      } else if (startDate) {
        return transactionDate >= startDate;
      } else if (endDate) {
        endDate.setHours(23, 59, 59, 999);
        return transactionDate <= endDate;
      }
      return true;
    });
  }
  
  // Calculate statistics from the filteredTransactions
  let totalIncome = 0;
  let totalExpenses = 0;

  processedTransactions.forEach(t => {
    if (t.amount > 0) {
      totalIncome += t.amount;
    } else {
      totalExpenses += t.amount; // amount is negative for expenses
    }
  });

  const statistics: StatisticSummary = {
    totalIncome,
    totalExpenses: Math.abs(totalExpenses), // Show as positive number
    netBalance: totalIncome + totalExpenses, // totalExpenses is already negative
    numTransactions: processedTransactions.length,
  };

  return {
    filteredTransactions: processedTransactions,
    statistics,
  };
};

// Placeholder for PDF generation function
export const generatePdfReport = async (
  activeFilters: FilterState,
  allTransactions: Transaction[],
  categories: Category[],
  themeColors: ThemeColors,
  logoSrc: string,
  t: TFunction
) => {
  const processedData = fetchAndProcessData(activeFilters, allTransactions);
  try {
    await exportToPdf(processedData, themeColors, logoSrc, categories, t, activeFilters.dateFilter);
  } catch (error) {
    console.error("Error generating PDF report:", error);
    // Optionally, show a user-facing error message
    alert(t('export.error.pdf', 'Failed to generate PDF report.'));
  }
};

export const generateExcelReport = async (
  activeFilters: FilterState,
  allTransactions: Transaction[],
  categories: Category[],
  t: TFunction
) => {
  const processedData = fetchAndProcessData(activeFilters, allTransactions);
  try {
    await exportToExcel(processedData, categories, t); // Assuming exportToExcel can be async if it involves complex ops, or just remove await
  } catch (error) {
    console.error("Error generating Excel report:", error);
    alert(t('export.error.excel', 'Failed to generate Excel report.'));
  }
};

// Note: The DateFilter type might need to be explicitly defined here if not easily importable
// or if TransactionFilters.tsx doesn't export it directly.
// For now, assuming it's:
// export interface DateFilter {
//   start?: Date;
//   end?: Date;
// }