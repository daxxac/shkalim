
import * as XLSX from 'xlsx';
import { Transaction } from '../types/finance';

export interface CalBankTransaction {
  date: string;
  merchant: string;
  amount: number;
  card: string;
  chargeDate?: string; // Parsed and formatted charge date
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
  
  // Find the header row by looking for expected column names
  let headerRowIndex = -1;
  let headers: string[] = [];
  
  for (let i = 0; i < Math.min(5, jsonData.length); i++) {
    const row = jsonData[i] as string[];
    if (row && row.length > 3) {
      // Check if this row contains CAL column headers
      const hasDateColumn = row.some(cell => 
        cell && typeof cell === 'string' && 
        (cell.includes('תאריך') || cell.includes('עסקה'))
      );
      const hasMerchantColumn = row.some(cell => 
        cell && typeof cell === 'string' && 
        cell.includes('בית עסק')
      );
      const hasAmountColumn = row.some(cell => 
        cell && typeof cell === 'string' && 
        (cell.includes('סכום') || cell.includes('ש"ח'))
      );
      
      if (hasDateColumn && hasMerchantColumn && hasAmountColumn) {
        headerRowIndex = i;
        headers = row.map(cell => cell ? String(cell).replace(/\r/g, '') : '');
        break;
      }
    }
  }
  
  if (headerRowIndex === -1) {
    throw new Error('Could not find CAL header row');
  }
  
  console.log('CAL Bank headers found:', headers);
  console.log('Header row index:', headerRowIndex);
  
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
  
  // Start from the row after headers
  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
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
  const chargeDateValue = getValue('chargeDate');
  
  if (!dateValue || !merchantValue || amountValue === null || amountValue === undefined) {
    return null;
  }
  
  // Parse transaction date
  let transactionDateObj: Date | null = null;
  if (typeof dateValue === 'string') {
    // Attempt to parse common date formats, e.g., DD/MM/YYYY or YYYY-MM-DD
    const parts = dateValue.match(/(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})/);
    if (parts) {
      // Assuming DD/MM/YYYY for CAL, adjust if needed
      transactionDateObj = new Date(parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1]));
    } else {
      transactionDateObj = new Date(dateValue); // Fallback to direct parsing
    }
  } else if (typeof dateValue === 'number') {
    transactionDateObj = new Date((dateValue - 25569) * 86400 * 1000); // Excel date
  } else {
    transactionDateObj = new Date(dateValue); // Try direct
  }

  if (!transactionDateObj || isNaN(transactionDateObj.getTime())) {
    console.warn('Invalid transaction date in CAL row:', dateValue);
    return null;
  }
  const formattedTransactionDate = transactionDateObj.toISOString().split('T')[0];

  // Parse charge date
  let formattedChargeDate: string | undefined = undefined;
  if (chargeDateValue) {
    let chargeDateObj: Date | null = null;
    if (typeof chargeDateValue === 'string') {
      const parts = chargeDateValue.match(/(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})/);
      if (parts) {
        chargeDateObj = new Date(parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1]));
      } else {
        chargeDateObj = new Date(chargeDateValue);
      }
    } else if (typeof chargeDateValue === 'number') {
      chargeDateObj = new Date((chargeDateValue - 25569) * 86400 * 1000);
    } else {
      chargeDateObj = new Date(chargeDateValue);
    }

    if (chargeDateObj && !isNaN(chargeDateObj.getTime())) {
      formattedChargeDate = chargeDateObj.toISOString().split('T')[0];
    } else {
      console.warn('Invalid charge date in CAL row, using transaction date as fallback:', chargeDateValue);
      // formattedChargeDate = formattedTransactionDate; // Or leave undefined if parsing fails
    }
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
  
  // CAL transactions are expenses, so make them negative if they aren't already
  if (amount > 0) {
    amount = -amount;
  }
  
  return {
    date: formattedTransactionDate,
    merchant: String(merchantValue || '').trim(),
    amount,
    card: String(getValue('card') || '').trim(),
    chargeDate: formattedChargeDate, // Use the parsed and formatted charge date
    transactionType: String(getValue('transactionType') || '').trim(),
    digitalWalletId: String(getValue('digitalWalletId') || '').trim(),
    notes: String(getValue('notes') || '').trim(),
    source: 'cal'
  };
}

export function convertCalToStandardTransaction(calTransaction: CalBankTransaction): Transaction {
  return {
    id: `cal-${calTransaction.date}-${calTransaction.amount}-${Math.random().toString(36).substr(2, 9)}`,
    date: calTransaction.date, // This is the transaction date
    description: calTransaction.merchant,
    amount: calTransaction.amount,
    bank: 'cal',
    reference: calTransaction.card,
    location: calTransaction.merchant,
    chargeDate: calTransaction.chargeDate // Add the charge date here
  };
}
