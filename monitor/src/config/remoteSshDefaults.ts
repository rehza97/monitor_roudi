import { ENGINEER_REMOTE_DEFAULTS } from "./engineerRemoteHardcoded"

// Dev: Vite handles wss via /__dev/ssh/ws. Prod: dedicated Render web service (see render.yaml).
const IS_DEV = typeof __APP_IS_DEV__ !== "undefined" && __APP_IS_DEV__
const ENV_BRIDGE =
  typeof import.meta.env.VITE_REMOTE_SSH_WEBSOCKET_URL === "string"
    ? import.meta.env.VITE_REMOTE_SSH_WEBSOCKET_URL.trim()
    : ""
export const REMOTE_SSH_WEBSOCKET_URL = IS_DEV
  ? ""
  : ENV_BRIDGE || "wss://roudi-ssh-bridge.onrender.com"

export const REMOTE_SSH_DEFAULT_HOST = ENGINEER_REMOTE_DEFAULTS.host
export const REMOTE_SSH_DEFAULT_PORT = ENGINEER_REMOTE_DEFAULTS.port
export const REMOTE_SSH_DEFAULT_USER = ENGINEER_REMOTE_DEFAULTS.username
export const REMOTE_SSH_DEFAULT_PASSWORD = ENGINEER_REMOTE_DEFAULTS.password
