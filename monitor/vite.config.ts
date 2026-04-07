import fs from "node:fs"
import path from "node:path"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { Client } from "ssh2"
import { defineConfig, loadEnv } from "vite"
import { WebSocketServer } from "ws"

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

      server.middlewares.use(async (req, res, next) => {
        if (req.method !== "POST" || req.url !== "/__dev/firebase/set-password") return next()

        try {
          const raw = await readRequestBody(req)
          const payload = JSON.parse(raw || "{}")

          const scriptPath = path.resolve(root, "admin/set-password-from-dev-api.mjs")
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
                  error: `set-password script failed (${code})`,
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

type SshSocketIncoming =
  | {
      type: "connect"
      host: string
      port?: number
      username: string
      password?: string
      privateKey?: string
    }
  | { type: "input"; data: string }
  | { type: "resize"; cols: number; rows: number }
  | { type: "disconnect" }

function createDevSshBridgePlugin() {
  return {
    name: "dev-ssh-bridge",
    configureServer(server: import("vite").ViteDevServer) {
      const wss = new WebSocketServer({ noServer: true })

      server.httpServer?.on("upgrade", (req, socket, head) => {
        const url = new URL(req.url || "", "http://localhost")
        if (url.pathname !== "/__dev/ssh/ws") return
        wss.handleUpgrade(req, socket, head, (ws: any) => {
          wss.emit("connection", ws, req)
        })
      })

      wss.on("connection", (ws: any) => {
        const ssh = new Client()
        let shell: any = null
        let isConnected = false

        const send = (payload: Record<string, unknown>) => {
          if (ws.readyState === 1) ws.send(JSON.stringify(payload))
        }

        const closeAll = () => {
          if (shell) {
            shell.end()
            shell = null
          }
          ssh.end()
          isConnected = false
        }

        ssh.on("ready", () => {
          isConnected = true
          send({ type: "status", connected: true, message: "SSH connected" })
          ssh.shell(
            {
              term: "xterm-256color",
              cols: 120,
              rows: 32,
            },
            (err: any, stream: any) => {
              if (err) {
                send({ type: "error", message: `shell failed: ${err.message}` })
                closeAll()
                return
              }
              shell = stream
              stream.on("data", (chunk: Buffer) => {
                send({ type: "output", data: chunk.toString("utf8") })
              })
              stream.stderr.on("data", (chunk: Buffer) => {
                send({ type: "output", data: chunk.toString("utf8") })
              })
              stream.on("close", () => {
                send({ type: "status", connected: false, message: "SSH shell closed" })
                closeAll()
              })
            },
          )
        })

        ssh.on("error", (err: any) => {
          send({ type: "error", message: err.message })
        })

        ssh.on("close", () => {
          if (isConnected) send({ type: "status", connected: false, message: "SSH disconnected" })
          isConnected = false
        })

        ws.on("message", (raw: any) => {
          let payload: SshSocketIncoming
          try {
            payload = JSON.parse(String(raw)) as SshSocketIncoming
          } catch {
            send({ type: "error", message: "invalid websocket payload" })
            return
          }

          if (payload.type === "connect") {
            if (isConnected) return
            if (!payload.host || !payload.username) {
              send({ type: "error", message: "host and username are required" })
              return
            }
            ssh.connect({
              host: payload.host,
              port: payload.port || 22,
              username: payload.username,
              password: payload.password || undefined,
              privateKey: payload.privateKey || undefined,
              readyTimeout: 15_000,
            })
            return
          }

          if (payload.type === "input") {
            if (!shell) return
            shell.write(payload.data)
            return
          }

          if (payload.type === "resize") {
            if (!shell) return
            shell.setWindow(payload.rows, payload.cols, 0, 0)
            return
          }

          if (payload.type === "disconnect") {
            closeAll()
          }
        })

        ws.on("close", () => {
          closeAll()
        })
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
    plugins: [react(), tailwindcss(), createDevFirebaseAdminPlugin(root), createDevSshBridgePlugin()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@firebase/firestore": path.resolve(__dirname, "./node_modules/@firebase/firestore/dist/index.esm.js"),
      },
    },
  }
})
