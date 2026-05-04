/// <reference types="vite/client" />

declare const __APP_IS_DEV__: boolean

interface ImportMetaEnv {
  /** HTTPS base for VPS agent API in production (no trailing slash), e.g. https://your-domain/metrics-api */
  readonly VITE_VPS_AGENT_BASE_URL?: string
  /** Comma-separated HTTPS bases tried in order */
  readonly VITE_VPS_AGENT_BASE_URLS?: string
}
