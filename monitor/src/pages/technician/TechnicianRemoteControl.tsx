import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { technicianNav } from "@/lib/nav"

type WsEvent =
  | { type: "status"; connected?: boolean; message?: string }
  | { type: "output"; data: string }
  | { type: "error"; message: string }

type PerfSnapshot = {
  cpuPercent: number | null
  loadAvg: string | null
  memUsedMb: number | null
  memTotalMb: number | null
  diskUsedMb: number | null
  diskTotalMb: number | null
  diskPercent: string | null
  runningContainers: number | null
  updatedAtMs: number | null
}

const AUTO_HOST = "194.146.13.22"
const AUTO_PORT = "22"
const AUTO_USERNAME = "root"
const AUTO_PASSWORD = "fetho125"

function wsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss" : "ws"
  return `${proto}://${window.location.host}/__dev/ssh/ws`
}

function requiresDevTunnel(): boolean {
  const host = window.location.hostname
  return !(host === "localhost" || host === "127.0.0.1")
}

function buildAutoMonitorScript(): string {
  return [
    "echo '__MON__ CONTAINERS='$(docker ps -q | wc -l | tr -d ' ')",
    "echo '__MON__ LOAD='$(awk '{print $1\",\"$2\",\"$3}' /proc/loadavg)",
    "echo '__MON__ MEM='$(free -m | awk '/Mem:/ {print $3\",\"$2}')",
    "echo '__MON__ DISK='$(df -Pm / | awk 'NR==2 {print $3\",\"$2\",\"$5}')",
    "echo '__MON__ CPU='$(vmstat 1 2 | tail -1 | awk '{print 100-$15}')",
  ].join("\\n")
}

function initialPerf(): PerfSnapshot {
  return {
    cpuPercent: null,
    loadAvg: null,
    memUsedMb: null,
    memTotalMb: null,
    diskUsedMb: null,
    diskTotalMb: null,
    diskPercent: null,
    runningContainers: null,
    updatedAtMs: null,
  }
}

export default function TechnicianRemoteControl() {
  const [host, setHost] = useState(AUTO_HOST)
  const [port, setPort] = useState(AUTO_PORT)
  const [username, setUsername] = useState(AUTO_USERNAME)
  const [password, setPassword] = useState(AUTO_PASSWORD)

  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [output, setOutput] = useState("")
  const [cmd, setCmd] = useState("")
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [autoTried, setAutoTried] = useState(false)
  const [perf, setPerf] = useState<PerfSnapshot>(initialPerf)

  const socketRef = useRef<WebSocket | null>(null)
  const terminalRef = useRef<HTMLDivElement>(null)
  const parseBufferRef = useRef("")
  const monitorTimerRef = useRef<number | null>(null)
  const devTunnelRequired = requiresDevTunnel()

  useEffect(() => {
    if (!terminalRef.current) return
    terminalRef.current.scrollTop = terminalRef.current.scrollHeight
  }, [output])

  useEffect(() => {
    return () => {
      if (monitorTimerRef.current) {
        window.clearInterval(monitorTimerRef.current)
        monitorTimerRef.current = null
      }
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [])

  function appendOutput(text: string) {
    setOutput((prev) => {
      const next = `${prev}${text}`
      return next.slice(-140_000)
    })
  }

  function disconnect() {
    if (monitorTimerRef.current) {
      window.clearInterval(monitorTimerRef.current)
      monitorTimerRef.current = null
    }
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

  function parseMonitorLines(chunk: string) {
    const merged = `${parseBufferRef.current}${chunk}`
    const lines = merged.split(/\r?\n/)
    parseBufferRef.current = lines.pop() ?? ""

    for (const raw of lines) {
      const line = raw.trim()
      if (!line.startsWith("__MON__ ")) continue
      const payload = line.replace("__MON__ ", "")
      const eqIdx = payload.indexOf("=")
      if (eqIdx <= 0) continue
      const key = payload.slice(0, eqIdx)
      const value = payload.slice(eqIdx + 1)

      setPerf((prev) => {
        const next: PerfSnapshot = { ...prev, updatedAtMs: Date.now() }
        if (key === "CONTAINERS") {
          const n = Number(value)
          next.runningContainers = Number.isFinite(n) ? n : prev.runningContainers
        } else if (key === "LOAD") {
          next.loadAvg = value || prev.loadAvg
        } else if (key === "MEM") {
          const [used, total] = value.split(",").map((x) => Number(x))
          next.memUsedMb = Number.isFinite(used) ? used : prev.memUsedMb
          next.memTotalMb = Number.isFinite(total) ? total : prev.memTotalMb
        } else if (key === "DISK") {
          const [used, total, pct] = value.split(",")
          const usedN = Number(used)
          const totalN = Number(total)
          next.diskUsedMb = Number.isFinite(usedN) ? usedN : prev.diskUsedMb
          next.diskTotalMb = Number.isFinite(totalN) ? totalN : prev.diskTotalMb
          next.diskPercent = pct ?? prev.diskPercent
        } else if (key === "CPU") {
          const n = Number(value)
          next.cpuPercent = Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : prev.cpuPercent
        }
        return next
      })
    }
  }

  function connect() {
    if (!host.trim() || !username.trim()) {
      setErrorText("Host et utilisateur sont obligatoires.")
      return
    }

    setErrorText(null)
    setConnecting(true)

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
          if (data.connected) {
            appendOutput(`\r\n[connected to ${host}]\r\n`)
            appendOutput("[auto-run] docker ps + background VPS performance monitoring (15s)\\n")
            ws.send(JSON.stringify({ type: "input", data: "docker ps --format 'table {{.Names}}\\t{{.Image}}\\t{{.Status}}'\\n" }))
            ws.send(JSON.stringify({ type: "input", data: `${buildAutoMonitorScript()}\n` }))
            if (monitorTimerRef.current) window.clearInterval(monitorTimerRef.current)
            monitorTimerRef.current = window.setInterval(() => {
              if (!socketRef.current || socketRef.current.readyState !== 1) return
              socketRef.current.send(JSON.stringify({ type: "input", data: `${buildAutoMonitorScript()}\n` }))
            }, 15_000)
          }
        }
        if (data.message && !data.connected) appendOutput(`\r\n[${data.message}]\r\n`)
        return
      }

      if (data.type === "output") {
        setConnecting(false)
        parseMonitorLines(data.data)
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
      if (monitorTimerRef.current) {
        window.clearInterval(monitorTimerRef.current)
        monitorTimerRef.current = null
      }
      setConnected(false)
      setConnecting(false)
      appendOutput("\r\n[connection closed]\r\n")
    }

    ws.onerror = () => {
      setErrorText("Impossible d'ouvrir le tunnel SSH (dev server).")
      setConnecting(false)
    }
  }

  useEffect(() => {
    if (autoTried || connecting || connected) return
    setAutoTried(true)
    connect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTried, connecting, connected])

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

  const quickCmds = [
    "docker ps",
    "docker stats --no-stream",
    "docker compose ps",
    "uptime",
    "free -h",
    "df -h",
  ]

  const memPercent =
    perf.memUsedMb != null && perf.memTotalMb && perf.memTotalMb > 0
      ? Math.round((perf.memUsedMb / perf.memTotalMb) * 100)
      : null
  const diskPercentNum = perf.diskPercent ? Number(perf.diskPercent.replace("%", "")) : null

  return (
    <DashboardLayout role="technician" navItems={technicianNav} pageTitle="Contrôle à Distance">
      <div className="p-6 w-full space-y-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300">
          Monitoring Docker via tunnel SSH WebSocket `__dev/ssh/ws`.
          {devTunnelRequired ? " Ouvrez cette interface depuis l'environnement dev local pour activer la connexion." : ""}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <div className="lg:col-span-2">
              <label className="text-xs text-slate-500">Host</label>
              <input
                value={host}
                onChange={(e) => setHost(e.target.value)}
                disabled={connected || connecting}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                placeholder="194.146.13.22"
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

          {errorText ? <p className="text-xs text-rose-600">{errorText}</p> : null}

          <div className="flex justify-end">
            <button
              onClick={connected ? disconnect : connect}
              className={`px-4 py-2 rounded-lg text-sm font-semibold text-white ${
                connected ? "bg-rose-600 hover:bg-rose-700" : "bg-amber-500 hover:bg-amber-600"
              }`}
              disabled={connecting}
            >
              {connecting ? "Connexion..." : connected ? "Déconnecter" : "Connecter SSH"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-xs text-slate-500">Containers running</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{perf.runningContainers ?? "—"}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-xs text-slate-500">CPU</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {perf.cpuPercent != null ? `${perf.cpuPercent.toFixed(1)}%` : "—"}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Load: {perf.loadAvg ?? "—"}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-xs text-slate-500">Memory</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {memPercent != null ? `${memPercent}%` : "—"}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {perf.memUsedMb != null && perf.memTotalMb != null ? `${perf.memUsedMb} / ${perf.memTotalMb} MB` : "—"}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-xs text-slate-500">Disk /</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {perf.diskPercent ?? "—"}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {perf.diskUsedMb != null && perf.diskTotalMb != null ? `${perf.diskUsedMb} / ${perf.diskTotalMb} MB` : "—"}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Background Monitoring</p>
            <p className="text-[11px] text-slate-500">
              {connected ? "Active (every 15s)" : "Inactive"}{perf.updatedAtMs ? ` · Last update ${new Date(perf.updatedAtMs).toLocaleTimeString("fr-FR")}` : ""}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div className="h-full bg-amber-500" style={{ width: `${perf.cpuPercent ?? 0}%` }} />
            </div>
            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${memPercent ?? 0}%` }} />
            </div>
            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${Number.isFinite(diskPercentNum as number) ? diskPercentNum : 0}%` }} />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 dark:bg-black rounded-xl border border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
            <span className="text-slate-300 text-xs font-mono">{`ssh ${username || "user"}@${host || "host"}`}</span>
            <span className={`text-xs ${connected ? "text-emerald-400" : "text-slate-500"}`}>
              {connected ? "Connecté" : connecting ? "Connexion..." : "Hors ligne"}
            </span>
          </div>

          <div
            ref={terminalRef}
            className="p-4 min-h-[360px] max-h-[460px] overflow-y-auto text-[13px] leading-5 font-mono whitespace-pre-wrap text-slate-200"
          >
            {output || "Connexion automatique en cours..."}
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
              className="size-8 flex items-center justify-center rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">send</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {quickCmds.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => sendLine(c)}
              disabled={!connected}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
