import { REMOTE_SSH_WEBSOCKET_URL } from "@/config/remoteSshDefaults"

export function getRemoteSshWebSocketUrl(): string {
  const explicit = REMOTE_SSH_WEBSOCKET_URL.trim()
  if (explicit) return explicit
  const proto = window.location.protocol === "https:" ? "wss" : "ws"
  return `${proto}://${window.location.host}/__dev/ssh/ws`
}

/** HTTP health URL derived from the configured WebSocket bridge (wss→https). */
export function getRemoteSshBridgeHealthUrl(): string | null {
  const ws = REMOTE_SSH_WEBSOCKET_URL.trim()
  if (!ws) return null
  const httpBase = ws.replace(/^wss:/i, "https:").replace(/^ws:/i, "http:").replace(/\/$/, "")
  return `${httpBase}/health`
}

export async function probeRemoteSshBridge(): Promise<"ok" | "missing" | "unreachable"> {
  const healthUrl = getRemoteSshBridgeHealthUrl()
  if (!healthUrl) return "ok"
  try {
    const res = await fetch(healthUrl, { method: "GET", cache: "no-store" })
    if (res.ok) return "ok"
    if (res.status === 404) {
      const body = (await res.text()).trim()
      if (body === "Not Found" || body.includes("no-server")) return "missing"
    }
    return "unreachable"
  } catch {
    return "unreachable"
  }
}

export function remoteSshBridgeErrorMessage(probe: "missing" | "unreachable"): string {
  const url = REMOTE_SSH_WEBSOCKET_URL.trim() || "(non configuré)"
  if (probe === "missing") {
    return `Le service pont SSH Render n'est pas déployé (${url}). Déployez le service « roudi-ssh-bridge » depuis render.yaml (npm run ssh-bridge), ou lancez « npm run dev » en local.`
  }
  return `Pont SSH inaccessible (${url}). Vérifiez que le service est démarré (Render: pas en veille, logs sans erreur) ou utilisez « npm run dev » / « npm run ssh-bridge » en local.`
}

export function remoteSshRequiresLocalDevTunnel(): boolean {
  if (REMOTE_SSH_WEBSOCKET_URL.trim()) return false
  const h = window.location.hostname
  return !(h === "localhost" || h === "127.0.0.1")
}

export function remoteSshUsesDedicatedBridge(): boolean {
  return Boolean(REMOTE_SSH_WEBSOCKET_URL.trim())
}
