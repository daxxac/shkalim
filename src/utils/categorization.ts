
import { Transaction, Category } from '../types/finance';

export function categorizeTransaction(transaction: Transaction, categories: Category[]): string {
  const description = transaction.description.toLowerCase();
  
  // Try to match against category rules
  for (const category of categories) {
    for (const rule of category.rules) {
      if (description.includes(rule.toLowerCase())) {
        return category.id;
      }
    }
  }
  
  // Default categorization based on amount
  if (transaction.amount > 0) {
    // Positive amounts - likely income
    if (description.includes('зарплата') || description.includes('заработная плата')) {
      return 'salary';
    }
  } else {
    // Negative amounts - expenses
    if (description.includes('покупка') || description.includes('оплата товаров')) {
      return 'shopping';
    }
    
    if (description.includes('азс') || description.includes('транспорт') || description.includes('метро')) {
      return 'transport';
    }
    
    if (description.includes('жкх') || description.includes('коммунальные') || description.includes('электроэнергия')) {
      return 'bills';
    }
    
    if (description.includes('супермаркет') || description.includes('магазин') || description.includes('продукты')) {
      return 'food';
    }
  }
  
  return 'other';
}
