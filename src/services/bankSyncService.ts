
import { BankAccount, SyncResult } from '../types/banking';
import { Transaction } from '../types/finance';

class BankSyncService {
  private localApiUrl = 'http://localhost:3001/api';

  async syncAccount(account: BankAccount): Promise<SyncResult> {
    try {
      // Проверяем доступность локального сервера
      try {
        await fetch(`${this.localApiUrl}/health`, { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          mode: 'cors',
        });
      } catch (error) {
        throw new Error('Локальный сервер не работает. Запустите локальный сервер синхронизации');
      }

      // Отправляем запрос на синхронизацию
      const response = await fetch(`${this.localApiUrl}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bankType: account.bankType,
          username: account.username,
          password: account.password,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Ошибка синхронизации');
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
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
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

  // Проверка доступности локального сервера
  async checkServerRunning(): Promise<boolean> {
    try {
      const response = await fetch(`${this.localApiUrl}/health`, { mode: 'cors' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

export const bankSyncService = new BankSyncService();

// Экспортируем функцию для обратной совместимости
export const syncBankAccount = (account: BankAccount): Promise<SyncResult> => {
  return bankSyncService.mockSync(account);
};
