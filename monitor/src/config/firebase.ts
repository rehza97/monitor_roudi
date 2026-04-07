import { getApp, getApps, initializeApp } from "firebase/app"
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth"
import { FIREBASE_PROJECT_ID } from "./firebaseProject"
import { getFirestore } from "@/lib/firebase-firestore"

const ENV_LABEL_FR: Record<string, string> = {
  VITE_FIREBASE_API_KEY: "clé API Web Firebase",
  VITE_FIREBASE_APP_ID: "identifiant d’application Firebase (appId)",
}

function trimEnv(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  const t = value.trim()
  return t.length ? t : undefined
}

/** Rejects empty values and placeholder text from .env.example / templates. */
function isUsableFirebaseSecret(value: string | undefined): boolean {
  if (value === undefined) return false
  const t = value.trim()
  if (!t) return false
  const lower = t.toLowerCase()
  if (lower.startsWith("your-")) return false
  if (lower.includes("copy_from")) return false
  if (lower.startsWith("copy-")) return false
  if (lower === "xxx") return false
  return true
}

const projectId = trimEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined) ?? FIREBASE_PROJECT_ID

const firebaseConfig = {
  apiKey: trimEnv(import.meta.env.VITE_FIREBASE_API_KEY as string | undefined),
  authDomain:
    trimEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) ?? `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket:
    trimEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined) ??
    `${projectId}.firebasestorage.app`,
  messagingSenderId: trimEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined),
  appId: trimEnv(import.meta.env.VITE_FIREBASE_APP_ID as string | undefined),
}

const requiredChecks: [string, string | undefined][] = [
  ["VITE_FIREBASE_API_KEY", firebaseConfig.apiKey],
  ["VITE_FIREBASE_APP_ID", firebaseConfig.appId],
]

export const missingFirebaseEnvKeys = requiredChecks
  .filter(([, value]) => !isUsableFirebaseSecret(value))
  .map(([key]) => key)

export function missingFirebaseEnvLabels(): string[] {
  return missingFirebaseEnvKeys.map((key) => ENV_LABEL_FR[key] ?? key)
}

export const isFirebaseConfigured = missingFirebaseEnvKeys.length === 0

export const firebaseApp = isFirebaseConfigured
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null

export const auth = firebaseApp ? getAuth(firebaseApp) : null
export const db = firebaseApp ? getFirestore(firebaseApp) : null

let persistencePromise: Promise<void> | null = null

export function ensureAuthPersistence(): Promise<void> {
  if (!auth) return Promise.resolve()
  if (!persistencePromise) {
    persistencePromise = setPersistence(auth, browserLocalPersistence)
  }
  return persistencePromise
}
