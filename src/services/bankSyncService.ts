
import { BankAccount, SyncResult } from '../types/banking';
import { Transaction } from '../types/finance';

// Примечание: Puppeteer работает только в Node.js окружении
// Для веб-приложения нужен отдельный API сервер
class BankSyncService {
  private apiUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3001/api' 
    : '/api';

  async syncAccount(account: BankAccount): Promise<SyncResult> {
    try {
      const response = await fetch(`${this.apiUrl}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bankType: account.bankType,
          username: account.username,
          password: account.password,
        }),
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      const data = await response.json();
      return {
        success: true,
        transactionsCount: data.transactions?.length || 0,
      };
    } catch (error) {
      console.error('Bank sync error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Симуляция синхронизации для демонстрации
  async mockSync(account: BankAccount): Promise<SyncResult> {
    // Имитируем задержку
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Возвращаем моковые данные
    return {
      success: Math.random() > 0.3, // 70% успешных синхронизаций
      transactionsCount: Math.floor(Math.random() * 50) + 1,
    };
  }
}

export const bankSyncService = new BankSyncService();

// Экспортируем функцию для обратной совместимости
export const syncBankAccount = (account: BankAccount): Promise<SyncResult> => {
  return bankSyncService.mockSync(account);
};
