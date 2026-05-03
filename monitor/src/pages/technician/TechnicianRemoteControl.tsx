import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { technicianNav } from "@/lib/nav"
import { db, isFirebaseConfigured } from "@/config/firebase"
import { COMPANY_DEFAULT_VPS_LABEL, ENGINEER_REMOTE_DEFAULTS } from "@/config/engineerRemoteHardcoded"
import {
  REMOTE_SSH_DEFAULT_HOST,
  REMOTE_SSH_DEFAULT_PASSWORD,
  REMOTE_SSH_DEFAULT_PORT,
  REMOTE_SSH_DEFAULT_USER,
} from "@/config/remoteSshDefaults"
import {
  getRemoteSshWebSocketUrl,
  remoteSshRequiresLocalDevTunnel,
  remoteSshUsesDedicatedBridge,
} from "@/lib/remote-ssh-ws"
import { COLLECTIONS, type RemoteVpsScope } from "@/data/schema"
import { collection, onSnapshot, query } from "@/lib/firebase-firestore"
import { fetchVpsAgentSnapshot, type VpsMetrics } from "@/lib/vps-agent-metrics"

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
  hostUptimeSeconds: number | null
}

interface RemoteTarget {
  id: string
  label: string
  sshHost: string
  sshPort: number
  sshUser: string
  sshPassword?: string
  scope: RemoteVpsScope
  lifecycleProtected: boolean
}

function parseRemoteTarget(id: string, data: Record<string, unknown>): RemoteTarget | null {
  const label = typeof data.label === "string" ? data.label.trim() : ""
  const sshHost = typeof data.sshHost === "string" ? data.sshHost.trim() : ""
  const sshUser = typeof data.sshUser === "string" ? data.sshUser.trim() : ""
  const sshPortRaw = data.sshPort
  const sshPort =
    typeof sshPortRaw === "number" && Number.isFinite(sshPortRaw)
      ? sshPortRaw
      : Number(sshPortRaw) || 22
  if (!label || !sshHost || !sshUser) return null
  const sshPassword = typeof data.sshPassword === "string" ? data.sshPassword : undefined
  const scope: RemoteVpsScope =
    data.scope === "client" || data.scope === "engineer" || data.scope === "ai" || data.scope === "company"
      ? data.scope
      : "company"
  const lifecycleProtected =
    typeof data.lifecycleProtected === "boolean"
      ? data.lifecycleProtected
      : scope === "company" && sshHost === ENGINEER_REMOTE_DEFAULTS.host && label.trim() === COMPANY_DEFAULT_VPS_LABEL
  return {
    id,
    label,
    sshHost,
    sshPort,
    sshUser,
    sshPassword,
    scope,
    lifecycleProtected,
  }
}

function fallbackTargets(): RemoteTarget[] {
  const host = REMOTE_SSH_DEFAULT_HOST
  const port = REMOTE_SSH_DEFAULT_PORT
  const username = REMOTE_SSH_DEFAULT_USER
  const password = REMOTE_SSH_DEFAULT_PASSWORD
  return [
    {
      id: "__fallback_primary__",
      label: "Serveur Principal - Technova Core (v2.4.1)",
      sshHost: host,
      sshPort: port,
      sshUser: username,
      sshPassword: password || undefined,
      scope: "company",
      lifecycleProtected: true,
    },
  ]
}

function regionLabel(t: RemoteTarget | undefined): string {
  if (!t) return "—"
  if (t.scope === "company") return "Europe-West (Paris)"
  return "—"
}

function instanceLabelForUi(t: RemoteTarget | undefined): string {
  if (!t) return "—"
  const slug = t.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12).toLowerCase()
  return slug ? `inst-${slug}` : "—"
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
    hostUptimeSeconds: null,
  }
}

function vpsMetricsToPerf(m: VpsMetrics): PerfSnapshot {
  const cpu = m.host.cpu
  const mem = m.host.memory
  const disk = m.host.disk
  return {
    cpuPercent: cpu.percent,
    loadAvg: `${cpu.load_1m.toFixed(2)} · ${cpu.load_5m.toFixed(2)} · ${cpu.load_15m.toFixed(2)}`,
    memUsedMb: Math.round(mem.used_gb * 1024),
    memTotalMb: Math.round(mem.total_gb * 1024),
    diskUsedMb: Math.round(disk.used_gb * 1024),
    diskTotalMb: Math.round(disk.total_gb * 1024),
    diskPercent: `${Math.round(disk.percent)}%`,
    runningContainers: m.container_summary.running,
    updatedAtMs: Date.now(),
    hostUptimeSeconds: m.host.uptime_seconds,
  }
}

function formatHostUptime(sec: number | null): string {
  if (sec == null || !Number.isFinite(sec)) return "—"
  const s = Math.floor(sec)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d > 0) return `${d}j ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatAgo(ms: number | null) {
  if (!ms) return "—"
  const sec = Math.max(1, Math.floor((Date.now() - ms) / 1000))
  if (sec < 60) return `Il y a ${sec}s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `Il y a ${min}m`
  const hr = Math.floor(min / 60)
  return `Il y a ${hr}h`
}

export default function TechnicianRemoteControl() {
  const [targets, setTargets] = useState<RemoteTarget[]>(() => fallbackTargets())
  const [selectedId, setSelectedId] = useState("")

  const [host, setHost] = useState("")
  const [port, setPort] = useState("22")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [output, setOutput] = useState("")
  const [cmd, setCmd] = useState("")
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [perf, setPerf] = useState<PerfSnapshot>(initialPerf)
  const [metricsApiError, setMetricsApiError] = useState<string | null>(null)

  const socketRef = useRef<WebSocket | null>(null)
  const terminalRef = useRef<HTMLDivElement>(null)
  const devTunnelRequired = remoteSshRequiresLocalDevTunnel()

  useEffect(() => {
    if (!db || !isFirebaseConfigured) return
    const q = query(collection(db, COLLECTIONS.remoteVpsEntries))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: RemoteTarget[] = []
        snap.forEach((d) => {
          const p = parseRemoteTarget(d.id, d.data() as Record<string, unknown>)
          if (p) rows.push(p)
        })
        rows.sort((a, b) => a.label.localeCompare(b.label, "fr"))
        setTargets(rows.length > 0 ? rows : fallbackTargets())
      },
      () => setTargets(fallbackTargets()),
    )
    return () => unsub()
  }, [])

  useEffect(() => {
    if (targets.length === 0) return
    setSelectedId((prev) => {
      if (prev && targets.some((t) => t.id === prev)) return prev
      return targets[0].id
    })
  }, [targets])

  useEffect(() => {
    const t = targets.find((x) => x.id === selectedId)
    if (!t) return
    setHost(t.sshHost)
    setPort(String(t.sshPort))
    setUsername(t.sshUser)
    setPassword(t.sshPassword ?? "")
  }, [selectedId, targets])

  const selectedTarget = useMemo(() => targets.find((x) => x.id === selectedId), [targets, selectedId])

  useEffect(() => {
    if (!terminalRef.current) return
    terminalRef.current.scrollTop = terminalRef.current.scrollHeight
  }, [output])

  useEffect(() => {
    let cancelled = false
    async function loadMetrics() {
      try {
        const snap = await fetchVpsAgentSnapshot()
        if (cancelled) return
        setPerf(vpsMetricsToPerf(snap.metrics))
        setMetricsApiError(null)
      } catch (err) {
        if (cancelled) return
        setMetricsApiError(err instanceof Error ? err.message : "Métriques indisponibles")
      }
    }
    void loadMetrics()
    const id = window.setInterval(() => void loadMetrics(), 15_000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  useEffect(() => {
    return () => {
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [])

  function appendOutput(text: string) {
    setOutput((prev) => `${prev}${text}`.slice(-140_000))
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

    const ws = new WebSocket(getRemoteSshWebSocketUrl())
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
            appendOutput("[auto-run] docker ps\r\n")
            ws.send(
              JSON.stringify({
                type: "input",
                data: "docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'\n",
              }),
            )
          }
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
      setErrorText(
        remoteSshUsesDedicatedBridge()
          ? "Pont SSH inaccessible (vérifiez « npm run ssh-bridge » et REMOTE_SSH_WEBSOCKET_URL dans src/config/remoteSshDefaults.ts)."
          : "Impossible d'ouvrir le tunnel SSH (lancez « npm run dev » sur localhost, ou « npm run ssh-bridge » et renseignez REMOTE_SSH_WEBSOCKET_URL pour preview).",
      )
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

  const quickCmds = ["docker ps", "docker stats --no-stream", "docker compose ps", "uptime", "free -h", "df -h"]

  const memPercent =
    perf.memUsedMb != null && perf.memTotalMb && perf.memTotalMb > 0
      ? Math.round((perf.memUsedMb / perf.memTotalMb) * 100)
      : null
  const diskPercentNum = perf.diskPercent ? Number(perf.diskPercent.replace("%", "")) : null
  const uptimeText = useMemo(() => formatHostUptime(perf.hostUptimeSeconds), [perf.hostUptimeSeconds])

  return (
    <DashboardLayout role="technician" navItems={technicianNav} pageTitle="Contrôle à distance">
      <div className="w-full bg-[#111621] p-6 text-slate-100 lg:p-8">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div className="flex min-w-72 flex-col gap-2">
              <h1 className="text-4xl font-black tracking-[-0.033em] text-white">Contrôle à distance</h1>
              <p className="text-base text-[#9da6b9]">Gérez et envoyez des commandes aux instances d'application en temps réel.</p>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset ${
                connected
                  ? "bg-green-500/10 text-green-400 ring-green-500/20"
                  : "bg-amber-500/10 text-amber-300 ring-amber-500/25"
              }`}
            >
              {connected ? "Système opérationnel" : "Système hors ligne"}
            </span>
          </div>

          <div className="rounded-xl border border-[#282d39] bg-[#1c212c] p-6 shadow-sm">
            <div className="flex flex-col items-end gap-4 md:flex-row">
              <label className="flex min-w-64 flex-1 flex-col">
                <span className="pb-2 text-sm font-medium text-white">Sélectionner l'instance d'application</span>
                <div className="relative">
                  <select
                    value={selectedId}
                    onChange={(e) => {
                      const id = e.target.value
                      if (connected || connecting) disconnect()
                      setSelectedId(id)
                    }}
                    disabled={connected || connecting || targets.length === 0}
                    className="h-12 w-full appearance-none rounded-lg border border-[#282d39] bg-[#111621] pl-4 pr-10 text-white disabled:opacity-60"
                  >
                    {targets.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined pointer-events-none absolute right-3 top-3 text-slate-400">expand_more</span>
                </div>
              </label>

              <div className="flex items-center gap-4 border-l border-[#282d39] pl-6">
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">ID Instance</span>
                  <span className="font-mono text-sm text-white">{instanceLabelForUi(selectedTarget)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Région</span>
                  <span className="text-sm font-medium text-white">{regionLabel(selectedTarget)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <input value={host} onChange={(e) => setHost(e.target.value)} disabled={connected || connecting} placeholder="Host" className="h-10 rounded-lg border border-[#282d39] bg-[#111621] px-3 text-sm text-white" />
              <input value={port} onChange={(e) => setPort(e.target.value)} disabled={connected || connecting} placeholder="Port" className="h-10 rounded-lg border border-[#282d39] bg-[#111621] px-3 text-sm text-white" />
              <input value={username} onChange={(e) => setUsername(e.target.value)} disabled={connected || connecting} placeholder="Utilisateur SSH" className="h-10 rounded-lg border border-[#282d39] bg-[#111621] px-3 text-sm text-white" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={connected || connecting} placeholder="Mot de passe" className="h-10 rounded-lg border border-[#282d39] bg-[#111621] px-3 text-sm text-white" />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-400">{devTunnelRequired ? "Ouvrir via localhost/127.0.0.1 pour activer le tunnel SSH dev." : "Tunnel SSH WebSocket actif via /__dev/ssh/ws"}</p>
              <button
                onClick={connected ? disconnect : connect}
                disabled={connecting}
                className={`h-10 rounded-lg px-5 text-sm font-semibold text-white ${connected ? "bg-red-600 hover:bg-red-700" : "bg-[#dc2626] hover:bg-red-700"}`}
              >
                {connecting ? "Connexion..." : connected ? "Déconnecter" : "Connecter SSH"}
              </button>
            </div>
            {errorText ? <p className="mt-2 text-xs text-rose-400">{errorText}</p> : null}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="group relative overflow-hidden rounded-xl border border-[#282d39] bg-[#1c212c] p-6 shadow-sm">
              <div className="absolute right-0 top-0 p-4 opacity-10"><span className="material-symbols-outlined text-6xl text-[#dc2626]">check_circle</span></div>
              <div className="mb-2 flex items-center gap-2 text-[#9da6b9]"><span className="material-symbols-outlined text-[20px]">dns</span><span className="text-sm font-medium">État actuel</span></div>
              <p
                className={`flex items-center gap-2 text-3xl font-bold leading-tight ${
                  connected ? "text-green-500" : "text-slate-400"
                }`}
              >
                {connected ? (
                  <>
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
                    </span>
                    En ligne
                  </>
                ) : (
                  <>
                    <span className="inline-flex h-3 w-3 rounded-full bg-slate-500" />
                    Hors ligne
                  </>
                )}
              </p>
            </div>
            <div className="group relative overflow-hidden rounded-xl border border-[#282d39] bg-[#1c212c] p-6 shadow-sm">
              <div className="absolute right-0 top-0 p-4 opacity-10"><span className="material-symbols-outlined text-6xl text-[#dc2626]">schedule</span></div>
              <div className="mb-2 flex items-center gap-2 text-[#9da6b9]"><span className="material-symbols-outlined text-[20px]">timer</span><span className="text-sm font-medium">Temps de fonctionnement</span></div>
              <p className="text-3xl font-bold leading-tight text-white">{uptimeText}</p>
            </div>
            <div className="group relative overflow-hidden rounded-xl border border-[#282d39] bg-[#1c212c] p-6 shadow-sm">
              <div className="absolute right-0 top-0 p-4 opacity-10"><span className="material-symbols-outlined text-6xl text-[#dc2626]">history</span></div>
              <div className="mb-2 flex items-center gap-2 text-[#9da6b9]"><span className="material-symbols-outlined text-[20px]">terminal</span><span className="text-sm font-medium">Dernière activité</span></div>
              <p className="text-3xl font-bold leading-tight text-white">{formatAgo(perf.updatedAtMs)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="flex flex-col gap-6 lg:col-span-1">
              <h2 className="flex items-center gap-2 text-xl font-bold text-white"><span className="material-symbols-outlined text-[#dc2626]">tune</span>Panneau de contrôle</h2>
              <div className="flex h-full flex-col justify-between gap-4 rounded-xl border border-[#282d39] bg-[#1c212c] p-6 shadow-sm">
                <button
                  type="button"
                  disabled={!connected}
                  onClick={() => sendLine("docker start $(docker ps -aq)")}
                  className="group w-full rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-left hover:bg-green-500/20 disabled:pointer-events-none disabled:opacity-40"
                >
                  <p className="font-bold text-white">Démarrer</p>
                  <p className="text-xs text-slate-400">Lancer l&apos;instance</p>
                </button>
                <button
                  type="button"
                  disabled={!connected || !!selectedTarget?.lifecycleProtected}
                  title={selectedTarget?.lifecycleProtected ? "Instance protégée — arrêt désactivé" : undefined}
                  onClick={() => sendLine("docker stop $(docker ps -q)")}
                  className="group w-full rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-left hover:bg-red-500/20 disabled:pointer-events-none disabled:opacity-40"
                >
                  <p className="font-bold text-white">Arrêter</p>
                  <p className="text-xs text-slate-400">Stopper tous les processus</p>
                </button>
                <button
                  type="button"
                  disabled={!connected || !!selectedTarget?.lifecycleProtected}
                  title={selectedTarget?.lifecycleProtected ? "Instance protégée — redémarrage désactivé" : undefined}
                  onClick={() => sendLine("docker restart $(docker ps -q)")}
                  className="group w-full rounded-lg border border-orange-500/20 bg-orange-500/10 p-4 text-left hover:bg-orange-500/20 disabled:pointer-events-none disabled:opacity-40"
                >
                  <p className="font-bold text-white">Redémarrer</p>
                  <p className="text-xs text-slate-400">Redémarrage sécurisé</p>
                </button>
                <div className="my-2 h-px w-full bg-[#282d39]" />
                <button
                  type="button"
                  disabled={!connected || !!selectedTarget?.lifecycleProtected}
                  title={selectedTarget?.lifecycleProtected ? "Instance protégée — mise à jour désactivée" : undefined}
                  onClick={() => sendLine("docker compose pull && docker compose up -d")}
                  className="group w-full rounded-lg border border-[#dc2626]/20 bg-[#dc2626]/10 p-4 text-left hover:bg-[#dc2626]/20 disabled:pointer-events-none disabled:opacity-40"
                >
                  <p className="font-bold text-white">Mise à jour</p>
                  <p className="text-xs text-slate-400">Vers version disponible</p>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-6 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-bold text-white"><span className="material-symbols-outlined text-[#dc2626]">terminal</span>Console de commande</h2>
              </div>
              <div className="flex min-h-[400px] flex-col overflow-hidden rounded-xl border border-[#282d39] bg-[#0f1115] shadow-inner">
                <div ref={terminalRef} className="max-h-[400px] flex-1 space-y-2 overflow-y-auto p-4 font-mono text-sm text-slate-300">
                  {output ? (
                    output.split(/\r?\n/).map((line, i) => (
                      <div key={i} className="min-h-[1em] whitespace-pre-wrap break-words">{line}</div>
                    ))
                  ) : (
                    <div className="text-slate-500">Aucune sortie console pour le moment.</div>
                  )}
                </div>
                <div className="border-t border-[#282d39] bg-[#181b21] p-3">
                  <div className="mb-2 flex flex-wrap gap-2">
                    {quickCmds.map((q) => (
                      <button
                        key={q}
                        type="button"
                        disabled={!connected}
                        onClick={() => sendLine(q)}
                        className="rounded border border-[#282d39] bg-[#111621] px-2.5 py-1 text-[11px] text-slate-300 hover:bg-[#1f2530] disabled:opacity-40 disabled:pointer-events-none"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="select-none font-mono font-bold text-[#dc2626]">&gt;</span>
                    <input
                      value={cmd}
                      onChange={(e) => setCmd(e.target.value)}
                      onKeyDown={handleKey}
                      disabled={!connected}
                      placeholder="Tapez une commande ici..."
                      className="w-full border-none bg-transparent p-0 font-mono text-white placeholder:text-slate-600 focus:ring-0 disabled:opacity-40"
                    />
                    <button
                      type="button"
                      disabled={!connected}
                      onClick={() => {
                        sendLine(cmd)
                        setCmd("")
                      }}
                      className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <span className="material-symbols-outlined text-[20px]">send</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-[#282d39] bg-[#1c212c] p-6">
              <h3 className="mb-4 flex items-center gap-2 font-bold text-white"><span className="material-symbols-outlined text-[#dc2626]">memory</span>Ressources CPU</h3>
              <div className="relative h-4 w-full overflow-hidden rounded-full bg-[#282d39]"><div className="absolute left-0 top-0 h-full rounded-full bg-[#dc2626]" style={{ width: `${perf.cpuPercent ?? 0}%` }} /></div>
              <div className="mt-2 flex justify-between text-sm text-slate-400"><span>Utilisé: {perf.cpuPercent != null ? `${perf.cpuPercent.toFixed(1)}%` : "—"}</span><span>Load: {perf.loadAvg ?? "—"}</span></div>
            </div>
            <div className="rounded-xl border border-[#282d39] bg-[#1c212c] p-6">
              <h3 className="mb-4 flex items-center gap-2 font-bold text-white"><span className="material-symbols-outlined text-[#dc2626]">hard_drive</span>Mémoire RAM</h3>
              <div className="relative h-4 w-full overflow-hidden rounded-full bg-[#282d39]"><div className="absolute left-0 top-0 h-full rounded-full bg-orange-500" style={{ width: `${memPercent ?? 0}%` }} /></div>
              <div className="mt-2 flex justify-between text-sm text-slate-400"><span>Utilisé: {memPercent != null ? `${memPercent}%` : "—"}</span><span>{perf.memUsedMb != null && perf.memTotalMb != null ? `${perf.memUsedMb} / ${perf.memTotalMb} MB` : "—"}</span></div>
            </div>
          </div>

          <div className="rounded-xl border border-[#282d39] bg-[#1c212c] p-4 text-xs text-slate-400">
            <span className="text-slate-500">
              Métriques agent VPS (/health + /metrics){metricsApiError ? ` · ${metricsApiError}` : ""}
            </span>
            <br />
            Containers: {perf.runningContainers ?? "—"} • Disque: {perf.diskPercent ?? "—"}
            {perf.diskUsedMb != null && perf.diskTotalMb != null ? ` (${perf.diskUsedMb}/${perf.diskTotalMb} MB)` : ""}
            {diskPercentNum != null ? ` • Utilisation disque ${diskPercentNum}%` : ""}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
