
import * as XLSX from 'xlsx';
import { Transaction } from '../types/finance';

export interface MaxBankTransaction {
  date: string;
  merchant: string;
  category: string;
  cardDigits: string;
  transactionType: string;
  chargeAmount: number;
  chargeCurrency: string;
  originalAmount: number;
  originalCurrency: string;
  chargeDate: string;
  notes?: string;
  tags?: string;
  source: 'max';
}

// Column mappings for MAX Bank files
const MAX_COLUMNS = {
  shekel: {
    date: 'תאריך עסקה',
    merchant: 'שם בית העסק',
    category: 'קטגוריה',
    cardDigits: '4 ספרות אחרונות של כרטיס האשראי',
    transactionType: 'סוג עסקה',
    chargeAmount: 'סכום חיוב',
    chargeCurrency: 'מטבע חיוב',
    originalAmount: 'סכום עסקה מקורי',
    originalCurrency: 'מטבע עסקה מקורי',
    chargeDate: 'תאריך חיוב',
    notes: 'הערות',
    tags: 'תיוגים',
    discountClub: 'מועדון הנחות',
    discountKey: 'מפתח דיסקונט',
    executionMethod: 'אופן ביצוע ההעסקה',
    exchangeRate: 'שער המרה ממטבע מקור/התחשבנות לש"ח'
  },
  foreign: {
    date: 'תאריך עסקה',
    merchant: 'שם בית העסק',
    category: 'קטגוריה',
    cardDigits: '4 ספרות אחרונות של כרטיס האשראי',
    transactionType: 'סוג עסקה',
    chargeAmount: 'סכום חיוב',
    chargeCurrency: 'מטבע חיוב',
    originalAmount: 'סכום עסקה מקורי',
    originalCurrency: 'מטבע עסקה מקורי',
    chargeDate: 'תאריך חיוב',
    notes: 'הערות',
    tags: 'תיוגים',
    discountClub: 'מועדון הנחות',
    discountKey: 'מפתח דיסקונט',
    executionMethod: 'אופן ביצוע ההעסקה',
    exchangeRate: 'שער המרה ממטבע מקור/התחשבנות לש"ח'
  }
};

export function parseMaxBankFile(arrayBuffer: ArrayBuffer, type: 'max-shekel' | 'max-foreign'): MaxBankTransaction[] {
  const data = new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(data, { type: 'array' });
  
  // Find the appropriate sheet
  const sheetName = type === 'max-shekel' ? 'עסקאות במועד החיוב' : 'עסקאות חו"ל ומט"ח';
  const worksheet = workbook.Sheets[sheetName] || workbook.Sheets[workbook.SheetNames[0]];
  
  if (!worksheet) {
    throw new Error(`Sheet "${sheetName}" not found`);
  }
  
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 3 }); // Headers on row 4 (index 3)
  
  if (jsonData.length < 2) {
    throw new Error('No data found in MAX file');
  }
  
  const headers = jsonData[0] as string[];
  const columnMap = type === 'max-shekel' ? MAX_COLUMNS.shekel : MAX_COLUMNS.foreign;
  
  console.log('MAX Bank headers found:', headers);
  
  // Find column indices
  const columnIndices: Record<string, number> = {};
  Object.entries(columnMap).forEach(([key, hebrewName]) => {
    const index = headers.findIndex(h => h && h.toString().trim() === hebrewName);
    if (index !== -1) {
      columnIndices[key] = index;
    }
  });
  
  console.log('MAX column indices found:', columnIndices);
  
  const transactions: MaxBankTransaction[] = [];
  
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    
    if (!row || row.length === 0) continue;
    
    try {
      const transaction = parseMaxBankRow(row, columnIndices, type);
      if (transaction) {
        transactions.push(transaction);
      }
    } catch (error) {
      console.warn(`Error parsing MAX row ${i}:`, error);
    }
  }
  
  console.log(`Parsed ${transactions.length} MAX Bank transactions`);
  return transactions;
}

function parseMaxBankRow(row: any[], columnIndices: Record<string, number>, type: 'max-shekel' | 'max-foreign'): MaxBankTransaction | null {
  const getValue = (key: string) => {
    const index = columnIndices[key];
    return index !== undefined ? row[index] : null;
  };
  
  const dateValue = getValue('date');
  const merchantValue = getValue('merchant');
  const chargeAmountValue = getValue('chargeAmount');
  
  if (!dateValue || !merchantValue || chargeAmountValue === null || chargeAmountValue === undefined) {
    return null;
  }
  
  // Parse date
  let date: Date;
  if (typeof dateValue === 'string') {
    date = new Date(dateValue);
  } else if (typeof dateValue === 'number') {
    // Excel date number
    date = new Date((dateValue - 25569) * 86400 * 1000);
  } else {
    date = new Date(dateValue);
  }
  
  if (isNaN(date.getTime())) {
    console.warn('Invalid date in MAX row:', dateValue);
    return null;
  }
  
  // Parse amount
  let amount: number;
  if (typeof chargeAmountValue === 'string') {
    amount = parseFloat(chargeAmountValue.replace(/[^\d\-\.]/g, ''));
  } else {
    amount = Number(chargeAmountValue);
  }
  
  if (isNaN(amount)) {
    console.warn('Invalid amount in MAX row:', chargeAmountValue);
    return null;
  }
  
  // MAX transactions are expenses, so make them negative
  if (amount > 0) {
    amount = -amount;
  }
  
  return {
    date: date.toISOString().split('T')[0],
    merchant: String(merchantValue || '').trim(),
    category: String(getValue('category') || '').trim(),
    cardDigits: String(getValue('cardDigits') || '').trim(),
    transactionType: String(getValue('transactionType') || '').trim(),
    chargeAmount: amount,
    chargeCurrency: String(getValue('chargeCurrency') || 'ILS').trim(),
    originalAmount: Number(getValue('originalAmount')) || amount,
    originalCurrency: String(getValue('originalCurrency') || 'ILS').trim(),
    chargeDate: String(getValue('chargeDate') || dateValue).trim(),
    notes: String(getValue('notes') || '').trim(),
    tags: String(getValue('tags') || '').trim(),
    source: 'max'
  };
}

export function convertMaxToStandardTransaction(maxTransaction: MaxBankTransaction): Transaction {
  const description = `${maxTransaction.merchant} - ${maxTransaction.category}`.trim();
  
  return {
    id: `max-${maxTransaction.date}-${maxTransaction.chargeAmount}-${Math.random().toString(36).substr(2, 9)}`,
    date: maxTransaction.date,
    description,
    amount: maxTransaction.chargeAmount,
    bank: 'max',
    reference: maxTransaction.cardDigits,
    location: maxTransaction.merchant
  };
}
