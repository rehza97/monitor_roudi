import { getApp, getApps, initializeApp } from "firebase/app"
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth"
import { initializeFirestore } from "@/lib/firebase-firestore"
import { FIREBASE_PROJECT_ID } from "./firebaseProject"

const projectId = FIREBASE_PROJECT_ID

const firebaseConfig = {
  apiKey: "AIzaSyC-M3pnhtEvY-E0AcUjZbl_d892QzGY5rA",
  authDomain: "roudi-monitor-app.firebaseapp.com",
  projectId,
  storageBucket: "roudi-monitor-app.firebasestorage.app",
  messagingSenderId: "21109967331",
  appId: "1:21109967331:web:a4847dff474ae548f8f8d6",
}

export const missingFirebaseEnvKeys: string[] = []

export function missingFirebaseEnvLabels(): string[] {
  return []
}

export const isFirebaseConfigured = true

export const firebaseApp = isFirebaseConfigured
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null

export const auth = firebaseApp ? getAuth(firebaseApp) : null
/** Long-polling fallback when WebChannel streams fail (proxies / flaky networks — reduces Listen transport errors). */
export const db = firebaseApp
  ? initializeFirestore(firebaseApp, {
      experimentalAutoDetectLongPolling: true,
    })
  : null

let persistencePromise: Promise<void> | null = null

export function ensureAuthPersistence(): Promise<void> {
  if (!auth) return Promise.resolve()
  if (!persistencePromise) {
    persistencePromise = setPersistence(auth, browserLocalPersistence)
  }
  return persistencePromise
}
