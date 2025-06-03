import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Transaction, BankType, BankConfig } from '../types/finance';
import { parseDiscountBankFile, convertDiscountToStandardTransaction } from './discountBankParser';

const bankConfigs: Record<BankType, BankConfig> = {
  max: {
    name: 'בנק מקס',
    dateColumn: 'תאריך',
    descriptionColumn: 'תיאור',
    amountColumn: 'סכום',
    balanceColumn: 'יתרה',
    dateFormat: 'DD/MM/YYYY'
  },
  discount: {
    name: 'בנק דיסקונט',
    dateColumn: 'תאריך פעולה',
    descriptionColumn: 'תיאור פעולה',
    amountColumn: 'חיוב',
    balanceColumn: 'יתרה',
    dateFormat: 'DD/MM/YYYY'
  },
  cal: {
    name: 'CAL',
    dateColumn: 'Date',
    descriptionColumn: 'Description',
    amountColumn: 'Amount',
    dateFormat: 'MM/DD/YYYY'
  },
  unknown: {
    name: 'לא ידוע',
    dateColumn: 'date',
    descriptionColumn: 'description',
    amountColumn: 'amount'
  }
};

export async function parseFileData(file: File, bankType?: string): Promise<Transaction[]> {
  console.log(`Parsing file: ${file.name}, type: ${file.type}, size: ${file.size}, bankType: ${bankType}`);
  
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  let data: any[];

  try {
    if (fileExtension === 'csv') {
      data = await parseCSV(file);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const arrayBuffer = await file.arrayBuffer();
      
      // Check if this is a specific Discount Bank file type
      if (bankType === 'discount-transactions' || bankType === 'discount-credit') {
        try {
          const discountTransactions = parseDiscountBankFile(arrayBuffer, bankType);
          if (discountTransactions.length > 0) {
            console.log(`Successfully parsed ${discountTransactions.length} transactions with enhanced Discount Bank parser`);
            return discountTransactions.map(convertDiscountToStandardTransaction);
          }
        } catch (discountError) {
          console.log('Enhanced Discount Bank parsing failed:', discountError);
          throw discountError;
        }
      }
      
      // For auto-detection or other bank types, try enhanced Discount Bank parsing first
      if (!bankType || bankType === 'auto') {
        try {
          const discountTransactions = parseDiscountBankFile(arrayBuffer);
          if (discountTransactions.length > 0) {
            console.log(`Successfully parsed ${discountTransactions.length} transactions with enhanced Discount Bank parser`);
            return discountTransactions.map(convertDiscountToStandardTransaction);
          }
        } catch (discountError) {
          console.log('Enhanced Discount Bank parsing failed, falling back to generic XLSX parsing:', discountError);
        }
      }
      
      // Fall back to generic XLSX parsing
      data = await parseXLSXFromBuffer(arrayBuffer);
    } else {
      throw new Error(`Unsupported file format: ${fileExtension}`);
    }

    console.log(`Parsed ${data.length} rows from ${file.name}`);
    
    // Detect bank type based on column headers
    const detectedBankType = detectBankType(data[0] || {});
    console.log(`Detected bank type: ${detectedBankType}`);
    
    // Convert to transactions
    const transactions = convertToTransactions(data, detectedBankType);
    console.log(`Converted to ${transactions.length} transactions`);
    
    return transactions;
  } catch (error) {
    console.error('Error parsing file:', error);
    throw new Error(`Failed to parse ${file.name}: ${error}`);
  }
}

async function parseCSV(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (result) => {
        if (result.errors.length > 0) {
          console.warn('CSV parsing warnings:', result.errors);
        }
        resolve(result.data);
      },
      error: (error) => reject(error)
    });
  });
}

async function parseXLSX(file: File): Promise<any[]> {
  const arrayBuffer = await file.arrayBuffer();
  return parseXLSXFromBuffer(arrayBuffer);
}

function parseXLSXFromBuffer(arrayBuffer: ArrayBuffer): any[] {
  const data = new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  // Convert to object format with headers
  const headers = jsonData[0] as string[];
  const rows = jsonData.slice(1).map(row => {
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = (row as any[])[index];
    });
    return obj;
  });
  
  return rows;
}

function detectBankType(firstRow: any): BankType {
  const headers = Object.keys(firstRow).map(h => h.toLowerCase());
  
  // Enhanced Discount Bank detection
  if (headers.some(h => h.includes('תאריך פעולה') || h.includes('תיאור פעולה'))) {
    return 'discount';
  }
  
  // MAX Bank detection
  if (headers.some(h => h.includes('תאריך') || h.includes('יתרה'))) {
    return 'max';
  }
  
  // CAL detection
  if (headers.includes('date') && !headers.includes('balance')) {
    return 'cal';
  }
  
  // Generic detection for Discount if other methods fail
  if (headers.includes('date') && headers.includes('description') && headers.includes('amount')) {
    return 'discount';
  }
  
  return 'unknown';
}

function convertToTransactions(data: any[], bankType: BankType): Transaction[] {
  const config = bankConfigs[bankType];
  const transactions: Transaction[] = [];
  
  for (const row of data) {
    try {
      const transaction = convertRowToTransaction(row, config, bankType);
      if (transaction) {
        transactions.push(transaction);
      }
    } catch (error) {
      console.warn('Failed to convert row:', row, error);
    }
  }
  
  return transactions;
}

function convertRowToTransaction(row: any, config: BankConfig, bankType: BankType): Transaction | null {
  // Extract values based on config
  const dateValue = row[config.dateColumn];
  const descriptionValue = row[config.descriptionColumn];
  const amountValue = row[config.amountColumn];
  
  if (!dateValue || !descriptionValue || amountValue === undefined) {
    return null;
  }
  
  // Parse date
  let date: Date;
  if (typeof dateValue === 'string') {
    // Handle different date formats
    const cleanDate = dateValue.replace(/[^\d\/\-\.]/g, '');
    date = new Date(cleanDate);
  } else if (dateValue instanceof Date) {
    date = dateValue;
  } else {
    // Excel date number
    date = new Date((dateValue - 25569) * 86400 * 1000);
  }
  
  if (isNaN(date.getTime())) {
    console.warn('Invalid date:', dateValue);
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
    console.warn('Invalid amount:', amountValue);
    return null;
  }
  
  // Parse balance if available
  let balance: number | undefined;
  if (config.balanceColumn && row[config.balanceColumn]) {
    const balanceValue = row[config.balanceColumn];
    if (typeof balanceValue === 'string') {
      balance = parseFloat(balanceValue.replace(/[^\d\-\.]/g, ''));
    } else {
      balance = Number(balanceValue);
    }
  }
  
  return {
    id: `${bankType}-${date.getTime()}-${amount}-${Math.random().toString(36).substr(2, 9)}`,
    date: date.toISOString().split('T')[0],
    description: String(descriptionValue).trim(),
    amount,
    balance: !isNaN(balance!) ? balance : undefined,
    bank: bankType,
    reference: config.referenceColumn ? row[config.referenceColumn] : undefined
  };
}
