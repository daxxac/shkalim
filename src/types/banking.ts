
export type BankType = 'max' | 'discount' | 'cal';

export interface BankAccount {
  id: string;
  bankType: BankType;
  username: string;
  password: string; // будет храниться в зашифрованном виде
  accessCode?: string; // для банков, которые требуют дополнительный код (например, Discount)
  isActive: boolean;
  lastSync?: string;
  nickname?: string;
}

export interface SyncResult {
  success: boolean;
  transactionsCount?: number;
  error?: string;
}
