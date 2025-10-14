/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KONTENT_PROJECT_ID: string
  readonly VITE_KONTENT_MANAGEMENT_API_KEY: string
  readonly VITE_KONTENT_PREVIEW_API_KEY: string
  readonly VITE_KONTENT_DELIVERY_API_KEY: string
  readonly VITE_APP_URL: string
  readonly VITE_APP_CALLBACK_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}