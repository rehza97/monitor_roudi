import { getApp, getApps, initializeApp } from "firebase/app"
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth"
import { FIREBASE_PROJECT_ID } from "./firebaseProject"
import { getFirestore } from "@/lib/firebase-firestore"

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) ?? `${FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined) ?? FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
}

export const missingFirebaseEnv = [
  ["VITE_FIREBASE_API_KEY", firebaseConfig.apiKey],
  ["VITE_FIREBASE_APP_ID", firebaseConfig.appId],
].filter(([, value]) => !value).map(([key]) => key)

export const isFirebaseConfigured = missingFirebaseEnv.length === 0

const firebaseApp = isFirebaseConfigured
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
