/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TELEGRAM_BOT_TOKEN: string
  // Add other env variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 