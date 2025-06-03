import * as XLSX from 'xlsx';
import type { ProcessedExportData } from '../services/exportService';
import type { Category } from '../types/finance';
import { TFunction } from 'i18next';

const formatDateForExcel = (dateString: string): string | Date => {
  try {
    // Excel prefers actual Date objects for date cells, or specific string formats.
    // For simplicity and broad compatibility, a YYYY-MM-DD string is often safe.
    // Or, pass the Date object directly if XLSX handles it well for formatting.
    const date = new Date(dateString);
    // return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return date; // XLSX can handle Date objects and often applies default date formatting.
  } catch (e) {
    return dateString; // Fallback
  }
};

export const exportToExcel = (
  data: ProcessedExportData,
  categories: Category[],
  t: TFunction
) => {
  const wb = XLSX.utils.book_new();

  // 1. Summary Sheet
  const stats = data.statistics;
  const summaryData = [
    [t('export.stats.totalIncome', 'Total Income'), stats.totalIncome],
    [t('export.stats.totalExpenses', 'Total Expenses'), stats.totalExpenses],
    [t('export.stats.netBalance', 'Net Balance'), stats.netBalance],
    [t('export.stats.numTransactions', 'Number of Transactions'), stats.numTransactions],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  // Set column widths for summary sheet (optional)
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, t('export.excel.summarySheetName', 'Summary'));

  // 2. Transactions Sheet
  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return t('categories.uncategorized', 'Uncategorized');
    const category = categories.find(c => c.id === categoryId);
    return category ? t(`categories.${category.id}`, category.name) : t('categories.unknown', 'Unknown');
  };

  const transactionsHeader = [
    t('export.table.id', 'ID'),
    t('export.table.date', 'Date'),
    t('export.table.chargeDate', 'Charge Date'),
    t('export.table.description', 'Description'),
    t('export.table.amount', 'Amount'),
    t('export.table.balance', 'Balance'),
    t('export.table.category', 'Category'),
    t('export.table.bank', 'Bank'),
    t('export.table.reference', 'Reference'),
    t('export.table.location', 'Location'),
    t('export.table.type', 'Type')
  ];

  const transactionsBody = data.filteredTransactions.map(transaction => [
    transaction.id,
    formatDateForExcel(transaction.date),
    transaction.chargeDate ? formatDateForExcel(transaction.chargeDate) : '',
    transaction.description,
    transaction.amount,
    transaction.balance !== undefined ? transaction.balance : '',
    getCategoryName(transaction.category),
    transaction.bank || '-',
    transaction.reference || '',
    transaction.location || '',
    transaction.type || ''
  ]);

  const transactionsSheetData = [transactionsHeader, ...transactionsBody];
  const transactionsSheet = XLSX.utils.aoa_to_sheet(transactionsSheetData);
  
  // Set column widths for transactions sheet
  transactionsSheet['!cols'] = [
    { wch: 30 }, // ID
    { wch: 12 }, // Date
    { wch: 12 }, // Charge Date
    { wch: 50 }, // Description
    { wch: 15 }, // Amount
    { wch: 15 }, // Balance
    { wch: 25 }, // Category
    { wch: 15 }, // Bank
    { wch: 20 }, // Reference
    { wch: 20 }, // Location
    { wch: 15 }, // Type
  ];

  // Apply number formatting for Amount (column E, index 4) and Balance (column F, index 5)
  data.filteredTransactions.forEach((_, index) => {
    const amountCellAddress = XLSX.utils.encode_cell({ r: index + 1, c: 4 });
    if (transactionsSheet[amountCellAddress]) {
      transactionsSheet[amountCellAddress].z = '#,##0.00';
    }
    const balanceCellAddress = XLSX.utils.encode_cell({ r: index + 1, c: 5 });
    if (transactionsSheet[balanceCellAddress] && typeof transactionsSheet[balanceCellAddress].v === 'number') {
      transactionsSheet[balanceCellAddress].z = '#,##0.00';
    }
  });

  XLSX.utils.book_append_sheet(wb, transactionsSheet, t('export.excel.transactionsSheetName', 'Transactions'));

  // 3. Save Workbook
  XLSX.writeFile(wb, t('export.excel.filename', 'financial_report.xlsx'));
};