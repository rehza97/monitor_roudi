/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REMOTE_SSH_WEBSOCKET_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const __APP_IS_DEV__: boolean
