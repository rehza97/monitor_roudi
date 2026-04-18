import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { engineerNav } from "@/lib/nav"
import { db } from "@/config/firebase"
import { COLLECTIONS } from "@/data/schema"
import { collection, onSnapshot, query } from "@/lib/firebase-firestore"

type RemoteTarget = {
  id: string
  label: string
  host: string
  ip: string
}

type WsEvent =
  | { type: "status"; connected?: boolean; message?: string }
  | { type: "output"; data: string }
  | { type: "error"; message: string }

function hostFromLabel(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

function wsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss" : "ws"
  return `${proto}://${window.location.host}/__dev/ssh/ws`
}

function requiresDevTunnel(): boolean {
  const host = window.location.hostname
  return !(host === "localhost" || host === "127.0.0.1")
}

export default function EngineerRemoteControl() {
  const [servers, setServers] = useState<RemoteTarget[]>([])
  const [serverIdx, setServerIdx] = useState(0)
  const [host, setHost] = useState("")
  const [port, setPort] = useState("22")
  const [username, setUsername] = useState("root")
  const [password, setPassword] = useState("")
  const [privateKey, setPrivateKey] = useState("")
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [output, setOutput] = useState("")
  const [cmd, setCmd] = useState("")
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const [errorText, setErrorText] = useState<string | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const terminalRef = useRef<HTMLDivElement>(null)
  const devTunnelRequired = requiresDevTunnel()

  const server = servers[serverIdx]

  useEffect(() => {
    if (!db) return
    const q = query(collection(db, COLLECTIONS.deployments))
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d, i) => {
        const data = d.data() as Record<string, unknown>
        const label =
          typeof data.name === "string"
            ? data.name
            : typeof data.productSlug === "string"
              ? data.productSlug
              : `server-${i + 1}`
        const hostName = `${hostFromLabel(label)}.roudi.dz`
        return {
          id: d.id,
          label,
          host: hostName,
          ip: `10.20.${(i % 20) + 10}.${(i % 150) + 20}`,
        } satisfies RemoteTarget
      })
      setServers(list)
      setServerIdx((prev) => (list.length === 0 ? 0 : Math.min(prev, list.length - 1)))
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!server) return
    setHost(server.host)
  }, [server?.id])

  useEffect(() => {
    if (!terminalRef.current) return
    terminalRef.current.scrollTop = terminalRef.current.scrollHeight
  }, [output])

  useEffect(() => {
    return () => {
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [])

  function appendOutput(text: string) {
    setOutput((prev) => {
      const next = `${prev}${text}`
      return next.slice(-120_000)
    })
  }

  function disconnect() {
    if (socketRef.current) {
      try {
        socketRef.current.send(JSON.stringify({ type: "disconnect" }))
      } catch {
        // noop
      }
      socketRef.current.close()
      socketRef.current = null
    }
    setConnected(false)
    setConnecting(false)
  }

  function connect() {
    if (!host.trim() || !username.trim()) {
      setErrorText("Host et utilisateur sont obligatoires.")
      return
    }

    setErrorText(null)
    setConnecting(true)
    setOutput("")

    const ws = new WebSocket(wsUrl())
    socketRef.current = ws

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "connect",
          host: host.trim(),
          port: Number(port) || 22,
          username: username.trim(),
          password: password || undefined,
          privateKey: privateKey || undefined,
        }),
      )
    }

    ws.onmessage = (event) => {
      let data: WsEvent
      try {
        data = JSON.parse(String(event.data)) as WsEvent
      } catch {
        return
      }

      if (data.type === "status") {
        if (typeof data.connected === "boolean") {
          setConnected(data.connected)
          if (!data.connected) setConnecting(false)
          if (data.connected) appendOutput(`\r\n[connected to ${host}]\r\n`)
        }
        if (data.message && !data.connected) appendOutput(`\r\n[${data.message}]\r\n`)
        return
      }

      if (data.type === "output") {
        setConnecting(false)
        appendOutput(data.data)
        return
      }

      if (data.type === "error") {
        setErrorText(data.message)
        appendOutput(`\r\n[error] ${data.message}\r\n`)
        setConnecting(false)
      }
    }

    ws.onclose = () => {
      setConnected(false)
      setConnecting(false)
      appendOutput("\r\n[connection closed]\r\n")
    }

    ws.onerror = () => {
      setErrorText("Impossible d'ouvrir le tunnel SSH (dev server).")
      setConnecting(false)
    }
  }

  function sendLine(line: string) {
    if (!connected || !socketRef.current) return
    const trimmed = line.trim()
    if (!trimmed) return
    socketRef.current.send(JSON.stringify({ type: "input", data: `${line}\n` }))
    setHistory((h) => [trimmed, ...h])
    setHistIdx(-1)
  }

  function handleKey(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      sendLine(cmd)
      setCmd("")
      return
    }

    if (e.key === "ArrowUp") {
      e.preventDefault()
      const next = Math.min(histIdx + 1, history.length - 1)
      setHistIdx(next)
      setCmd(history[next] ?? "")
      return
    }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      const next = Math.max(histIdx - 1, -1)
      setHistIdx(next)
      setCmd(next === -1 ? "" : (history[next] ?? ""))
    }
  }

  const quickCmds = ["pwd", "ls -la", "uptime", "docker ps", "top -b -n1 | head -n 15"]

  return (
    <DashboardLayout role="engineer" navItems={engineerNav} pageTitle="Contrôle à Distance">
      <div className="p-6 w-full space-y-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300">
          Cette page dépend du tunnel WebSocket SSH `__dev/ssh/ws`.
          {devTunnelRequired ? " Ouvrez l’application via l’environnement dev local pour activer la connexion." : " Vérifiez que le serveur dev expose bien cet endpoint."}
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <div className="lg:col-span-2">
              <label className="text-xs text-slate-500">Serveur</label>
              <select
                value={serverIdx}
                onChange={(e) => setServerIdx(Number(e.target.value))}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                disabled={servers.length === 0 || connected || connecting}
              >
                {servers.length === 0 ? <option>Aucun déploiement</option> : null}
                {servers.map((s, i) => (
                  <option key={s.id} value={i}>{`${s.label} (${s.ip})`}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-500">Host</label>
              <input
                value={host}
                onChange={(e) => setHost(e.target.value)}
                disabled={connected || connecting}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                placeholder="vps.example.com"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500">Port</label>
              <input
                value={port}
                onChange={(e) => setPort(e.target.value)}
                disabled={connected || connecting}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                placeholder="22"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-500">Utilisateur SSH</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={connected || connecting}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                placeholder="root"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={connected || connecting}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                placeholder="password"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500">Clé privée (optionnel)</label>
              <input
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                disabled={connected || connecting}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
              />
            </div>
          </div>

          {errorText ? <p className="text-xs text-rose-600">{errorText}</p> : null}

          <div className="flex justify-end">
            <button
              onClick={connected ? disconnect : connect}
              className={`px-4 py-2 rounded-lg text-sm font-semibold text-white ${
                connected ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"
              }`}
              disabled={connecting}
            >
              {connecting ? "Connexion..." : connected ? "Déconnecter" : "Connecter SSH"}
            </button>
          </div>
        </div>

        <div className="bg-slate-900 dark:bg-black rounded-xl border border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
            <span className="text-slate-300 text-xs font-mono">{`ssh ${username || "user"}@${host || "host"}`}</span>
            <span className={`text-xs ${connected ? "text-emerald-400" : "text-slate-500"}`}>
              {connected ? "Connecte" : connecting ? "Connexion..." : "Hors ligne"}
            </span>
          </div>

          <div
            ref={terminalRef}
            className="p-4 min-h-[320px] max-h-[420px] overflow-y-auto text-[13px] leading-5 font-mono whitespace-pre-wrap text-slate-200"
          >
            {output || "Selectionnez un serveur puis ouvrez la connexion SSH."}
          </div>

          <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-700">
            <span className="text-emerald-400 font-mono text-sm shrink-0">$</span>
            <input
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
              onKeyDown={handleKey}
              disabled={!connected}
              className="flex-1 bg-transparent font-mono text-sm text-white focus:outline-none disabled:cursor-not-allowed placeholder:text-slate-600"
              placeholder={connected ? "Entrer une commande shell" : "Connectez-vous d'abord"}
            />
            <button
              onClick={() => {
                sendLine(cmd)
                setCmd("")
              }}
              disabled={!connected}
              className="size-8 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">send</span>
            </button>
          </div>
        </div>

        {connected ? (
          <div className="flex flex-wrap gap-2">
            {quickCmds.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => sendLine(c)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {c}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  )
}
