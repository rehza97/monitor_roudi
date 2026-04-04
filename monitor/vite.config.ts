import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const FIREBASE_ENV_KEYS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const

function readFirebaseClientJson(
  root: string,
): Partial<Record<(typeof FIREBASE_ENV_KEYS)[number], string>> {
  const file = path.resolve(root, "firebase.client.json")
  if (!fs.existsSync(file)) return {}
  try {
    const j = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>
    return {
      VITE_FIREBASE_API_KEY: typeof j.apiKey === "string" ? j.apiKey : undefined,
      VITE_FIREBASE_AUTH_DOMAIN: typeof j.authDomain === "string" ? j.authDomain : undefined,
      VITE_FIREBASE_PROJECT_ID: typeof j.projectId === "string" ? j.projectId : undefined,
      VITE_FIREBASE_STORAGE_BUCKET: typeof j.storageBucket === "string" ? j.storageBucket : undefined,
      VITE_FIREBASE_MESSAGING_SENDER_ID:
        typeof j.messagingSenderId === "string" ? j.messagingSenderId : undefined,
      VITE_FIREBASE_APP_ID: typeof j.appId === "string" ? j.appId : undefined,
    }
  } catch {
    return {}
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const root = __dirname
  const fromEnvFiles = loadEnv(mode, root, "")
  const fromJson = readFirebaseClientJson(root)

  const define: Record<string, string> = {}
  for (const key of FIREBASE_ENV_KEYS) {
    const value = (fromEnvFiles[key] || fromJson[key] || "").trim()
    define[`import.meta.env.${key}`] = JSON.stringify(value)
  }

  return {
    define,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@firebase/firestore": path.resolve(__dirname, "./node_modules/@firebase/firestore/dist/index.esm.js"),
      },
    },
  }
})
