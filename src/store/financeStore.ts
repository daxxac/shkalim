import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../integrations/supabase/client';
import { Transaction, BankType, Category, UpcomingCharge } from '../types/finance';
import { encryptData, decryptData } from '../utils/encryption';
import { parseFileData } from '../utils/fileParser';
import { categorizeTransaction } from '../utils/categorization';
import Papa from 'papaparse';

interface FinanceState {
  transactions: Transaction[];
  upcomingCharges: UpcomingCharge[];
  categories: Category[];
  isDataLocked: boolean; // Renamed from isLocked
  isInitialized: boolean;
  isSupabaseAuthenticated: boolean; // Added
  encryptedDataBlob: string | null; // Для хранения зашифрованных данных
  _currentPasswordInMemory: string | null; // Временное хранение пароля в памяти (теперь для data encryption)
  currentLanguage: 'ru' | 'en' | 'he';
  
  // Actions
  _updateEncryptedBlob: () => Promise<void>; // Внутренний хелпер, но должен быть в типе для get()
  initializeStore: () => Promise<void>; // Changed to async
  unlockData: (dataEncryptionPassword: string) => Promise<void>; // New name
  lockData: () => void; // New name
  setDataEncryptionPassword: (newDataEncryptionPassword: string, oldDataEncryptionPassword?: string) => Promise<void>; // New name & signature
  panicMode: () => Promise<void>; // Changed to async
  setLanguage: (lang: 'ru' | 'en' | 'he') => void;

  // Supabase actions
  handleSupabaseSignUp: (email: string, password: string) => Promise<void>; // Added
  handleSupabaseLogin: (email: string, password: string) => Promise<void>;
  handleSupabaseLogout: () => Promise<void>;
  checkSupabaseSession: () => Promise<void>; // For initialization
  
  addTransactions: (file: File, bankType?: string) => Promise<void>;
  updateTransactionCategory: (id: string, categoryId: string) => void;
  updateUpcomingChargeCategory: (id: string, categoryId: string) => void;
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  
  // New actions
  resetAllData: () => Promise<void>; // Changed to Promise due to async nature
  uploadCategoriesCSV: (file: File) => Promise<void>;
  importSharedData: (data: { transactions: Transaction[]; categories: Category[]; upcomingCharges: UpcomingCharge[] }) => Promise<void>; // New action for importing
  
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
      upcomingCharges: [],
      categories: defaultCategories,
      isDataLocked: true, // Renamed from isLocked, по умолчанию заблокировано
      isInitialized: false,
      isSupabaseAuthenticated: false, // Reverted to false for actual Supabase auth
      encryptedDataBlob: null, // Начальное значение для зашифрованных данных
      _currentPasswordInMemory: null, // Временное хранение пароля в памяти, не персистентное
      currentLanguage: 'ru',
 
      // Внутренняя функция для обновления зашифрованного блока данных
      _updateEncryptedBlob: async () => {
        const state = get();
        if (!state.isDataLocked && state._currentPasswordInMemory) { // Changed isLocked to isDataLocked
          const sensitiveData = {
            transactions: state.transactions,
            upcomingCharges: state.upcomingCharges,
            categories: state.categories,
          };
          try {
            const newEncryptedBlob = await encryptData(sensitiveData, state._currentPasswordInMemory);
            set({ encryptedDataBlob: newEncryptedBlob });
          } catch (error) {
            console.error("Encryption failed during data update:", error);
            // Рассмотреть возможность блокировки хранилища или уведомления пользователя
            set({ isDataLocked: true, _currentPasswordInMemory: null }); // Блокируем в случае ошибки шифрования
          }
        }
      },
 
      initializeStore: async () => { // Changed to async
        await get().checkSupabaseSession(); // New logic
        set({ isInitialized: true }); // isDataLocked is handled by checkSupabaseSession/unlockData
      },

      checkSupabaseSession: async () => {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Error checking Supabase session:", error);
          set({ isSupabaseAuthenticated: false, isInitialized: true }); // Ensure initialized even on error
          return;
        }
        if (session) {
          set({ isSupabaseAuthenticated: true });
        } else {
          set({ isSupabaseAuthenticated: false, isDataLocked: true, _currentPasswordInMemory: null });
        }
      },

      handleSupabaseSignUp: async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) {
          set({ isSupabaseAuthenticated: false });
          throw error;
        }
        // Supabase often auto-logs-in the user on successful sign-up and returns a session.
        // Or, a confirmation email might be sent. For now, assume auto-login.
        if (data.session) {
          set({ isSupabaseAuthenticated: true });
        } else {
          // Handle cases where confirmation is needed - for now, treat as not fully authenticated
          // Or, prompt user to check email.
          set({ isSupabaseAuthenticated: false });
          // You might want to throw a specific error or return a status here
          // For simplicity, we'll let the UI handle "check your email" if no session.
          console.log("Sign up successful, but no immediate session. User might need to confirm email.");
        }
      },

      handleSupabaseLogin: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          set({ isSupabaseAuthenticated: false });
          throw error;
        }
        if (data.session) {
          set({ isSupabaseAuthenticated: true });
        } else {
           // Should not happen with password auth if no error, but as a safeguard
          set({ isSupabaseAuthenticated: false });
        }
      },

      handleSupabaseLogout: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error("Supabase signout error:", error);
          // Still proceed with client-side cleanup
        }
        set({
          isSupabaseAuthenticated: false,
          isDataLocked: true, // Lock data on logout
          _currentPasswordInMemory: null,
          transactions: [],
          upcomingCharges: [],
          categories: defaultCategories,
          // Keep encryptedDataBlob, so user can log back in and unlock
        });
      },
      
      unlockData: async (dataEncryptionPassword: string) => { // Renamed from unlock
        const state = get();
    
        // Removed Supabase auth check: local decryption should be independent
        // if (!state.isSupabaseAuthenticated) {
        //   // This check might be redundant if UI prevents calling this, but good for safety
        //   throw new Error("User not authenticated with Supabase.");
        // }
    
        if (state.encryptedDataBlob) {
          try {
            const decrypted = await decryptData(state.encryptedDataBlob, dataEncryptionPassword);
            set({
              transactions: decrypted.transactions || [],
              upcomingCharges: decrypted.upcomingCharges || [],
              categories: decrypted.categories || defaultCategories,
              isDataLocked: false, // Changed from isLocked
              _currentPasswordInMemory: dataEncryptionPassword,
            });
          } catch (error) {
            console.error("Decryption failed during data unlock:", error);
            set({ isDataLocked: true, _currentPasswordInMemory: null }); // Ensure data is locked
            throw new Error('Decryption failed. Data might be corrupted or password was changed.');
          }
        } else {
          // No data blob to decrypt, but user is authenticated.
          // This could be a new user or data was reset.
          set({
            isDataLocked: false, // No data to be locked
            _currentPasswordInMemory: dataEncryptionPassword, // Store for future encryption
            transactions: [],
            upcomingCharges: [],
            categories: defaultCategories,
          });
        }
      },
 
      lockData: () => { // Renamed from lock
        console.log('[financeStore] lockData called');
        set(state => {
          console.log('[financeStore] Current state before lockData:', state);
          const newState = {
            isDataLocked: true, // Changed from isLocked
            _currentPasswordInMemory: null,
            // Очищаем чувствительные данные из оперативной памяти
            transactions: [],
            upcomingCharges: [],
            categories: defaultCategories,
          };
          console.log('[financeStore] New state after lockData:', newState);
          return newState;
        });
      },
 
      setDataEncryptionPassword: async (newDataEncryptionPassword: string, oldDataEncryptionPassword?: string) => {
        const state = get();
    
        // Removed Supabase auth check: setting local encryption password should be independent
        // if (!state.isSupabaseAuthenticated) {
        //   throw new Error("User not authenticated with Supabase.");
        // }
        
        let currentSensitiveData = {
          transactions: state.transactions, // These might be empty if data is locked
          upcomingCharges: state.upcomingCharges,
          categories: state.categories,
        };

        if (oldDataEncryptionPassword && state.encryptedDataBlob) {
          // If changing password and data exists, decrypt with old password first
          try {
            const decrypted = await decryptData(state.encryptedDataBlob, oldDataEncryptionPassword);
            currentSensitiveData = { // Use the freshly decrypted data
              transactions: decrypted.transactions || [],
              upcomingCharges: decrypted.upcomingCharges || [],
              categories: decrypted.categories || defaultCategories,
            };
          } catch (error) {
            console.error("Failed to decrypt with old password during password change:", error);
            throw new Error("Old data encryption password was incorrect.");
          }
        } else if (!oldDataEncryptionPassword && state.encryptedDataBlob) {
          // This case means: setting a password for the first time (no oldPass) BUT a blob exists.
          // This implies the user logged out and back in, and now wants to set a password for existing data.
          // This is problematic because we don't know the key for the existing blob.
          // The flow should be: Supabase login -> unlockData (with existing key) -> then optionally setDataEncryptionPassword (to change it).
          // If encryptedDataBlob exists, oldDataEncryptionPassword MUST be provided to change it.
          // If it's the very first time (no blob), then oldDataEncryptionPassword is not needed.
          console.warn("Attempting to set a new data encryption password for existing encrypted data without providing the old password. This operation is blocked to prevent data loss. Please unlock data first if you wish to change the password.");
          throw new Error("Cannot set new password for existing encrypted data without the old password. Unlock data first.");
        }
        // If it's the very first time setting password (no blob yet), currentSensitiveData will be empty/default.

        try {
          const newEncryptedBlob = await encryptData(currentSensitiveData, newDataEncryptionPassword);
          set({
            encryptedDataBlob: newEncryptedBlob,
            isDataLocked: false,
            _currentPasswordInMemory: newDataEncryptionPassword,
            // Ensure the potentially just-decrypted or current state data is what's "live"
            transactions: currentSensitiveData.transactions,
            upcomingCharges: currentSensitiveData.upcomingCharges,
            categories: currentSensitiveData.categories,
          });
        } catch (error) {
          console.error("Encryption failed during data encryption password setup:", error);
          // Do not change _currentPasswordInMemory or isDataLocked if encryption fails
          throw new Error("Failed to set up data encryption password due to encryption error.");
        }
      },
 
      panicMode: async () => { // Changed to async
        if (get().isSupabaseAuthenticated) {
          await supabase.auth.signOut().catch(err => console.error("Supabase signout error during panic:", err));
        }
        localStorage.removeItem('finance-storage'); // Имя из persist config
 
        set({
          transactions: [],
          upcomingCharges: [],
          categories: defaultCategories,
          isDataLocked: true, // Ensure data is locked
          // isSupabaseAuthenticated: false, // KEEPING THIS TRUE or not setting it from true
                                         // to prevent Supabase login screen.
          isInitialized: false, // This will force re-check on reload, which will set isSupabaseAuth to true.
          encryptedDataBlob: null,
          _currentPasswordInMemory: null,
          currentLanguage: 'ru',
        });
        window.location.reload();
      },
 
      setLanguage: (lang: 'ru' | 'en' | 'he') => {
        set({ currentLanguage: lang });
      },

      resetAllData: async () => {
        // Make resetAllData behave like panicMode as per user feedback
        if (get().isSupabaseAuthenticated) {
          await supabase.auth.signOut().catch(err => console.error("Supabase signout error during resetAllData:", err));
        }
        localStorage.removeItem('finance-storage'); // Remove persisted blob

        set({
          transactions: [],
          upcomingCharges: [],
          categories: defaultCategories,
          isDataLocked: true, // Ensure data is locked
          isInitialized: false, // Force re-initialization on reload
          encryptedDataBlob: null,
          _currentPasswordInMemory: null,
          currentLanguage: 'ru', // Reset language to default like in panicMode
          // isSupabaseAuthenticated will be re-evaluated on next load by checkSupabaseSession
        });
        window.location.reload(); // Reload the page like panicMode
      },

      uploadCategoriesCSV: async (file: File) => {
        return new Promise((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            encoding: 'UTF-8',
            complete: async (result) => { // Делаем колбэк асинхронным
              try {
                const { transactions, categories } = get();
                const categoriesMap: Record<string, string> = {};
                const newCategoriesToCreate: Set<string> = new Set();
                
                // Parse CSV data to create mapping
                interface CsvRow {
                  'транзакция'?: string;
                  'transaction'?: string;
                  'description'?: string;
                  'категория'?: string;
                  'category'?: string;
                  [key: string]: string | number | boolean | null | undefined; // Для других возможных столбцов
                }
                result.data.forEach((row: CsvRow) => {
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
                // После обновления состояния, перешифровываем данные
                await get()._updateEncryptedBlob();
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
          const parseResult = await parseFileData(file, bankType);
          const { transactions: currentTransactions, upcomingCharges: currentUpcomingCharges, categories } = get();

          const newMainTransactions = parseResult.processedTransactions || [];
          const newUpcomingChargesSource = parseResult.processedUpcomingCharges || [];

          // Enhanced duplicate detection for regular transactions
          const existingTransactionKeys = new Set(
            currentTransactions.map(t => `${t.date}-${t.amount}-${t.description.substring(0, 50)}`)
          );
          
          const uniqueNewTransactions = newMainTransactions.filter(t => {
            const key = `${t.date}-${t.amount}-${t.description.substring(0, 50)}`;
            if (existingTransactionKeys.has(key)) {
              console.log('Duplicate main transaction skipped:', key);
              return false;
            }
            existingTransactionKeys.add(key); // Add to set after checking to prevent self-duplication if multiple identical in new batch
            return true;
          });

          // Auto-categorize new main transactions
          const categorizedNewTransactions = uniqueNewTransactions.map(transaction => ({
            ...transaction,
            category: categorizeTransaction(transaction, categories)
          }));
          
          // Enhanced duplicate detection for upcoming charges
          const existingChargeKeys = new Set(
            currentUpcomingCharges.map(t => `${t.date}-${t.amount}-${t.description.substring(0, 50)}`)
          );

          const uniqueNewUpcomingCharges = newUpcomingChargesSource
            .map(t => ({ // Ensure they are in UpcomingCharge format
              id: t.id,
              date: t.chargeDate || t.date, // Prefer chargeDate for upcoming, fallback to transaction date
              description: t.description,
              amount: t.amount,
              bank: t.bank,
              category: categorizeTransaction(t, categories) // Categorize before adding
            } as UpcomingCharge))
            .filter(t => {
              const key = `${t.date}-${t.amount}-${t.description.substring(0, 50)}`;
               if (existingChargeKeys.has(key)) {
                console.log('Duplicate upcoming charge skipped:', key);
                return false;
              }
              existingChargeKeys.add(key);
              return true;
            });

          set(state => ({
            transactions: [...state.transactions, ...categorizedNewTransactions].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            ),
            upcomingCharges: [...state.upcomingCharges, ...uniqueNewUpcomingCharges].sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            )
          }));
          
          console.log(`Added ${categorizedNewTransactions.length} new transactions to main list.`);
          console.log(`Added ${uniqueNewUpcomingCharges.length} new upcoming charges.`);
          
          // После обновления состояния, перешифровываем данные
          await get()._updateEncryptedBlob();
        } catch (error) {
          console.error('Error adding transactions:', error);
          throw error;
        }
      },

      updateTransactionCategory: async (id: string, categoryId: string) => {
        set(state => ({
          transactions: state.transactions.map(t =>
            t.id === id ? { ...t, category: categoryId } : t
          )
        }));
        await get()._updateEncryptedBlob();
      },

      updateUpcomingChargeCategory: async (id: string, categoryId: string) => {
        set(state => ({
          upcomingCharges: state.upcomingCharges.map(t =>
            t.id === id ? { ...t, category: categoryId } : t
          )
        }));
        await get()._updateEncryptedBlob();
      },

      addCategory: async (category: Omit<Category, 'id'>) => { // Добавил тип для category
        const newCategory = { ...category, id: Date.now().toString() };
        set(state => ({
          categories: [...state.categories, newCategory]
        }));
        await get()._updateEncryptedBlob();
      },

      updateCategory: async (id: string, updates: Partial<Category>) => {
        set(state => ({
          categories: state.categories.map(c =>
            c.id === id ? { ...c, ...updates } : c
          )
        }));
        await get()._updateEncryptedBlob();
      },

      deleteCategory: async (id: string) => {
        set(state => ({
          categories: state.categories.filter(c => c.id !== id),
          transactions: state.transactions.map(t =>
            t.category === id ? { ...t, category: 'other' } : t
          )
        }));
        await get()._updateEncryptedBlob();
      },

      importSharedData: async (dataToImport) => {
        set({
          transactions: dataToImport.transactions || [],
          categories: dataToImport.categories || defaultCategories, // Use default if imported categories are empty/undefined
          upcomingCharges: dataToImport.upcomingCharges || [],
        });
        await get()._updateEncryptedBlob(); // Re-encrypt the newly imported data
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
      name: 'finance-storage', // Имя хранилища в localStorage
      partialize: (state) => ({
        // Сохраняем только encryptedDataBlob и нечувствительные данные
        // masterPasswordHash: state.masterPasswordHash, // Removed
        encryptedDataBlob: state.encryptedDataBlob,
        currentLanguage: state.currentLanguage,
        // isSupabaseAuthenticated is not persisted; session is source of truth.
        // transactions, upcomingCharges, categories НЕ сохраняются напрямую
      }),
      // onRehydrateStorage can be used if needed, but initializeStore handles async session check.
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
 
// Password hashing functions (hashPassword, verifyPassword) are removed.
