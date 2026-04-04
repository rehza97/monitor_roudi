import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format Firestore Timestamp or Date for UI (fr-FR). */
export function formatFirestoreDate(value: unknown): string {
  if (value == null) return "—"
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const d = (value as { toDate: () => Date }).toDate()
    if (d instanceof Date && !Number.isNaN(d.getTime())) return d.toLocaleDateString("fr-FR")
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toLocaleDateString("fr-FR")
  return "—"
}

/** Firestore Timestamp / Date → epoch ms for comparisons and bucketing. */
export function firestoreToMillis(value: unknown): number | null {
  if (value == null) return null
  if (typeof value === "object" && value !== null && "toMillis" in value) {
    const fn = (value as { toMillis?: () => number }).toMillis
    if (typeof fn === "function") {
      const n = fn.call(value)
      return typeof n === "number" && Number.isFinite(n) ? n : null
    }
  }
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const d = (value as { toDate: () => Date }).toDate()
    if (d instanceof Date && !Number.isNaN(d.getTime())) return d.getTime()
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.getTime()
  return null
}

export function formatFirestoreDateTime(value: unknown): string {
  const ms = firestoreToMillis(value)
  if (ms == null) return "—"
  return new Date(ms).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}
