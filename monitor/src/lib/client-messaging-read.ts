/** Dispatched when localStorage read cursor updates so sidebar badges can refresh. */
export const CLIENT_CONV_READ_EVENT = "roudi:client-conv-read"

function readKey(userId: string, conversationId: string): string {
  return `clientMsgRead:${userId}:${conversationId}`
}

export function getClientConvReadMs(userId: string, conversationId: string): number {
  if (typeof window === "undefined") return 0
  const raw = window.localStorage.getItem(readKey(userId, conversationId))
  const n = raw ? Number(raw) : 0
  return Number.isFinite(n) ? n : 0
}

/** Marks conversation read up to lastMillis and notifies listeners (sidebar badge). */
export function markClientConversationRead(
  userId: string,
  conversationId: string,
  lastMillis: number,
): void {
  if (typeof window === "undefined" || lastMillis <= 0) return
  const key = readKey(userId, conversationId)
  const prev = getClientConvReadMs(userId, conversationId)
  if (lastMillis > prev) {
    window.localStorage.setItem(key, String(lastMillis))
    window.dispatchEvent(new Event(CLIENT_CONV_READ_EVENT))
  }
}

export function firestoreTsToMillis(ts: unknown): number {
  if (ts && typeof ts === "object" && ts !== null && "toMillis" in ts) {
    const m = (ts as { toMillis: () => number }).toMillis()
    return typeof m === "number" && Number.isFinite(m) ? m : 0
  }
  return 0
}
