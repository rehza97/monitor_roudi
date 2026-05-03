/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SSH_WS_URL?: string
  readonly VITE_SSH_DEFAULT_HOST?: string
  readonly VITE_SSH_DEFAULT_USER?: string
  readonly VITE_SSH_DEFAULT_PASSWORD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
