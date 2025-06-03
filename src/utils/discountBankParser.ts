import * as XLSX from 'xlsx';
import { Transaction } from '../types/finance';

export interface DiscountBankTransaction {
  date: string;
  description: string;
  amount: number;
  balance?: number;
  type: 'income' | 'credit-debit' | 'direct-debit' | 'expense' | 'other';
  source: 'discount';
  reference?: string;
  rawRow?: Record<string, any>;
}

// Column mappings for Discount Bank transactions table
const DISCOUNT_TRANSACTIONS_COLUMNS = {
  date: 'תאריך',
  valueDate: 'יום ערך',
  description: 'תיאור התנועה',
  amount: '₪ זכות/חובה',
  balance: '₪ יתרה',
  reference: 'אסמכתה',
  fee: 'עמלה',
  channel: 'ערוץ ביצוע'
};

// Column mappings for Discount Bank credit card table
const DISCOUNT_CREDIT_COLUMNS = {
  date: 'תאריך',
  valueDate: 'יום ערך',
  description: 'תיאור התנועה',
  amount: '₪ זכות/חובה ב',
  balance: '₪ יתרה משוערת',
  notes: 'הערות'
};

// Keywords to identify credit card charges from other banks that should be filtered out
const CREDIT_CARD_CHARGE_KEYWORDS = [
  'כ.א.ל',
  'כ.א.ל חיוב',
  'cal',
  'מקס איט פי',
  'מקס איט פי חיוב',
  'max eat pay',
  'max',
  'ישראכרט',
  'לאומי קארד',
  'חיוב כרטיס אשראי',
  'ויזה כ.א.ל',
  'מסטרקארד כ.א.ל',
  'ויזה מקס',
  'מסטרקארד מקס'
];

export function parseDiscountBankFile(file: ArrayBuffer, fileType?: string): DiscountBankTransaction[] {
  try {
    const workbook = XLSX.read(file, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with original headers
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (rawData.length < 2) {
      throw new Error('File appears to be empty or has no data rows');
    }
    
    console.log('Raw data length:', rawData.length);
    console.log('First 5 rows:', rawData.slice(0, 5));
    
    // Find tables in the sheet
    const tables = findTablesInSheet(rawData);
    console.log('Found tables:', tables);
    
    let targetTable;
    
    if (fileType === 'discount-transactions') {
      targetTable = tables.find(t => t.type === 'transactions');
    } else if (fileType === 'discount-credit') {
      targetTable = tables.find(t => t.type === 'credit');
    } else {
      // Auto-detect: prefer transactions table
      targetTable = tables.find(t => t.type === 'transactions') || tables.find(t => t.type === 'credit');
    }
    
    if (!targetTable) {
      throw new Error('Could not find a recognized table format in the file');
    }
    
    console.log('Using table:', targetTable);
    
    const transactions = parseDiscountTable(rawData, targetTable);
    console.log(`Parsed ${transactions.length} Discount Bank transactions`);
    
    return transactions;
    
  } catch (error) {
    console.error('Error parsing Discount Bank file:', error);
    throw new Error(`Failed to parse Discount Bank file: ${error}`);
  }
}

interface TableInfo {
  type: 'transactions' | 'credit';
  startRow: number;
  endRow: number;
  columnIndices: Record<string, number>;
}

function findTablesInSheet(rawData: any[]): TableInfo[] {
  const tables: TableInfo[] = [];
  
  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i] as any[];
    if (!row || row.length === 0) continue;
    
    // Check for transactions table headers
    const transactionIndices = findColumnIndices(row, DISCOUNT_TRANSACTIONS_COLUMNS);
    if (Object.keys(transactionIndices).length >= 4) {
      const endRow = findTableEnd(rawData, i + 1);
      tables.push({
        type: 'transactions',
        startRow: i,
        endRow,
        columnIndices: transactionIndices
      });
      continue;
    }
    
    // Check for credit card table headers
    const creditIndices = findColumnIndices(row, DISCOUNT_CREDIT_COLUMNS);
    if (Object.keys(creditIndices).length >= 4) {
      const endRow = findTableEnd(rawData, i + 1);
      tables.push({
        type: 'credit',
        startRow: i,
        endRow,
        columnIndices: creditIndices
      });
    }
  }
  
  return tables;
}

function findColumnIndices(headers: any[], columnMap: Record<string, string>): Record<string, number> {
  const indices: Record<string, number> = {};
  
  Object.entries(columnMap).forEach(([key, hebrewName]) => {
    const index = headers.findIndex(h => h && String(h).trim() === hebrewName);
    if (index !== -1) {
      indices[key] = index;
    }
  });
  
  return indices;
}

function findTableEnd(rawData: any[], startRow: number): number {
  for (let i = startRow; i < rawData.length; i++) {
    const row = rawData[i] as any[];
    if (!row || row.length === 0 || row.every(cell => !cell)) {
      return i - 1;
    }
  }
  return rawData.length - 1;
}

function parseDiscountTable(rawData: any[], table: TableInfo): DiscountBankTransaction[] {
  const transactions: DiscountBankTransaction[] = [];
  
  for (let i = table.startRow + 1; i <= table.endRow; i++) {
    const row = rawData[i] as any[];
    if (!row || row.length === 0) continue;
    
    try {
      const transaction = parseDiscountBankRow(row, table.columnIndices, i + 1);
      if (transaction && !shouldFilterOutTransaction(transaction)) {
        transactions.push(transaction);
      } else if (transaction && shouldFilterOutTransaction(transaction)) {
        console.log(`Filtered out credit card charge: ${transaction.description}`);
      }
    } catch (error) {
      console.warn(`Error parsing row ${i + 1}:`, error);
    }
  }
  
  return transactions;
}

function shouldFilterOutTransaction(transaction: DiscountBankTransaction): boolean {
  const description = transaction.description.toLowerCase();
  
  // Only filter out negative amounts (charges)
  if (transaction.amount >= 0) {
    return false;
  }
  
  // Check if description contains any credit card charge keywords
  return CREDIT_CARD_CHARGE_KEYWORDS.some(keyword => 
    description.includes(keyword.toLowerCase())
  );
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
  const amountValue = getColumnValue('amount');
  const balanceValue = getColumnValue('balance');
  const reference = getColumnValue('reference');
  
  // Skip empty rows
  if (!dateValue && !description && !amountValue) {
    return null;
  }
  
  // Parse date
  const date = parseDiscountDate(dateValue);
  if (!date) {
    console.warn(`Invalid date in row ${rowNumber}:`, dateValue);
    return null;
  }
  
  // Parse amount
  const amount = parseDiscountAmount(amountValue);
  if (amount === 0) {
    console.warn(`No amount found in row ${rowNumber}:`, amountValue);
    return null;
  }
  
  // Parse balance
  const balance = parseDiscountAmount(balanceValue);
  
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
      amount: amountValue,
      balance: balanceValue,
      reference
    }
  };
}

function parseDiscountDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  
  // Handle Excel date numbers
  if (typeof dateValue === 'number') {
    const excelDate = new Date((dateValue - 25569) * 86400 * 1000);
    if (!isNaN(excelDate.getTime())) {
      return excelDate;
    }
  }
  
  // Handle string dates
  if (typeof dateValue === 'string') {
    const formats = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      /(\d{4})-(\d{1,2})-(\d{1,2})/,
      /(\d{1,2})\.(\d{1,2})\.(\d{4})/
    ];
    
    for (const format of formats) {
      const match = dateValue.match(format);
      if (match) {
        const day = parseInt(match[1]);
        const month = parseInt(match[2]);
        const year = parseInt(match[3]);
        
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime()) && date.getFullYear() === year) {
          return date;
        }
      }
    }
    
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
  
  if (amount > 0) {
    return 'income';
  }
  
  const creditCardKeywords = ['חיוב כרטיס אשראי', 'max', 'cal', 'ישראכרט', 'לאומי קארד'];
  const isCreditCard = creditCardKeywords.some(keyword => 
    desc.includes(keyword.toLowerCase())
  );
  
  if (isCreditCard) {
    return 'credit-debit';
  }
  
  const directDebitKeywords = ['הוראת קבע', 'חיוב ישיר', 'חח', 'חשמל', 'מים', 'ארנונה'];
  const isDirectDebit = directDebitKeywords.some(keyword => 
    desc.includes(keyword.toLowerCase())
  );
  
  if (isDirectDebit) {
    return 'direct-debit';
  }
  
  if (amount < 0) {
    return 'expense';
  }
  
  return 'other';
}

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
