
export interface BankAccount {
  id: string;
  bankType: 'max' | 'discount' | 'cal';
  username: string;
  password: string; // будет храниться в зашифрованном виде
  isActive: boolean;
  lastSync?: string;
  nickname?: string;
}

export interface SyncResult {
  success: boolean;
  transactionsCount?: number;
  error?: string;
}
