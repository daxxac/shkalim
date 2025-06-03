
// Simple encryption utilities for local storage
// Note: This is basic encryption for local use only

import { Transaction, UpcomingCharge, Category } from '../types/finance';

interface EncryptedPayload {
  transactions: Transaction[];
  upcomingCharges: UpcomingCharge[];
  categories: Category[];
}

export async function encryptData(data: EncryptedPayload, password: string): Promise<string> {
  const jsonString = JSON.stringify(data);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(jsonString);
  
  // Create a key from password
  const passwordBuffer = encoder.encode(password);
  const key = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  // Derive encryption key
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    key,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  // Encrypt data
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    derivedKey,
    dataBuffer
  );
  
  // Combine salt, iv, and encrypted data
  const result = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(new Uint8Array(encryptedData), salt.length + iv.length);
  
  // Convert to base64
  // Convert to base64
  // The original String.fromCharCode(...result) can cause a RangeError for large arrays.
  // Iterate manually to build the binary string.
  let binary = '';
  const len = result.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(result[i]);
  }
  return btoa(binary);
}

export async function decryptData(encryptedData: string, password: string): Promise<EncryptedPayload> {
  try {
    // Convert from base64
    const data = new Uint8Array(
      atob(encryptedData)
        .split('')
        .map(char => char.charCodeAt(0))
    );
    
    // Extract salt, iv, and encrypted data
    const salt = data.slice(0, 16);
    const iv = data.slice(16, 28);
    const encrypted = data.slice(28);
    
    // Create key from password
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const key = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    // Derive decryption key
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      key,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    // Decrypt data
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      derivedKey,
      encrypted
    );
    
    // Convert back to string and parse JSON
    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decryptedBuffer);
    
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error('Decryption failed');
  }
}
