import fs from "node:fs"
import path from "node:path"
import { spawn } from "node:child_process"
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

function readRequestBody(req: import("node:http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ""
    req.setEncoding("utf8")
    req.on("data", (chunk) => {
      data += chunk
    })
    req.on("end", () => resolve(data))
    req.on("error", reject)
  })
}

function createDevFirebaseAdminPlugin(root: string) {
  return {
    name: "dev-firebase-admin-api",
    configureServer(server: import("vite").ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (req.method !== "POST" || req.url !== "/__dev/firebase/create-user") return next()

        try {
          const raw = await readRequestBody(req)
          const payload = JSON.parse(raw || "{}")

          const scriptPath = path.resolve(root, "admin/create-user-from-dev-api.mjs")
          const child = spawn(process.execPath, [scriptPath], {
            cwd: root,
            stdio: ["pipe", "pipe", "pipe"],
          })

          let out = ""
          let err = ""
          child.stdout.on("data", (chunk) => {
            out += String(chunk)
          })
          child.stderr.on("data", (chunk) => {
            err += String(chunk)
          })

          child.stdin.write(JSON.stringify(payload))
          child.stdin.end()

          child.on("close", (code) => {
            res.setHeader("Content-Type", "application/json")

            if (code !== 0) {
              res.statusCode = 500
              res.end(
                JSON.stringify({
                  ok: false,
                  error: `create-user script failed (${code})`,
                  details: err || out,
                }),
              )
              return
            }

            res.statusCode = 200
            res.end(out || JSON.stringify({ ok: false, error: "empty response" }))
          })
        } catch (e) {
          res.statusCode = 500
          res.setHeader("Content-Type", "application/json")
          res.end(
            JSON.stringify({
              ok: false,
              error: e instanceof Error ? e.message : String(e),
            }),
          )
        }
      })

      server.middlewares.use(async (req, res, next) => {
        if (req.method !== "POST" || req.url !== "/__dev/firebase/delete-user") return next()

        try {
          const raw = await readRequestBody(req)
          const payload = JSON.parse(raw || "{}")

          const scriptPath = path.resolve(root, "admin/delete-user-from-dev-api.mjs")
          const child = spawn(process.execPath, [scriptPath], {
            cwd: root,
            stdio: ["pipe", "pipe", "pipe"],
          })

          let out = ""
          let err = ""
          child.stdout.on("data", (chunk) => {
            out += String(chunk)
          })
          child.stderr.on("data", (chunk) => {
            err += String(chunk)
          })

          child.stdin.write(JSON.stringify(payload))
          child.stdin.end()

          child.on("close", (code) => {
            res.setHeader("Content-Type", "application/json")

            if (code !== 0) {
              res.statusCode = 500
              res.end(
                JSON.stringify({
                  ok: false,
                  error: `delete-user script failed (${code})`,
                  details: err || out,
                }),
              )
              return
            }

            res.statusCode = 200
            res.end(out || JSON.stringify({ ok: false, error: "empty response" }))
          })
        } catch (e) {
          res.statusCode = 500
          res.setHeader("Content-Type", "application/json")
          res.end(
            JSON.stringify({
              ok: false,
              error: e instanceof Error ? e.message : String(e),
            }),
          )
        }
      })
    },
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
    plugins: [react(), tailwindcss(), createDevFirebaseAdminPlugin(root)],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@firebase/firestore": path.resolve(__dirname, "./node_modules/@firebase/firestore/dist/index.esm.js"),
      },
    },
  }
})
