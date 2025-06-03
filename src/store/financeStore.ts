import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Transaction, BankType, Category } from '../types/finance';
import { encryptData, decryptData } from '../utils/encryption';
import { parseFileData } from '../utils/fileParser';
import { categorizeTransaction } from '../utils/categorization';
import Papa from 'papaparse';

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
  
  // New actions
  resetAllData: () => void;
  uploadCategoriesCSV: (file: File) => Promise<void>;
  
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

      resetAllData: () => {
        set({ 
          transactions: [],
          categories: defaultCategories
        });
      },

      uploadCategoriesCSV: async (file: File) => {
        return new Promise((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            encoding: 'UTF-8',
            complete: (result) => {
              try {
                const { transactions, categories } = get();
                const categoriesMap: Record<string, string> = {};
                const newCategoriesToCreate: Set<string> = new Set();
                
                // Parse CSV data to create mapping
                result.data.forEach((row: any) => {
                  const transaction = row['транзакция'] || row['transaction'] || row['description'];
                  const category = row['категория'] || row['category'];
                  
                  if (transaction && category) {
                    // Store both exact match and lowercase for flexible matching
                    categoriesMap[transaction.trim()] = category.trim();
                    categoriesMap[transaction.toLowerCase().trim()] = category.trim();
                    
                    // Collect unique category names for potential creation
                    newCategoriesToCreate.add(category.trim());
                  }
                });

                console.log('Categories mapping created:', categoriesMap);
                console.log('Total transactions to process:', transactions.length);
                
                // Log first 10 transaction descriptions for debugging
                console.log('Sample transaction descriptions:', 
                  transactions.slice(0, 10).map(t => `"${t.description}"`)
                );

                // Create missing categories
                const existingCategoryNames = new Set(categories.map(c => c.name.toLowerCase()));
                const existingCategoryIds = new Set(categories.map(c => c.id.toLowerCase()));
                
                const categoriesToAdd: Category[] = [];
                const categoryNameToId: Record<string, string> = {};
                
                // Map existing categories
                categories.forEach(cat => {
                  categoryNameToId[cat.name.toLowerCase()] = cat.id;
                  categoryNameToId[cat.id.toLowerCase()] = cat.id;
                });
                
                newCategoriesToCreate.forEach(categoryName => {
                  const lowerCaseName = categoryName.toLowerCase();
                  
                  // Skip if category already exists
                  if (existingCategoryNames.has(lowerCaseName) || existingCategoryIds.has(lowerCaseName)) {
                    return;
                  }
                  
                  // Create new category
                  const categoryId = categoryName.toLowerCase().replace(/[^a-zа-я0-9]/g, '_');
                  const newCategory: Category = {
                    id: categoryId,
                    name: categoryName,
                    color: getRandomColor(),
                    rules: []
                  };
                  
                  categoriesToAdd.push(newCategory);
                  categoryNameToId[lowerCaseName] = categoryId;
                  
                  console.log(`Creating new category: "${categoryName}" with id: "${categoryId}"`);
                });

                // Update transactions with new categories
                let updatedCount = 0;
                const updatedTransactions = transactions.map(transaction => {
                  // Try exact match first
                  let matchingCategory = categoriesMap[transaction.description.trim()];
                  
                  // If no exact match, try lowercase match
                  if (!matchingCategory) {
                    matchingCategory = categoriesMap[transaction.description.toLowerCase().trim()];
                  }
                  
                  // If still no match, try partial matching for backwards compatibility
                  if (!matchingCategory) {
                    const matchingKey = Object.keys(categoriesMap).find(key =>
                      transaction.description.toLowerCase().includes(key.toLowerCase()) ||
                      key.toLowerCase().includes(transaction.description.toLowerCase())
                    );
                    if (matchingKey) {
                      matchingCategory = categoriesMap[matchingKey];
                      console.log(`Partial match found: "${transaction.description}" matched with "${matchingKey}" -> "${matchingCategory}"`);
                    }
                  }
                  
                  if (matchingCategory) {
                    // Find category ID by name or existing mapping
                    let categoryId = categoryNameToId[matchingCategory.toLowerCase()];
                    
                    if (!categoryId) {
                      // Fallback to 'other' if still not found
                      categoryId = 'other';
                      console.log(`Fallback to 'other' for category: "${matchingCategory}"`);
                    }
                    
                    if (transaction.category !== categoryId) {
                      updatedCount++;
                      console.log(`Updated transaction: "${transaction.description}" -> category: "${categoryId}"`);
                    }
                    
                    return { ...transaction, category: categoryId };
                  }
                  
                  return transaction;
                });

                console.log(`Created ${categoriesToAdd.length} new categories`);
                console.log(`Updated ${updatedCount} transactions with categories from CSV`);
                
                // Update store with new categories and updated transactions
                set({ 
                  categories: [...categories, ...categoriesToAdd],
                  transactions: updatedTransactions 
                });
                
                resolve();
              } catch (error) {
                console.error('Error processing categories CSV:', error);
                reject(error);
              }
            },
            error: (error) => reject(error)
          });
        });
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

// Helper function to generate random colors for new categories
function getRandomColor(): string {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', 
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

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
