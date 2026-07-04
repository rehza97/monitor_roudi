/**
 * Standalone WebSocket → SSH bridge (same protocol as Vite dev plugin `/__dev/ssh/ws`).
 * Run: npm run ssh-bridge
 * For `vite preview`, set REMOTE_SSH_WEBSOCKET_URL to ws://127.0.0.1:8765 in src/config/remoteSshDefaults.ts.
 */
import http from "node:http"
import { Client } from "ssh2"
import { WebSocketServer } from "ws"

const PORT = process.env.PORT ? Number(process.env.PORT) : 8765
const BIND = "0.0.0.0"

/** @typedef {{ type: 'connect'; host: string; port?: number; username: string; password?: string; privateKey?: string } | { type: 'input'; data: string } | { type: 'resize'; cols: number; rows: number } | { type: 'disconnect' }} SshSocketIncoming */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS)
    res.end()
    return
  }
  if (req.url === "/health" || req.url === "/health/") {
    res.writeHead(200, { ...CORS_HEADERS, "Content-Type": "application/json" })
    res.end(JSON.stringify({ ok: true, service: "ssh-bridge" }))
    return
  }
  res.writeHead(404, { "Content-Type": "text/plain" })
  res.end("SSH WebSocket bridge — use a WebSocket client\n")
})

const wss = new WebSocketServer({ server })

wss.on("connection", (ws) => {
  const ssh = new Client()
  let shell = null
  let isConnected = false

  const send = (payload) => {
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
      (err, stream) => {
        if (err) {
          send({ type: "error", message: `shell failed: ${err.message}` })
          closeAll()
          return
        }
        shell = stream
        stream.on("data", (chunk) => {
          send({ type: "output", data: chunk.toString("utf8") })
        })
        stream.stderr.on("data", (chunk) => {
          send({ type: "output", data: chunk.toString("utf8") })
        })
        stream.on("close", () => {
          send({ type: "status", connected: false, message: "SSH shell closed" })
          closeAll()
        })
      },
    )
  })

  ssh.on("error", (err) => {
    send({ type: "error", message: err.message })
  })

  ssh.on("close", () => {
    if (isConnected) send({ type: "status", connected: false, message: "SSH disconnected" })
    isConnected = false
  })

  ws.on("message", (raw) => {
    /** @type {SshSocketIncoming} */
    let payload
    try {
      payload = JSON.parse(String(raw))
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

server.listen(PORT, BIND, () => {
  console.log(`[ssh-bridge] listening on ${BIND}:${PORT}`)
})
