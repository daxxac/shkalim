import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Transaction, BankType, BankConfig } from '../types/finance';
import { parseDiscountBankFile, convertDiscountToStandardTransaction, ParsedDiscountOutput } from './discountBankParser';
import { parseMaxBankFile, convertMaxToStandardTransaction } from './maxBankParser';
import { parseCalBankFile, convertCalToStandardTransaction } from './calBankParser';

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

export interface UnifiedParsingResult {
  processedTransactions: Transaction[];
  processedUpcomingCharges?: Transaction[];
}

export async function parseFileData(file: File, bankType?: string): Promise<UnifiedParsingResult> {
  console.log(`Parsing file: ${file.name}, type: ${file.type}, size: ${file.size}, bankType: ${bankType}`);
  
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  let genericData: any[]; // For CSV or fallback XLSX

  try {
    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const arrayBuffer = await file.arrayBuffer();
      
      // Handle specific bank types first
      // Added 'discount' to catch general discount bank type if more specific (transactions/credit) isn't provided
      if (bankType === 'discount' || bankType === 'discount-transactions' || bankType === 'discount-credit') {
        try {
          const discountResult: ParsedDiscountOutput = parseDiscountBankFile(arrayBuffer, bankType);
          const mainTransactions = discountResult.mainAccountTransactions.map(convertDiscountToStandardTransaction);
          const creditCardTransactions = discountResult.creditCardTransactions.map(convertDiscountToStandardTransaction);
          
          console.log(`Discount: Parsed ${mainTransactions.length} main Txs, ${creditCardTransactions.length} CC Txs.`);
          return {
            processedTransactions: mainTransactions,
            processedUpcomingCharges: creditCardTransactions
          };
        } catch (discountError) {
          console.warn('Specific Discount Bank parsing failed, will try auto or generic:', discountError);
          // Fall through to auto-detection or generic if specific parse fails
        }
      }
      
      if (bankType === 'max' || bankType === 'max-shekel' || bankType === 'max-foreign') {
        try {
          // parseMaxBankFile expects 'max-shekel' or 'max-foreign'. If 'max' is given, default to 'max-shekel'.
          const specificMaxType = (bankType === 'max' ? 'max-shekel' : bankType) as 'max-shekel' | 'max-foreign';
          const maxTransactions = parseMaxBankFile(arrayBuffer, specificMaxType);
          console.log(`MAX: Parsed ${maxTransactions.length} transactions using type ${specificMaxType}.`);
          return { processedTransactions: maxTransactions.map(convertMaxToStandardTransaction) };
        } catch (maxError) {
          console.warn('Specific MAX Bank parsing failed, will try auto or generic:', maxError);
        }
      }
      
      if (bankType === 'cal') {
        try {
          const calTransactions = parseCalBankFile(arrayBuffer);
          console.log(`CAL: Parsed ${calTransactions.length} transactions.`);
          return { processedTransactions: calTransactions.map(convertCalToStandardTransaction) };
        } catch (calError) {
          console.warn('Specific CAL Bank parsing failed, will try auto or generic:', calError);
        }
      }
      
      // Auto-detection if bankType is 'auto' or not specifically handled above
      if (!bankType || bankType === 'auto') {
        // Try Discount Bank first in auto-detection
        try {
          const discountResult: ParsedDiscountOutput = parseDiscountBankFile(arrayBuffer); // No bankType hint for full auto
          const mainTransactions = discountResult.mainAccountTransactions.map(convertDiscountToStandardTransaction);
          const creditCardTransactions = discountResult.creditCardTransactions.map(convertDiscountToStandardTransaction);

          // Check if any transactions were actually parsed by Discount parser
          if (mainTransactions.length > 0 || creditCardTransactions.length > 0) {
            console.log(`Auto-Discount: Parsed ${mainTransactions.length} main Txs, ${creditCardTransactions.length} CC Txs.`);
            return {
              processedTransactions: mainTransactions,
              processedUpcomingCharges: creditCardTransactions
            };
          }
        } catch (discountError) {
          console.log('Auto-detection: Discount Bank parsing attempt failed:', discountError);
        }
        
        // Try MAX Bank
        try {
          // Try with 'max-shekel' as a common default for auto-detection
          const maxTransactions = parseMaxBankFile(arrayBuffer, 'max-shekel');
          if (maxTransactions.length > 0) {
            console.log(`Auto-MAX: Parsed ${maxTransactions.length} transactions.`);
            return { processedTransactions: maxTransactions.map(convertMaxToStandardTransaction) };
          }
        } catch (maxError) {
          console.log('Auto-detection: MAX Bank parsing attempt failed:', maxError);
        }
        
        // Try CAL Bank
        try {
          const calTransactions = parseCalBankFile(arrayBuffer);
          if (calTransactions.length > 0) {
            console.log(`Auto-CAL: Parsed ${calTransactions.length} transactions.`);
            return { processedTransactions: calTransactions.map(convertCalToStandardTransaction) };
          }
        } catch (calError) {
          console.log('Auto-detection: CAL Bank parsing attempt failed:', calError);
        }
      }
      
      // Fall back to generic XLSX parsing if all specific/auto attempts fail for XLSX/XLS
      console.log('Falling back to generic XLSX parsing for XLSX/XLS file.');
      genericData = await parseXLSXFromBuffer(arrayBuffer);

    } else if (fileExtension === 'csv') {
      console.log('Parsing CSV file.');
      genericData = await parseCSV(file);
    } else {
      throw new Error(`Unsupported file format: ${fileExtension}`);
    }

    // Process genericData (from CSV or fallback XLSX)
    console.log(`Generic parse: Parsed ${genericData.length} rows from ${file.name}`);
    const detectedBankType = detectBankType(genericData[0] || {});
    console.log(`Generic parse: Detected bank type: ${detectedBankType}`);
    const transactions = convertToTransactions(genericData, detectedBankType);
    console.log(`Generic parse: Converted to ${transactions.length} transactions.`);
    return { processedTransactions: transactions };

  } catch (error) {
    console.error('Error in parseFileData:', error);
    throw new Error(`Failed to parse ${file.name}: ${error instanceof Error ? error.message : String(error)}`);
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
