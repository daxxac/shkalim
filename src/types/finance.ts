
export interface Transaction {
  id: string;
  date: string; // дата транзакции
  chargeDate?: string; // дата списания (для кредитных карт)
  description: string;
  amount: number;
  balance?: number;
  category?: string;
  bank: BankType;
  reference?: string;
  location?: string;
  type?: 'transaction' | 'upcoming_charge';
}

export interface UpcomingCharge {
  id: string;
  date: string;
  description: string;
  amount: number;
  bank: BankType;
  category?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  rules: string[];
}

export type BankType = 'max' | 'discount' | 'cal' | 'unknown';

export interface BankConfig {
  name: string;
  dateColumn: string;
  descriptionColumn: string;
  amountColumn: string;
  balanceColumn?: string;
  referenceColumn?: string;
  chargeDateColumn?: string;
  encoding?: string;
  dateFormat?: string;
}

export interface FilterOptions {
  category?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  chargeDateRange?: {
    start: string;
    end: string;
  };
  amountRange?: {
    min: number;
    max: number;
  };
  searchText?: string;
  dateFilterType?: 'transaction' | 'charge';
}
