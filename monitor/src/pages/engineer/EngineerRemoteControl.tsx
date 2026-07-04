import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { engineerNav } from "@/lib/nav"
import { db } from "@/config/firebase"
import { COMPANY_DEFAULT_VPS_LABEL, ENGINEER_REMOTE_DEFAULTS } from "@/config/engineerRemoteHardcoded"
import {
  REMOTE_SSH_DEFAULT_HOST,
  REMOTE_SSH_DEFAULT_PASSWORD,
  REMOTE_SSH_DEFAULT_PORT,
  REMOTE_SSH_DEFAULT_USER,
} from "@/config/remoteSshDefaults"
import {
  getRemoteSshWebSocketUrl,
  probeRemoteSshBridge,
  remoteSshBridgeErrorMessage,
  RENDER_SSH_BRIDGE_DEPLOY_URL,
  remoteSshRequiresLocalDevTunnel,
  remoteSshUsesDedicatedBridge,
} from "@/lib/remote-ssh-ws"
import { useAuth } from "@/contexts/AuthContext"
import {
  COLLECTIONS,
  type FirestoreRemoteVpsEntry,
  type RemoteVpsScope,
} from "@/data/schema"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
} from "@/lib/firebase-firestore"

type WsEvent =
  | { type: "status"; connected?: boolean; message?: string }
  | { type: "output"; data: string }
  | { type: "error"; message: string }

const SCOPE_LABELS: Record<RemoteVpsScope, string> = {
  client: "Client",
  engineer: "Ingénieur",
  ai: "IA",
  company: "Société",
}

const SCOPE_ORDER: RemoteVpsScope[] = ["client", "engineer", "ai", "company"]

function parseScope(v: unknown): RemoteVpsScope {
  if (v === "client" || v === "engineer" || v === "ai" || v === "company") return v
  return "company"
}

interface VpsRow {
  id: string
  label: string
  scope: RemoteVpsScope
  sshHost: string
  sshPort: number
  sshUser: string
  sshPassword?: string
  /** Company default VPS — reboot/shutdown disabled (always allowed for scope client only via canRunDestructiveRemoteCommands) */
  lifecycleProtected: boolean
}

function resolveLifecycleProtected(
  data: Record<string, unknown>,
  scope: RemoteVpsScope,
  sshHost: string,
  label: string,
): boolean {
  if (typeof data.lifecycleProtected === "boolean") return data.lifecycleProtected
  return scope === "company" && sshHost === ENGINEER_REMOTE_DEFAULTS.host && label.trim() === COMPANY_DEFAULT_VPS_LABEL
}

/** Reboot / shutdown / terminate — only for client VPS that are not the protected company default */
function canRunDestructiveRemoteCommands(row: VpsRow | undefined): boolean {
  if (!row || row.lifecycleProtected) return false
  return row.scope === "client"
}

function parseVpsRow(id: string, data: Record<string, unknown>): VpsRow | null {
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
  const scope = parseScope(data.scope)
  return {
    id,
    label,
    scope,
    sshHost,
    sshPort,
    sshUser,
    sshPassword,
    lifecycleProtected: resolveLifecycleProtected(data, scope, sshHost, label),
  }
}

/** Built-in row — always listed first; no Firestore needed */
const LOCAL_DEFAULT_VPS_ID = "__local_default_company__" as const

const HARDCODED_DEFAULT_COMPANY_VPS: VpsRow = {
  id: LOCAL_DEFAULT_VPS_ID,
  label: COMPANY_DEFAULT_VPS_LABEL,
  scope: "company",
  sshHost: ENGINEER_REMOTE_DEFAULTS.host,
  sshPort: ENGINEER_REMOTE_DEFAULTS.port,
  sshUser: ENGINEER_REMOTE_DEFAULTS.username,
  sshPassword: ENGINEER_REMOTE_DEFAULTS.password,
  lifecycleProtected: true,
}

function isLocalDefaultRow(id: string): boolean {
  return id === LOCAL_DEFAULT_VPS_ID
}

export default function EngineerRemoteControl() {
  const { user } = useAuth()
  const [rawRows, setRawRows] = useState<VpsRow[]>([])
  const [scopeFilter, setScopeFilter] = useState<"all" | RemoteVpsScope>("all")
  const [serverIdx, setServerIdx] = useState(0)
  const firstDataRef = useRef(false)

  const [host, setHost] = useState<string>(() => REMOTE_SSH_DEFAULT_HOST)
  const [port, setPort] = useState<string>(() => String(REMOTE_SSH_DEFAULT_PORT))
  const [username, setUsername] = useState<string>(() => REMOTE_SSH_DEFAULT_USER)
  const [password, setPassword] = useState<string>(() => REMOTE_SSH_DEFAULT_PASSWORD)
  const [pemPrivateKey, setPemPrivateKey] = useState("")
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [output, setOutput] = useState("")
  const [cmd, setCmd] = useState("")
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [bridgeProbe, setBridgeProbe] = useState<"idle" | "ok" | "missing" | "unreachable">("idle")
  const [crudError, setCrudError] = useState<string | null>(null)
  const [vpsModalOpen, setVpsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingVps, setSavingVps] = useState(false)
  const [showShutdownModal, setShowShutdownModal] = useState(false)
  const [confirmShutdownText, setConfirmShutdownText] = useState("")
  const [terminalModalOpen, setTerminalModalOpen] = useState(false)

  const [formLabel, setFormLabel] = useState("")
  const [formScope, setFormScope] = useState<RemoteVpsScope>("company")
  const [formHost, setFormHost] = useState("")
  const [formPort, setFormPort] = useState("22")
  const [formUser, setFormUser] = useState("root")
  const [formPassword, setFormPassword] = useState("")

  const socketRef = useRef<WebSocket | null>(null)
  const terminalRef = useRef<HTMLDivElement>(null)
  const devTunnelRequired = remoteSshRequiresLocalDevTunnel()

  useEffect(() => {
    if (devTunnelRequired || !remoteSshUsesDedicatedBridge()) {
      setBridgeProbe("ok")
      return
    }
    let cancelled = false
    void probeRemoteSshBridge().then((result) => {
      if (cancelled) return
      setBridgeProbe(result)
      if (result !== "ok") setErrorText(remoteSshBridgeErrorMessage(result))
    })
    return () => {
      cancelled = true
    }
  }, [devTunnelRequired])

  const mergedRows = useMemo(() => {
    const d = ENGINEER_REMOTE_DEFAULTS
    const fromFirestore = rawRows.filter((r) => {
      if (r.scope === "company" && r.sshHost === d.host && r.lifecycleProtected) return false
      if (r.scope === "company" && r.label === COMPANY_DEFAULT_VPS_LABEL && r.sshHost === d.host) return false
      return true
    })
    return [HARDCODED_DEFAULT_COMPANY_VPS, ...fromFirestore]
  }, [rawRows])

  const servers = useMemo(() => {
    const list =
      scopeFilter === "all" ? mergedRows : mergedRows.filter((r) => r.scope === scopeFilter)
    return [...list].sort((a, b) => {
      if (a.id === LOCAL_DEFAULT_VPS_ID) return -1
      if (b.id === LOCAL_DEFAULT_VPS_ID) return 1
      return a.label.localeCompare(b.label, "fr")
    })
  }, [mergedRows, scopeFilter])

  const server = servers[serverIdx]

  const scopeCounts = useMemo(() => {
    const c: Record<RemoteVpsScope, number> = {
      client: 0,
      engineer: 0,
      ai: 0,
      company: 0,
    }
    for (const r of mergedRows) {
      c[r.scope] += 1
    }
    return c
  }, [mergedRows])

  const applyCredentials = useCallback((target: VpsRow) => {
    setHost(target.sshHost)
    setPort(String(target.sshPort))
    setUsername(target.sshUser)
    setPassword(target.sshPassword ?? "")
  }, [])

  const selectServer = useCallback(
    (index: number) => {
      setServerIdx(index)
      const row = servers[index]
      if (row) applyCredentials(row)
    },
    [servers, applyCredentials],
  )

  useEffect(() => {
    if (!db) return
    const q = query(collection(db, COLLECTIONS.remoteVpsEntries))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: VpsRow[] = []
        for (const d of snap.docs) {
          const row = parseVpsRow(d.id, d.data() as Record<string, unknown>)
          if (row) rows.push(row)
        }
        setRawRows(rows)
      },
      () => {
        setRawRows([])
      },
    )
    return () => unsub()
  }, [])

  useEffect(() => {
    if (servers.length === 0) return
    setServerIdx((i) => Math.min(i, servers.length - 1))
  }, [servers.length])

  useEffect(() => {
    if (servers.length === 0 || firstDataRef.current) return
    firstDataRef.current = true
    applyCredentials(servers[0])
    setServerIdx(0)
  }, [servers, applyCredentials])

  useEffect(() => {
    if (!terminalRef.current) return
    terminalRef.current.scrollTop = terminalRef.current.scrollHeight
  }, [output, terminalModalOpen])

  useEffect(() => {
    if (!terminalModalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTerminalModalOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [terminalModalOpen])

  useEffect(() => {
    return () => {
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [])

  const appendOutput = useCallback((text: string) => {
    setOutput((prev) => `${prev}${text}`.slice(-120_000))
  }, [])

  const disconnect = useCallback(() => {
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
  }, [])

  const connect = useCallback(() => {
    if (!host.trim() || !username.trim()) {
      setErrorText("Host et utilisateur sont obligatoires.")
      return
    }

    disconnect()

    setErrorText(null)
    setConnecting(true)
    setOutput("")

    const ws = new WebSocket(getRemoteSshWebSocketUrl())
    socketRef.current = ws

    ws.onopen = () => {
      const pem = pemPrivateKey.trim()
      const usePem = pem.startsWith("-----BEGIN")
      ws.send(
        JSON.stringify({
          type: "connect",
          host: host.trim(),
          port: Number(port) || 22,
          username: username.trim(),
          password: usePem ? undefined : password || undefined,
          privateKey: usePem ? pem : undefined,
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
      setErrorText(
        remoteSshUsesDedicatedBridge()
          ? remoteSshBridgeErrorMessage(bridgeProbe === "missing" ? "missing" : "unreachable")
          : "Impossible d'ouvrir le tunnel SSH (lancez « npm run dev » sur localhost, ou « npm run ssh-bridge » et renseignez REMOTE_SSH_WEBSOCKET_URL pour preview).",
      )
      setConnecting(false)
    }
  }, [host, port, username, password, pemPrivateKey, appendOutput, disconnect, bridgeProbe])

  const connectRef = useRef(connect)
  connectRef.current = connect
  const autoSshLaunched = useRef(false)
  useEffect(() => {
    if (devTunnelRequired) return
    if (remoteSshUsesDedicatedBridge() && bridgeProbe !== "ok") return
    if (autoSshLaunched.current) return
    autoSshLaunched.current = true
    const t = window.setTimeout(() => {
      connectRef.current()
    }, 450)
    return () => window.clearTimeout(t)
  }, [devTunnelRequired, bridgeProbe])

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

  function openCreateModal() {
    setEditingId(null)
    setFormLabel("")
    setFormScope("company")
    setFormHost("")
    setFormPort("22")
    setFormUser("root")
    setFormPassword("")
    setCrudError(null)
    setVpsModalOpen(true)
  }

  function openEditModal(row: VpsRow) {
    if (isLocalDefaultRow(row.id)) {
      setCrudError("Le VPS société intégré est défini dans le code — ajoutez un autre VPS pour un accès modifiable dans Firestore.")
      return
    }
    setEditingId(row.id)
    setFormLabel(row.label)
    setFormScope(row.scope)
    setFormHost(row.sshHost)
    setFormPort(String(row.sshPort))
    setFormUser(row.sshUser)
    setFormPassword("")
    setCrudError(null)
    setVpsModalOpen(true)
  }

  async function saveVpsModal() {
    if (!db || !user) {
      setCrudError("Firebase ou utilisateur indisponible.")
      return
    }
    const label = formLabel.trim()
    const sshHost = formHost.trim()
    const sshUser = formUser.trim()
    if (!label || !sshHost || !sshUser) {
      setCrudError("Libellé, hôte et utilisateur sont obligatoires.")
      return
    }
    setSavingVps(true)
    setCrudError(null)
    try {
      const portNum = Number(formPort) || 22
      if (editingId) {
        const payload: Record<string, unknown> = {
          label,
          scope: formScope,
          sshHost,
          sshPort: portNum,
          sshUser,
          updatedAt: serverTimestamp(),
        }
        if (formPassword.trim()) payload.sshPassword = formPassword.trim()
        await updateDoc(doc(db, COLLECTIONS.remoteVpsEntries, editingId), payload)
      } else {
        const docData: FirestoreRemoteVpsEntry & { createdAt: unknown; updatedAt: unknown; createdByUserId: string } = {
          label,
          scope: formScope,
          sshHost,
          sshPort: portNum,
          sshUser,
          sshPassword: formPassword.trim() || undefined,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdByUserId: user.id,
        }
        await addDoc(collection(db, COLLECTIONS.remoteVpsEntries), docData as unknown as Record<string, unknown>)
      }
      setVpsModalOpen(false)
    } catch (e) {
      setCrudError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement.")
    } finally {
      setSavingVps(false)
    }
  }

  async function deleteVps(id: string, label: string, lifecycleProtected: boolean) {
    if (isLocalDefaultRow(id)) {
      setCrudError("Le VPS société intégré ne peut pas être supprimé.")
      return
    }
    if (lifecycleProtected) {
      setCrudError("Le VPS société par défaut ne peut pas être supprimé depuis l’interface.")
      return
    }
    if (!db) return
    if (!window.confirm(`Supprimer « ${label} » ?`)) return
    setCrudError(null)
    try {
      await deleteDoc(doc(db, COLLECTIONS.remoteVpsEntries, id))
    } catch (e) {
      setCrudError(e instanceof Error ? e.message : "Suppression impossible.")
    }
  }

  async function importCompanyDefault() {
    if (!db || !user) {
      setCrudError("Firebase ou utilisateur indisponible.")
      return
    }
    const d = ENGINEER_REMOTE_DEFAULTS
    if (rawRows.some((r) => r.lifecycleProtected && r.sshHost === d.host && r.scope === "company")) {
      setCrudError("Le VPS société par défaut est déjà enregistré.")
      return
    }
    setCrudError(null)
    try {
      await addDoc(collection(db, COLLECTIONS.remoteVpsEntries), {
        label: COMPANY_DEFAULT_VPS_LABEL,
        scope: "company",
        sshHost: d.host,
        sshPort: d.port,
        sshUser: d.username,
        sshPassword: d.password,
        lifecycleProtected: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdByUserId: user.id,
      } as unknown as Record<string, unknown>)
    } catch (e) {
      setCrudError(e instanceof Error ? e.message : "Import impossible.")
    }
  }

  return (
    <DashboardLayout role="engineer" navItems={engineerNav} pageTitle="Contrôle à Distance">
      <div className="w-full p-6 text-[#0f172a] md:p-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-slate-500">Accueil</span>
              <span className="material-symbols-outlined text-xs text-slate-400">chevron_right</span>
              <span className="font-medium text-slate-500">Ingénierie</span>
              <span className="material-symbols-outlined text-xs text-slate-400">chevron_right</span>
              <span className="font-semibold text-slate-900">Contrôle à Distance</span>
            </div>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl font-black tracking-tight md:text-4xl">Contrôle à Distance</h1>
                <p className="text-base text-slate-500">
                  VPS enregistrés par périmètre (client, ingénieur, IA, société), puis connexion SSH.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <span className="material-symbols-outlined text-lg">refresh</span>
                  Actualiser
                </button>
                <button
                  type="button"
                  onClick={importCompanyDefault}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <span className="material-symbols-outlined text-lg">download</span>
                  Importer VPS société
                </button>
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                  Ajouter un VPS
                </button>
              </div>
            </div>
          </div>

          {errorText ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 space-y-2">
              <p>{errorText}</p>
              {remoteSshUsesDedicatedBridge() && bridgeProbe !== "ok" ? (
                <a
                  href={RENDER_SSH_BRIDGE_DEPLOY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  Déployer roudi-ssh-bridge sur Render
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                </a>
              ) : null}
            </div>
          ) : null}
          {crudError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{crudError}</div>
          ) : null}
          {devTunnelRequired ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
              Connexion SSH : ouvrez l&apos;app en <code className="rounded bg-amber-100/80 px-1">localhost</code> /{" "}
              <code className="rounded bg-amber-100/80 px-1">127.0.0.1</code> avec <code className="rounded bg-amber-100/80 px-1">npm run dev</code>, ou définissez{" "}
              <code className="rounded bg-amber-100/80 px-1">REMOTE_SSH_WEBSOCKET_URL</code> dans{" "}
              <code className="rounded bg-amber-100/80 px-1">src/config/remoteSshDefaults.ts</code> et lancez{" "}
              <code className="rounded bg-amber-100/80 px-1">npm run ssh-bridge</code>.
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {SCOPE_ORDER.map((sc) => (
              <div key={sc} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
                  <span className="material-symbols-outlined text-[22px]">dns</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{SCOPE_LABELS[sc]}</p>
                  <p className="text-2xl font-bold tabular-nums">{scopeCounts[sc]}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
            <button
              type="button"
              onClick={() => setScopeFilter("all")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                scopeFilter === "all" ? "bg-[#2463eb] text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Tous ({mergedRows.length})
            </button>
            {SCOPE_ORDER.map((sc) => (
              <button
                key={sc}
                type="button"
                onClick={() => setScopeFilter(sc)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  scopeFilter === sc ? "bg-[#2463eb] text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {SCOPE_LABELS[sc]} ({scopeCounts[sc]})
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="flex flex-col gap-6 xl:col-span-2">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-1 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-bold">VPS enregistrés</h3>
                    <p className="text-xs text-slate-500">
                      Cliquez une ligne pour charger l&apos;hôte et les identifiants dans le panneau, puis activez l&apos;alimentation.
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                        <th className="px-6 py-4 font-semibold">Libellé</th>
                        <th className="px-6 py-4 font-semibold">Périmètre</th>
                        <th className="px-6 py-4 font-semibold">Hôte SSH</th>
                        <th className="px-6 py-4 font-semibold">Port</th>
                        <th className="px-6 py-4 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {servers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                            Aucun VPS. Utilisez « Ajouter un VPS » ou « Importer VPS société ».
                          </td>
                        </tr>
                      ) : (
                        servers.map((s, i) => {
                          const selected = i === serverIdx
                          const scopeCls =
                            s.scope === "client"
                              ? "bg-emerald-50 text-emerald-800"
                              : s.scope === "engineer"
                                ? "bg-blue-50 text-blue-800"
                                : s.scope === "ai"
                                  ? "bg-violet-50 text-violet-800"
                                  : "bg-slate-100 text-slate-800"
                          return (
                            <tr
                              key={s.id}
                              className={`cursor-pointer hover:bg-slate-50 ${selected ? "bg-[#2463eb]/5" : ""}`}
                              onClick={() => selectServer(i)}
                            >
                              <td className="px-6 py-4 font-medium text-slate-900">
                                <span className="flex flex-wrap items-center gap-2">
                                  {s.label}
                                  {s.lifecycleProtected ? (
                                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                      Société · protégé
                                    </span>
                                  ) : null}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${scopeCls}`}>
                                  {SCOPE_LABELS[s.scope]}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-mono text-xs text-slate-700">{s.sshHost}</td>
                              <td className="px-6 py-4 tabular-nums text-slate-600">{s.sshPort}</td>
                              <td className="px-6 py-4 text-right">
                                {canRunDestructiveRemoteCommands(s) ? (
                                  <span className="mr-1 inline-flex flex-wrap justify-end gap-1">
                                    <button
                                      type="button"
                                      className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 hover:bg-amber-100"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        selectServer(i)
                                        sendLine("sudo reboot")
                                      }}
                                    >
                                      Reboot
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-800 hover:bg-rose-100"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        selectServer(i)
                                        setConfirmShutdownText("")
                                        setShowShutdownModal(true)
                                      }}
                                    >
                                      Arrêt
                                    </button>
                                  </span>
                                ) : null}
                                <button
                                  type="button"
                                  disabled={isLocalDefaultRow(s.id)}
                                  className="mr-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openEditModal(s)
                                  }}
                                >
                                  Modifier
                                </button>
                                <button
                                  type="button"
                                  disabled={s.lifecycleProtected || isLocalDefaultRow(s.id)}
                                  className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    void deleteVps(s.id, s.label, s.lifecycleProtected)
                                  }}
                                >
                                  Supprimer
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="absolute -right-4 -top-4 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold">Panneau de Contrôle</h3>
                    <p className="text-sm text-slate-500">
                      Cible :{" "}
                      <span className="font-medium text-[#2463eb]">{server?.label ?? "—"}</span>
                      {server ? (
                        <span className="text-slate-400"> · {SCOPE_LABELS[server.scope]}</span>
                      ) : null}
                      {server?.lifecycleProtected ? (
                        <span className="mt-1 block text-xs font-medium text-slate-600">
                          VPS société par défaut — pas de redémarrage / arrêt à distance depuis l’interface.
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600">
                    <span className="material-symbols-outlined text-lg">terminal</span>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <span className="text-sm font-medium">Alimentation SSH</span>
                    <p className="text-xs text-slate-500">État : {connected ? "connecté" : "déconnecté"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={connected ? disconnect : connect}
                    disabled={connecting}
                    className={`h-7 w-12 rounded-full p-1 transition-colors ${connected ? "bg-blue-600" : "bg-slate-600"}`}
                  >
                    <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${connected ? "translate-x-5" : ""}`} />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <input
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    disabled={connected || connecting}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900"
                    placeholder="Hôte SSH"
                    autoComplete="off"
                  />
                  <input
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    disabled={connected || connecting}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900"
                    placeholder="port"
                    autoComplete="off"
                  />
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={connected || connecting}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900"
                    placeholder="Utilisateur"
                    autoComplete="username"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={connected || connecting}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900"
                    placeholder="Mot de passe"
                    autoComplete="current-password"
                  />
                </div>
                <label className="mt-3 block text-xs font-medium text-slate-500">
                  Clé privée PEM (optionnel)
                </label>
                <textarea
                  value={pemPrivateKey}
                  onChange={(e) => setPemPrivateKey(e.target.value)}
                  disabled={connected || connecting}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 font-mono text-[11px] text-slate-800"
                  placeholder={"-----BEGIN OPENSSH PRIVATE KEY-----\n…"}
                  spellCheck={false}
                />

                {canRunDestructiveRemoteCommands(server) ? (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => sendLine("sudo reboot")}
                      className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-800 hover:border-amber-400 hover:text-amber-700"
                    >
                      <span className="material-symbols-outlined text-slate-500">restart_alt</span>
                      Reboot
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmShutdownText("")
                        setShowShutdownModal(true)
                      }}
                      className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-800 hover:border-rose-400 hover:text-rose-700"
                    >
                      <span className="material-symbols-outlined text-slate-500">power_settings_new</span>
                      Arrêt
                    </button>
                  </div>
                ) : server && !server.lifecycleProtected && !canRunDestructiveRemoteCommands(server) ? (
                  <p className="mt-4 text-xs leading-relaxed text-slate-500">
                    Redémarrage et arrêt à distance : disponibles uniquement pour les VPS du périmètre Client (pas pour la
                    société par défaut ni les autres périmètres).
                  </p>
                ) : null}

                <button
                  type="button"
                  onClick={() => setTerminalModalOpen(true)}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-slate-800"
                >
                  <span className="material-symbols-outlined text-[22px]">terminal</span>
                  Ouvrir le terminal SSH
                  {connected ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-300">
                      <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                      Session active
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-normal text-slate-300">
                      {connecting ? "Connexion…" : "Hors ligne"}
                    </span>
                  )}
                </button>
                <p className="mt-2 text-center text-xs text-slate-500">
                  Utilisez le terminal en plein écran pour lire la sortie et envoyer des commandes.
                </p>
              </div>
            </div>
          </div>
        </div>

        {terminalModalOpen ? (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="terminal-modal-title"
            onClick={() => setTerminalModalOpen(false)}
          >
            <div
              className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[#3e3e3e] bg-[#1e1e1e] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 border-b border-[#3e3e3e] bg-[#2d2d2d] px-4 py-3">
                <div className="min-w-0">
                  <h2 id="terminal-modal-title" className="flex items-center gap-2 font-mono text-sm font-semibold text-gray-200">
                    <span className="material-symbols-outlined shrink-0 text-[20px] text-gray-400">terminal</span>
                    <span className="truncate">Terminal SSH</span>
                  </h2>
                  <p className="truncate pl-8 font-mono text-[11px] text-gray-500">
                    {server?.label ?? host} · {connected ? "connecté" : connecting ? "connexion…" : "déconnecté"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="hidden gap-1.5 sm:flex">
                    <div className="size-2.5 rounded-full bg-red-500" />
                    <div className="size-2.5 rounded-full bg-yellow-500" />
                    <div className="size-2.5 rounded-full bg-green-500" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setTerminalModalOpen(false)}
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Fermer le terminal"
                  >
                    <span className="material-symbols-outlined text-[22px]">close</span>
                  </button>
                </div>
              </div>
              <div
                ref={terminalRef}
                className="min-h-[45vh] flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed text-gray-300 whitespace-pre-wrap break-words sm:min-h-[50vh] sm:text-sm"
              >
                {output ? (
                  output
                ) : (
                  <span className="text-gray-500">
                    Aucune sortie pour l&apos;instant. Activez l&apos;alimentation SSH dans le panneau si besoin.
                  </span>
                )}
              </div>
              <div className="border-t border-[#3e3e3e] bg-[#2d2d2d] p-3 sm:p-4">
                <div className="mb-2 flex flex-wrap gap-2">
                  {quickCmds.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => sendLine(c)}
                      className="rounded border border-[#3e3e3e] px-2 py-1.5 text-[11px] text-slate-300 hover:bg-[#3a3a3a] sm:text-xs"
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-blue-400">&gt;</span>
                  <input
                    value={cmd}
                    onChange={(e) => setCmd(e.target.value)}
                    onKeyDown={handleKey}
                    disabled={!connected}
                    className="min-w-0 flex-1 border-none bg-transparent font-mono text-xs text-white focus:ring-0 sm:text-sm"
                    placeholder={connected ? "Commande…" : "Connectez-vous d'abord (panneau)"}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      sendLine(cmd)
                      setCmd("")
                    }}
                    disabled={!connected}
                    className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[20px]">send</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {showShutdownModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center gap-3 border-b border-rose-100 bg-rose-50 px-6 py-4">
                <div className="flex size-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                  <span className="material-symbols-outlined">warning</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Arrêt du VPS client</h3>
                  <p className="text-sm text-slate-600">Envoi de la commande d&apos;extinction sur la session SSH active.</p>
                </div>
              </div>
              <div className="p-6">
                <p className="text-sm text-slate-600">
                  Cible : <span className="font-semibold text-slate-900">{server?.label ?? "—"}</span>
                </p>
                <div className="mt-4">
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
                    Confirmation
                  </label>
                  <input
                    value={confirmShutdownText}
                    onChange={(e) => setConfirmShutdownText(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-200"
                    placeholder='Tapez "CONFIRMER" pour continuer'
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowShutdownModal(false)
                    setConfirmShutdownText("")
                  }}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmShutdownText.trim().toUpperCase() !== "CONFIRMER") return
                    if (!canRunDestructiveRemoteCommands(server)) return
                    sendLine("sudo shutdown -h now")
                    setShowShutdownModal(false)
                    setConfirmShutdownText("")
                  }}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
                >
                  Envoyer arrêt
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {vpsModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-slate-200 px-6 py-4">
                <h3 className="text-lg font-bold text-slate-900">{editingId ? "Modifier le VPS" : "Nouveau VPS"}</h3>
                <p className="text-sm text-slate-500">Associez la machine à un périmètre métier.</p>
              </div>
              <div className="space-y-4 px-6 py-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Libellé</label>
                  <input
                    value={formLabel}
                    onChange={(e) => setFormLabel(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    placeholder="ex. VPS prod client ACME"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Périmètre</label>
                  <select
                    value={formScope}
                    onChange={(e) => setFormScope(e.target.value as RemoteVpsScope)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    {SCOPE_ORDER.map((sc) => (
                      <option key={sc} value={sc}>
                        {SCOPE_LABELS[sc]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-600">Hôte SSH</label>
                    <input
                      value={formHost}
                      onChange={(e) => setFormHost(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm text-slate-900"
                      placeholder="IP ou hostname"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Port</label>
                    <input
                      value={formPort}
                      onChange={(e) => setFormPort(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Utilisateur</label>
                    <input
                      value={formUser}
                      onChange={(e) => setFormUser(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Mot de passe {editingId ? "(vide = inchangé)" : ""}
                    </label>
                    <input
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setVpsModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={savingVps}
                  onClick={() => void saveVpsModal()}
                  className="rounded-lg bg-[#2463eb] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {savingVps ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  )
}
