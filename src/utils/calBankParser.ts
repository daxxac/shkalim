
import * as XLSX from 'xlsx';
import { Transaction } from '../types/finance';

export interface CalBankTransaction {
  date: string;
  merchant: string;
  amount: number;
  card: string;
  chargeDate: string;
  transactionType: string;
  digitalWalletId?: string;
  notes?: string;
  source: 'cal';
}

// Column mappings for CAL Bank files
const CAL_COLUMNS = {
  date: 'תאריך\nעסקה',
  merchant: 'שם בית עסק',
  amount: 'סכום\nבש"ח',
  card: 'כרטיס',
  chargeDate: 'מועד\nחיוב',
  transactionType: 'סוג\nעסקה',
  digitalWalletId: 'מזהה כרטיס\nבארנק דיגילטי',
  notes: 'הערות'
};

export function parseCalBankFile(arrayBuffer: ArrayBuffer): CalBankTransaction[] {
  const data = new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(data, { type: 'array' });
  
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  
  if (!worksheet) {
    throw new Error('No worksheet found in CAL file');
  }
  
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  if (jsonData.length < 3) {
    throw new Error('No data found in CAL file');
  }
  
  // CAL files have headers in the second row (index 1), not the first
  const headers = jsonData[1] as string[];
  
  console.log('CAL Bank headers found:', headers);
  
  // Find column indices
  const columnIndices: Record<string, number> = {};
  Object.entries(CAL_COLUMNS).forEach(([key, hebrewName]) => {
    const index = headers.findIndex(h => h && h.toString().trim() === hebrewName);
    if (index !== -1) {
      columnIndices[key] = index;
    }
  });
  
  console.log('CAL column indices found:', columnIndices);
  
  const transactions: CalBankTransaction[] = [];
  
  // Start from row 2 (index 2) since headers are in row 1 (index 1)
  for (let i = 2; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    
    if (!row || row.length === 0) continue;
    
    try {
      const transaction = parseCalBankRow(row, columnIndices);
      if (transaction) {
        transactions.push(transaction);
      }
    } catch (error) {
      console.warn(`Error parsing CAL row ${i}:`, error);
    }
  }
  
  console.log(`Parsed ${transactions.length} CAL Bank transactions`);
  return transactions;
}

function parseCalBankRow(row: any[], columnIndices: Record<string, number>): CalBankTransaction | null {
  const getValue = (key: string) => {
    const index = columnIndices[key];
    return index !== undefined ? row[index] : null;
  };
  
  const dateValue = getValue('date');
  const merchantValue = getValue('merchant');
  const amountValue = getValue('amount');
  
  if (!dateValue || !merchantValue || amountValue === null || amountValue === undefined) {
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
    console.warn('Invalid date in CAL row:', dateValue);
    return null;
  }
  
  // Parse amount
  let amount: number;
  if (typeof amountValue === 'string') {
    amount = parseFloat(amountValue.replace(/[^\d\-\.]/g, ''));
  } else {
    amount = Number(amountValue);
  }
  
  if (isNaN(amount)) {
    console.warn('Invalid amount in CAL row:', amountValue);
    return null;
  }
  
  // CAL transactions are expenses, so make them negative
  if (amount > 0) {
    amount = -amount;
  }
  
  return {
    date: date.toISOString().split('T')[0],
    merchant: String(merchantValue || '').trim(),
    amount,
    card: String(getValue('card') || '').trim(),
    chargeDate: String(getValue('chargeDate') || dateValue).trim(),
    transactionType: String(getValue('transactionType') || '').trim(),
    digitalWalletId: String(getValue('digitalWalletId') || '').trim(),
    notes: String(getValue('notes') || '').trim(),
    source: 'cal'
  };
}

export function convertCalToStandardTransaction(calTransaction: CalBankTransaction): Transaction {
  return {
    id: `cal-${calTransaction.date}-${calTransaction.amount}-${Math.random().toString(36).substr(2, 9)}`,
    date: calTransaction.date,
    description: calTransaction.merchant,
    amount: calTransaction.amount,
    bank: 'cal',
    reference: calTransaction.card,
    location: calTransaction.merchant
  };
}
