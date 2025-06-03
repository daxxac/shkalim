
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
    if (description.includes('משכורת') || description.includes('שכר')) {
      return 'salary';
    }
  } else {
    // Negative amounts - expenses
    if (description.includes('אשראי') || description.includes('מועדון')) {
      return 'shopping';
    }
    
    if (description.includes('דלק') || description.includes('תחבורה')) {
      return 'transport';
    }
    
    if (description.includes('חשמל') || description.includes('מים') || description.includes('גז')) {
      return 'bills';
    }
  }
  
  return 'other';
}
