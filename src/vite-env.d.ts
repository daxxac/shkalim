/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Standard Vite env variables
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly PROD: boolean;
  readonly DEV: boolean;
  // Add other custom VITE_ prefixed client-side environment variables here if any
  // Example: readonly VITE_API_KEY: string;
  [key: string]: unknown; // Allow other properties, using unknown instead of any
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
