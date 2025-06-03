
import * as XLSX from 'xlsx';
import { Transaction } from '../types/finance';

export interface DiscountBankTransaction {
  date: string; // ISO format
  description: string;
  amount: number; // positive for income, negative for expense
  balance?: number;
  type: 'income' | 'credit-debit' | 'direct-debit' | 'expense' | 'other';
  source: 'discount';
  reference?: string;
  rawRow?: Record<string, any>;
}

// Hebrew column mappings for Discount Bank
const DISCOUNT_COLUMNS = {
  date: 'תאריך פעולה',
  valueDate: 'תאריך ערך', 
  description: 'תיאור פעולה',
  reference: 'אסמכתא',
  debit: 'חיוב',
  credit: 'זכות',
  balance: 'יתרה'
};

// Keywords for categorization
const CREDIT_CARD_KEYWORDS = [
  'חיוב כרטיס אשראי',
  'MAX',
  'CAL',
  'ישראכרט',
  'לאומי קארד',
  'כאל',
  'מקס'
];

const DIRECT_DEBIT_KEYWORDS = [
  'הוראת קבע',
  'חיוב ישיר',
  'חח',
  'חשמל',
  'מים',
  'ארנונה',
  'סלולר',
  'ביטוח',
  'טלוויזיה',
  'אינטרנט',
  'גז'
];

export function parseDiscountBankFile(file: ArrayBuffer): DiscountBankTransaction[] {
  try {
    const workbook = XLSX.read(file, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with original headers
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (rawData.length < 2) {
      throw new Error('File appears to be empty or has no data rows');
    }
    
    const headers = rawData[0] as string[];
    const dataRows = rawData.slice(1);
    
    console.log('Discount Bank headers found:', headers);
    
    // Find column indices
    const columnIndices = findColumnIndices(headers);
    
    const transactions: DiscountBankTransaction[] = [];
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i] as any[];
      
      if (!row || row.length === 0) continue;
      
      try {
        const transaction = parseDiscountBankRow(row, columnIndices, i + 2);
        if (transaction) {
          transactions.push(transaction);
        }
      } catch (error) {
        console.warn(`Error parsing row ${i + 2}:`, error);
      }
    }
    
    console.log(`Parsed ${transactions.length} Discount Bank transactions`);
    return transactions;
    
  } catch (error) {
    console.error('Error parsing Discount Bank file:', error);
    throw new Error(`Failed to parse Discount Bank file: ${error}`);
  }
}

function findColumnIndices(headers: string[]): Record<string, number> {
  const indices: Record<string, number> = {};
  
  // Try to find columns by exact match first
  Object.entries(DISCOUNT_COLUMNS).forEach(([key, hebrewName]) => {
    const index = headers.findIndex(h => h === hebrewName);
    if (index !== -1) {
      indices[key] = index;
    }
  });
  
  // If exact match fails, try partial match
  if (Object.keys(indices).length < 3) {
    Object.entries(DISCOUNT_COLUMNS).forEach(([key, hebrewName]) => {
      if (indices[key] === undefined) {
        const index = headers.findIndex(h => h && h.includes(hebrewName.split(' ')[0]));
        if (index !== -1) {
          indices[key] = index;
        }
      }
    });
  }
  
  console.log('Column indices found:', indices);
  return indices;
}

function parseDiscountBankRow(
  row: any[], 
  columnIndices: Record<string, number>, 
  rowNumber: number
): DiscountBankTransaction | null {
  
  const getColumnValue = (key: string): any => {
    const index = columnIndices[key];
    return index !== undefined ? row[index] : null;
  };
  
  // Extract basic data
  const dateValue = getColumnValue('date');
  const description = String(getColumnValue('description') || '').trim();
  const creditValue = getColumnValue('credit');
  const debitValue = getColumnValue('debit');
  const balanceValue = getColumnValue('balance');
  const reference = getColumnValue('reference');
  
  // Skip empty rows
  if (!dateValue && !description && !creditValue && !debitValue) {
    return null;
  }
  
  // Parse date
  const date = parseDiscountDate(dateValue);
  if (!date) {
    console.warn(`Invalid date in row ${rowNumber}:`, dateValue);
    return null;
  }
  
  // Parse amounts
  const credit = parseDiscountAmount(creditValue);
  const debit = parseDiscountAmount(debitValue);
  const balance = parseDiscountAmount(balanceValue);
  
  // Determine amount (positive for income, negative for expense)
  let amount = 0;
  if (credit > 0) {
    amount = credit; // Income
  } else if (debit > 0) {
    amount = -debit; // Expense
  }
  
  if (amount === 0) {
    console.warn(`No amount found in row ${rowNumber}:`, { credit, debit });
    return null;
  }
  
  // Categorize transaction
  const type = categorizeDiscountTransaction(description, amount);
  
  return {
    date: date.toISOString().split('T')[0],
    description,
    amount,
    balance: !isNaN(balance) ? balance : undefined,
    type,
    source: 'discount',
    reference: reference ? String(reference) : undefined,
    rawRow: {
      date: dateValue,
      description,
      credit: creditValue,
      debit: debitValue,
      balance: balanceValue,
      reference
    }
  };
}

function parseDiscountDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  
  // Handle Excel date numbers
  if (typeof dateValue === 'number') {
    // Excel date serial number (days since 1900-01-01)
    const excelDate = new Date((dateValue - 25569) * 86400 * 1000);
    if (!isNaN(excelDate.getTime())) {
      return excelDate;
    }
  }
  
  // Handle string dates
  if (typeof dateValue === 'string') {
    // Try different date formats
    const formats = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // DD/MM/YYYY or MM/DD/YYYY
      /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
      /(\d{1,2})\.(\d{1,2})\.(\d{4})/ // DD.MM.YYYY
    ];
    
    for (const format of formats) {
      const match = dateValue.match(format);
      if (match) {
        // Assume DD/MM/YYYY for Israeli format
        const day = parseInt(match[1]);
        const month = parseInt(match[2]);
        const year = parseInt(match[3]);
        
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime()) && date.getFullYear() === year) {
          return date;
        }
      }
    }
    
    // Try parsing as-is
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  return null;
}

function parseDiscountAmount(value: any): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'string') {
    // Remove currency symbols, commas, and extra spaces
    const cleaned = value
      .replace(/₪/g, '')
      .replace(/,/g, '')
      .replace(/\s+/g, '')
      .trim();
    
    const number = parseFloat(cleaned);
    return isNaN(number) ? 0 : number;
  }
  
  return 0;
}

function categorizeDiscountTransaction(description: string, amount: number): DiscountBankTransaction['type'] {
  const desc = description.toLowerCase();
  
  // Income (positive amount)
  if (amount > 0) {
    return 'income';
  }
  
  // Credit card charges
  const isCreditCard = CREDIT_CARD_KEYWORDS.some(keyword => 
    desc.includes(keyword.toLowerCase())
  );
  
  if (isCreditCard) {
    return 'credit-debit';
  }
  
  // Direct debits / standing orders
  const isDirectDebit = DIRECT_DEBIT_KEYWORDS.some(keyword => 
    desc.includes(keyword.toLowerCase())
  );
  
  if (isDirectDebit) {
    return 'direct-debit';
  }
  
  // Regular expense
  if (amount < 0) {
    return 'expense';
  }
  
  return 'other';
}

// Convert to standard Transaction format
export function convertDiscountToStandardTransaction(
  discountTransaction: DiscountBankTransaction
): Transaction {
  return {
    id: `discount-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    date: discountTransaction.date,
    description: discountTransaction.description,
    amount: discountTransaction.amount,
    balance: discountTransaction.balance,
    bank: 'discount',
    reference: discountTransaction.reference,
    category: mapDiscountTypeToCategory(discountTransaction.type)
  };
}

function mapDiscountTypeToCategory(type: DiscountBankTransaction['type']): string {
  switch (type) {
    case 'income':
      return 'salary';
    case 'credit-debit':
      return 'shopping';
    case 'direct-debit':
      return 'bills';
    case 'expense':
      return 'other';
    default:
      return 'other';
  }
}

