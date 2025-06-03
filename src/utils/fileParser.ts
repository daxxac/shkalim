
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Transaction, BankType, BankConfig } from '../types/finance';

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
    dateColumn: 'DATE',
    descriptionColumn: 'DESCRIPTION',
    amountColumn: 'AMOUNT',
    balanceColumn: 'BALANCE',
    dateFormat: 'YYYY-MM-DD'
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

export async function parseFileData(file: File): Promise<Transaction[]> {
  console.log(`Parsing file: ${file.name}, type: ${file.type}, size: ${file.size}`);
  
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  let data: any[];

  try {
    if (fileExtension === 'csv') {
      data = await parseCSV(file);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      data = await parseXLSX(file);
    } else {
      throw new Error(`Unsupported file format: ${fileExtension}`);
    }

    console.log(`Parsed ${data.length} rows from ${file.name}`);
    
    // Detect bank type based on column headers
    const bankType = detectBankType(data[0] || {});
    console.log(`Detected bank type: ${bankType}`);
    
    // Convert to transactions
    const transactions = convertToTransactions(data, bankType);
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
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
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
        
        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

function detectBankType(firstRow: any): BankType {
  const headers = Object.keys(firstRow).map(h => h.toLowerCase());
  
  // MAX Bank detection
  if (headers.some(h => h.includes('תאריך') || h.includes('יתרה'))) {
    return 'max';
  }
  
  // Discount Bank detection
  if (headers.includes('date') && headers.includes('description') && headers.includes('amount')) {
    return 'discount';
  }
  
  // CAL detection
  if (headers.includes('date') && !headers.includes('balance')) {
    return 'cal';
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
