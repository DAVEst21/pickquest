/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base del backend, por ejemplo http://localhost:3000 (ver .env.example). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
