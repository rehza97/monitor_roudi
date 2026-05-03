import { ENGINEER_REMOTE_DEFAULTS } from "./engineerRemoteHardcoded"

/**
 * Remote SSH WebSocket + credential defaults (no .env).
 * - `websocketUrl` empty: use same-origin `ws(s)://<host>/__dev/ssh/ws` (integrated `npm run dev`).
 * - For `vite preview` + `npm run ssh-bridge`, set e.g. `ws://127.0.0.1:8765` (see `scripts/ssh-bridge-server.mjs` port).
 */
export const REMOTE_SSH_WEBSOCKET_URL = ""

export const REMOTE_SSH_DEFAULT_HOST = ENGINEER_REMOTE_DEFAULTS.host
export const REMOTE_SSH_DEFAULT_PORT = ENGINEER_REMOTE_DEFAULTS.port
export const REMOTE_SSH_DEFAULT_USER = ENGINEER_REMOTE_DEFAULTS.username
export const REMOTE_SSH_DEFAULT_PASSWORD = ENGINEER_REMOTE_DEFAULTS.password
