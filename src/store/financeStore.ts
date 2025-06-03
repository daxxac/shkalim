import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Transaction, BankType, Category } from '../types/finance';
import { encryptData, decryptData } from '../utils/encryption';
import { parseFileData } from '../utils/fileParser';
import { categorizeTransaction } from '../utils/categorization';

interface FinanceState {
  transactions: Transaction[];
  categories: Category[];
  isLocked: boolean;
  isInitialized: boolean;
  masterPasswordHash: string | null;
  currentLanguage: 'ru' | 'en';
  
  // Actions
  initializeStore: () => void;
  unlock: (password: string) => Promise<void>;
  lock: () => void;
  setMasterPassword: (password: string) => void;
  panicMode: () => void;
  setLanguage: (lang: 'ru' | 'en') => void;
  
  addTransactions: (file: File, bankType?: string) => Promise<void>;
  updateTransactionCategory: (id: string, categoryId: string) => void;
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  
  getTransactionsByCategory: () => Record<string, Transaction[]>;
  getMonthlyBalance: () => Array<{month: string, balance: number}>;
  getTopExpenses: (limit?: number) => Transaction[];
}

const defaultCategories: Category[] = [
  { id: 'food', name: 'Еда', color: '#ef4444', rules: ['магнит', 'пятерочка', 'перекресток', 'ашан'] },
  { id: 'transport', name: 'Транспорт', color: '#3b82f6', rules: ['азс', 'метро', 'такси', 'яндекс'] },
  { id: 'shopping', name: 'Покупки', color: '#8b5cf6', rules: ['wildberries', 'ozon', 'мвидео'] },
  { id: 'bills', name: 'Счета', color: '#f59e0b', rules: ['жкх', 'мтс', 'билайн', 'мегафон'] },
  { id: 'healthcare', name: 'Здоровье', color: '#10b981', rules: ['аптека', 'поликлиника', 'больница'] },
  { id: 'entertainment', name: 'Развлечения', color: '#ec4899', rules: ['кино', 'ресторан', 'кафе'] },
  { id: 'salary', name: 'Зарплата', color: '#22c55e', rules: ['зарплата', 'заработная плата'] },
  { id: 'other', name: 'Прочее', color: '#6b7280', rules: [] },
];

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      transactions: [],
      categories: defaultCategories,
      isLocked: true,
      isInitialized: false,
      masterPasswordHash: null,
      currentLanguage: 'ru',

      initializeStore: () => {
        const state = get();
        const hasPassword = !!state.masterPasswordHash;
        set({ isInitialized: true, isLocked: hasPassword });
      },

      unlock: async (password: string) => {
        const state = get();
        
        if (!state.masterPasswordHash) {
          // First time setup
          const hash = await hashPassword(password);
          set({ masterPasswordHash: hash, isLocked: false });
          return;
        }
        
        const isValid = await verifyPassword(password, state.masterPasswordHash);
        if (!isValid) {
          throw new Error('Invalid password');
        }
        
        set({ isLocked: false });
      },

      lock: () => set({ isLocked: true }),

      setMasterPassword: async (password: string) => {
        const hash = await hashPassword(password);
        set({ masterPasswordHash: hash });
      },

      panicMode: () => {
        localStorage.clear();
        indexedDB.deleteDatabase('finance-app');
        window.location.reload();
      },

      setLanguage: (lang: 'ru' | 'en') => {
        set({ currentLanguage: lang });
      },

      addTransactions: async (file: File, bankType?: string) => {
        try {
          const newTransactions = await parseFileData(file, bankType);
          const { transactions, categories } = get();
          
          // Enhanced duplicate detection
          const existingTransactionKeys = new Set(
            transactions.map(t => `${t.date}-${t.amount}-${t.description.substring(0, 50)}`)
          );
          
          const uniqueTransactions = newTransactions.filter(t => {
            const key = `${t.date}-${t.amount}-${t.description.substring(0, 50)}`;
            return !existingTransactionKeys.has(key);
          });
          
          // Filter out duplicate credit card charges if we already have detailed transactions
          const filteredTransactions = uniqueTransactions.filter(newTransaction => {
            // If this is a CAL charge (כ.א.ל חיוב), check if we already have detailed CAL transactions
            if (newTransaction.description.includes('כ.א.ל חיוב') || newTransaction.description.includes('CAL')) {
              const hasDetailedCALTransactions = transactions.some(existing => 
                existing.bank === 'cal' && 
                Math.abs(new Date(existing.date).getTime() - new Date(newTransaction.date).getTime()) < 7 * 24 * 60 * 60 * 1000 // within 7 days
              );
              return !hasDetailedCALTransactions;
            }
            return true;
          });
          
          // Auto-categorize new transactions
          const categorizedTransactions = filteredTransactions.map(transaction => ({
            ...transaction,
            category: categorizeTransaction(transaction, categories)
          }));
          
          set({ 
            transactions: [...transactions, ...categorizedTransactions].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            )
          });
          
          console.log(`Added ${categorizedTransactions.length} new transactions`);
        } catch (error) {
          console.error('Error adding transactions:', error);
          throw error;
        }
      },

      updateTransactionCategory: (id: string, categoryId: string) => {
        set(state => ({
          transactions: state.transactions.map(t =>
            t.id === id ? { ...t, category: categoryId } : t
          )
        }));
      },

      addCategory: (category) => {
        const newCategory = { ...category, id: Date.now().toString() };
        set(state => ({
          categories: [...state.categories, newCategory]
        }));
      },

      updateCategory: (id: string, updates: Partial<Category>) => {
        set(state => ({
          categories: state.categories.map(c =>
            c.id === id ? { ...c, ...updates } : c
          )
        }));
      },

      deleteCategory: (id: string) => {
        set(state => ({
          categories: state.categories.filter(c => c.id !== id),
          transactions: state.transactions.map(t =>
            t.category === id ? { ...t, category: 'other' } : t
          )
        }));
      },

      getTransactionsByCategory: () => {
        const { transactions } = get();
        return transactions.reduce((acc, transaction) => {
          const category = transaction.category || 'other';
          if (!acc[category]) acc[category] = [];
          acc[category].push(transaction);
          return acc;
        }, {} as Record<string, Transaction[]>);
      },

      getMonthlyBalance: () => {
        const { transactions } = get();
        const monthlyData: Record<string, number> = {};
        
        transactions.forEach(transaction => {
          const date = new Date(transaction.date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthlyData[monthKey] = (monthlyData[monthKey] || 0) + transaction.amount;
        });
        
        return Object.entries(monthlyData)
          .map(([month, balance]) => ({ month, balance }))
          .sort((a, b) => a.month.localeCompare(b.month));
      },

      getTopExpenses: (limit = 10) => {
        const { transactions } = get();
        return transactions
          .filter(t => t.amount < 0)
          .sort((a, b) => a.amount - b.amount)
          .slice(0, limit);
      },
    }),
    {
      name: 'finance-storage',
      partialize: (state) => ({
        transactions: state.transactions,
        categories: state.categories,
        masterPasswordHash: state.masterPasswordHash,
        currentLanguage: state.currentLanguage,
      }),
    }
  )
);

// Helper functions for password hashing
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}
