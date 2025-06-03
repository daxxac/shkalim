import { supabase } from '../integrations/supabase/client'; // Ваш существующий клиент Supabase
import { encryptData, decryptData } from '../utils/encryption';
import { useFinanceStore } from '../store/financeStore';
import { Transaction, Category, UpcomingCharge } from '../types/finance';

export interface ShareableData { // Exporting the interface
  transactions: Transaction[];
  categories: Category[];
  upcomingCharges: UpcomingCharge[];
}

const SHARING_FUNCTION_CREATE_PATH = 'create-share-link';
const SHARING_FUNCTION_GET_PATH = 'get-shared-data';

class SharingService {
  /**
   * Creates a shareable link by encrypting current financial data with a temporary password
   * and uploading it via a Supabase Function.
   * @param temporaryPassword The password to encrypt the shared data with.
   * @param expiresInHours Optional: How many hours the link should be valid for. Defaults to 24.
   * @returns The unique share ID for the link.
   */
  async createShareLink(temporaryPassword: string, expiresInHours?: number): Promise<string> {
    const { transactions, categories, upcomingCharges, _currentPasswordInMemory, masterPasswordHash, isLocked } = useFinanceStore.getState();

    if (isLocked && !masterPasswordHash) {
        // Если заблокировано и нет мастер-пароля, значит, это первый запуск без установки пароля.
        // Данные по умолчанию, их можно "делиться" без расшифровки.
    } else if (isLocked) {
        throw new Error("Cannot share data when the store is locked and a master password is set. Please unlock first.");
    }
    
    let dataToShare: ShareableData;

    if (masterPasswordHash && _currentPasswordInMemory) {
      // Если есть мастер-пароль, данные в состоянии уже расшифрованы им.
      // Мы просто берем их.
       dataToShare = {
        transactions,
        categories,
        upcomingCharges,
      };
    } else {
      // Нет мастер-пароля (или он не использовался для текущих данных в памяти)
      // Просто берем текущие данные из состояния
      dataToShare = {
        transactions,
        categories,
        upcomingCharges,
      };
    }


    const encryptedBlobForSharing = await encryptData(dataToShare, temporaryPassword);

    const { data: functionResponse, error: functionError } = await supabase.functions.invoke(
      SHARING_FUNCTION_CREATE_PATH,
      {
        body: {
          encrypted_blob: encryptedBlobForSharing,
          expires_in_hours: expiresInHours,
        },
      }
    );

    if (functionError) {
      console.error('Error calling create-share-link function:', functionError);
      throw new Error(functionError.message || 'Failed to create share link.');
    }

    if (!functionResponse || !functionResponse.shareId) {
      console.error('Invalid response from create-share-link function:', functionResponse);
      throw new Error('Failed to get share ID from function response.');
    }

    return functionResponse.shareId;
  }

  /**
   * Retrieves and decrypts shared data using a share ID and a temporary password.
   * @param shareId The unique ID of the share link.
   * @param temporaryPassword The password to decrypt the shared data.
   * @returns The decrypted financial data.
   */
  async getSharedData(shareId: string, temporaryPassword: string): Promise<ShareableData> {
    const { data: functionResponse, error: functionError } = await supabase.functions.invoke(
      `${SHARING_FUNCTION_GET_PATH}?share_id=${shareId}`, // Передаем share_id как query параметр
      { method: 'GET' } // Указываем метод GET, если функция ожидает его для query параметров
    );

    if (functionError) {
      console.error('Error calling get-shared-data function:', functionError);
      throw new Error(functionError.message || 'Failed to retrieve shared data.');
    }
    
    if (!functionResponse || !functionResponse.encrypted_blob) {
      console.error('Invalid response from get-shared-data function:', functionResponse);
      throw new Error('Encrypted data blob not found in function response.');
    }

    const decryptedData = await decryptData(functionResponse.encrypted_blob, temporaryPassword);
    return decryptedData as ShareableData;
  }
}

export const sharingService = new SharingService();