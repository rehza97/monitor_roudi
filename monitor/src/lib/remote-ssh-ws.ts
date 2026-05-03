import { REMOTE_SSH_WEBSOCKET_URL } from "@/config/remoteSshDefaults"

export function getRemoteSshWebSocketUrl(): string {
  const explicit = REMOTE_SSH_WEBSOCKET_URL.trim()
  if (explicit) return explicit
  const proto = window.location.protocol === "https:" ? "wss" : "ws"
  return `${proto}://${window.location.host}/__dev/ssh/ws`
}

export function remoteSshRequiresLocalDevTunnel(): boolean {
  if (REMOTE_SSH_WEBSOCKET_URL.trim()) return false
  const h = window.location.hostname
  return !(h === "localhost" || h === "127.0.0.1")
}

export function remoteSshUsesDedicatedBridge(): boolean {
  return Boolean(REMOTE_SSH_WEBSOCKET_URL.trim())
}
