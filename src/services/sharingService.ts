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
    const {
      transactions,
      categories,
      upcomingCharges,
      _currentPasswordInMemory, // This is the data encryption key, if data is unlocked
      isDataLocked,           // Replaces isLocked
      encryptedDataBlob,     // To check if any data was ever encrypted
      isSupabaseAuthenticated // Added to check auth status
    } = useFinanceStore.getState();

    if (!isSupabaseAuthenticated) {
      throw new Error("User must be authenticated to create share links.");
    }
    
    let dataToShare: ShareableData;

    if (isDataLocked) {
      if (!encryptedDataBlob) {
        // Data is "locked" but no encrypted blob exists. This means it's the initial state
        // before any data encryption password was set. We can share the current (default/empty) data.
        console.warn("Sharing data from a locked store with no encrypted blob (initial state).");
        dataToShare = {
          transactions, // Should be default/empty
          categories,   // Should be default
          upcomingCharges, // Should be default/empty
        };
      } else {
        // Data is locked and an encrypted blob exists. We don't have the key in memory.
        throw new Error("Cannot share data when it is locked. Please unlock your data first.");
      }
    } else {
      // Data is not locked, meaning _currentPasswordInMemory is set and store data is decrypted.
      // We can use the current live data from the store.
      if (!_currentPasswordInMemory) {
        // This case should ideally not happen if isDataLocked is false.
        // Adding a safeguard.
        console.error("Data is not locked, but no current password in memory. This is an inconsistent state.");
        throw new Error("Inconsistent state: Data unlocked but no encryption key found. Cannot share.");
      }
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