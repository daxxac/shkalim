
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Transaction, BankType, Category, UpcomingCharge } from '../types/finance';
import { encryptData, decryptData } from '../utils/encryption';
import { parseFileData } from '../utils/fileParser';
import { categorizeTransaction } from '../utils/categorization';
import Papa from 'papaparse';

interface FinanceState {
  transactions: Transaction[];
  upcomingCharges: UpcomingCharge[];
  categories: Category[];
  isLocked: boolean;
  isInitialized: boolean;
  masterPasswordHash: string | null;
  encryptedDataBlob: string | null; // Для хранения зашифрованных данных
  _currentPasswordInMemory: string | null; // Временное хранение пароля в памяти
  currentLanguage: 'ru' | 'en';
  
  // Actions
  _updateEncryptedBlob: () => Promise<void>; // Внутренний хелпер, но должен быть в типе для get()
  initializeStore: () => void;
  unlock: (password: string) => Promise<void>;
  lock: () => void;
  setMasterPassword: (password: string) => void;
  panicMode: () => void;
  setLanguage: (lang: 'ru' | 'en') => void;
  
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
      isLocked: true, // По умолчанию заблокировано
      isInitialized: false,
      masterPasswordHash: null,
      encryptedDataBlob: null, // Начальное значение для зашифрованных данных
      _currentPasswordInMemory: null, // Временное хранение пароля в памяти, не персистентное
      currentLanguage: 'ru',

      // Внутренняя функция для обновления зашифрованного блока данных
      _updateEncryptedBlob: async () => {
        const state = get();
        if (!state.isLocked && state._currentPasswordInMemory) {
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
            set({ isLocked: true, _currentPasswordInMemory: null }); // Блокируем в случае ошибки шифрования
          }
        }
      },

      initializeStore: () => {
        // Эта функция вызывается после ре-гидратации состояния из localStorage
        const state = get();
        // Если masterPasswordHash существует, приложение должно быть заблокировано
        // Если masterPasswordHash отсутствует (первый запуск или сброс), оно не "заблокировано" паролем
        const shouldBeLocked = !!state.masterPasswordHash;
        set({ isInitialized: true, isLocked: shouldBeLocked });
        
        // Если не заблокировано и нет пароля (например, первый запуск без пароля),
        // и есть данные в encryptedDataBlob (маловероятно, но для полноты), их нужно очистить,
        // так как нет пароля для их расшифровки или перешифровки.
        // Однако, если нет masterPasswordHash, то и encryptedDataBlob должен быть null по логике setMasterPassword.
        // Если же masterPasswordHash есть, но isLocked оказалось false (не должно быть при корректной инициализации),
        // то это тоже странная ситуация.
        // Основная логика разблокировки и загрузки данных будет в unlock().
      },

      unlock: async (password: string) => {
        const state = get();

        if (!state.masterPasswordHash) {
          // Пароль не установлен. Позволяем "войти" в приложение с пустыми/дефолтными данными.
          // Шифрования/дешифрования нет.
          set({
            isLocked: false,
            _currentPasswordInMemory: null, // Пароля нет
            // Убедимся, что данные в состоянии по умолчанию, если они не были загружены
            transactions: state.transactions.length > 0 ? state.transactions : [], // или defaultTransactions
            upcomingCharges: state.upcomingCharges.length > 0 ? state.upcomingCharges : [], // или defaultUpcomingCharges
            categories: state.categories.length > 0 ? state.categories : defaultCategories,
          });
          return;
        }

        const isValid = await verifyPassword(password, state.masterPasswordHash);
        if (!isValid) {
          throw new Error('Invalid password');
        }

        if (state.encryptedDataBlob) {
          try {
            const decrypted = await decryptData(state.encryptedDataBlob, password);
            set({
              transactions: decrypted.transactions || [],
              upcomingCharges: decrypted.upcomingCharges || [],
              categories: decrypted.categories || defaultCategories,
              isLocked: false,
              _currentPasswordInMemory: password,
            });
          } catch (error) {
            console.error("Decryption failed during unlock:", error);
            // Важно не разблокировать и не загружать данные при ошибке дешифровки.
            // Можно также сбросить _currentPasswordInMemory, но isLocked уже true или станет при ошибке.
            set({ isLocked: true, _currentPasswordInMemory: null });
            throw new Error('Decryption failed. Data might be corrupted or password was changed.');
          }
        } else {
          // Пароль верный, но зашифрованного блока нет (например, сразу после setMasterPassword, до изменений данных)
          // Или если данные были сброшены, а пароль остался.
          set({
            isLocked: false,
            _currentPasswordInMemory: password,
            // Убедимся, что данные в состоянии по умолчанию
            transactions: [],
            upcomingCharges: [],
            categories: defaultCategories,
          });
        }
      },

      lock: () => {
        set({
          isLocked: true,
          _currentPasswordInMemory: null,
          // Очищаем чувствительные данные из оперативной памяти
          transactions: [],
          upcomingCharges: [],
          // Категории можно оставить defaultCategories, т.к. они не так чувствительны,
          // либо тоже очищать в [], если требуется максимальная секьюрность.
          // Оставим defaultCategories для удобства, если пользователь просто блокирует/разблокирует.
          categories: defaultCategories,
        });
      },

      setMasterPassword: async (password: string) => {
        const state = get();
        if (state.masterPasswordHash) {
          // TODO: В будущем здесь может быть логика смены пароля,
          // которая потребует старый пароль для расшифровки и перешифровки данных.
          // Пока что просто запрещаем установку нового, если уже есть.
          throw new Error("Master password is already set. Use 'change password' functionality (not implemented yet).");
        }

        const newHash = await hashPassword(password);
        const sensitiveData = {
          transactions: state.transactions, // На момент первой установки это будут дефолтные/пустые данные
          upcomingCharges: state.upcomingCharges,
          categories: state.categories,
        };

        try {
          const newEncryptedBlob = await encryptData(sensitiveData, password);
          set({
            masterPasswordHash: newHash,
            encryptedDataBlob: newEncryptedBlob,
            isLocked: false, // Разблокируем после установки пароля
            _currentPasswordInMemory: password,
          });
        } catch (error) {
          console.error("Encryption failed during initial password setup:", error);
          // Сбрасываем попытку установки пароля, если шифрование не удалось
          set({ masterPasswordHash: null, encryptedDataBlob: null, isLocked: true, _currentPasswordInMemory: null });
          throw new Error("Failed to set up master password due to encryption error.");
        }
      },

      panicMode: () => {
        // Очищаем все из localStorage, где persist хранит свои данные
        localStorage.removeItem('finance-storage'); // Имя из persist config

        // Если вы используете indexedDB для чего-то еще специфичного для finance-app,
        // и persist middleware настроен на indexedDB (по умолчанию это localStorage).
        // indexedDB.deleteDatabase('finance-app'); // Раскомментировать, если persist использует indexedDB

        // Сбрасываем состояние Zustand к исходному, включая все чувствительные данные
        set({
          transactions: [],
          upcomingCharges: [],
          categories: defaultCategories,
          isLocked: true, // После паники приложение должно быть заблокировано (и без пароля)
          isInitialized: false, // Потребуется реинициализация
          masterPasswordHash: null,
          encryptedDataBlob: null, // Очищаем зашифрованные данные
          _currentPasswordInMemory: null,
          // currentLanguage можно оставить или сбросить к дефолтному, например 'ru'
          currentLanguage: 'ru',
        });
        // Перезагрузка страницы для чистого старта и применения сброшенного состояния
        window.location.reload();
      },

      setLanguage: (lang: 'ru' | 'en') => {
        set({ currentLanguage: lang });
      },

      resetAllData: async () => { // Делаем async для вызова _updateEncryptedBlob
        set({
          transactions: [],
          upcomingCharges: [],
          categories: defaultCategories,
          // masterPasswordHash и encryptedDataBlob НЕ сбрасываются здесь.
          // Это действие только для данных пользователя, не для настроек безопасности.
        });
        // После сброса данных, если приложение разблокировано, нужно обновить зашифрованный блоб.
        await get()._updateEncryptedBlob();
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
        // Сохраняем только masterPasswordHash, encryptedDataBlob и нечувствительные данные
        masterPasswordHash: state.masterPasswordHash,
        encryptedDataBlob: state.encryptedDataBlob,
        currentLanguage: state.currentLanguage,
        // transactions, upcomingCharges, categories НЕ сохраняются напрямую
      }),
      // onRehydrateStorage можно использовать для дополнительной логики после загрузки,
      // но initializeStore уже вызывается и обрабатывает isLocked.
      // onRehydrateStorage: () => (state, error) => {
      //   if (state) {
      //     state.isInitialized = true;
      //     state.isLocked = !!state.masterPasswordHash;
      //   }
      // }
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
