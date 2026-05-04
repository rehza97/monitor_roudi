import { useEffect, useMemo, useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import { db, isFirebaseConfigured } from "@/config/firebase"
import { COLLECTIONS, type FirestoreSupportTicket } from "@/data/schema"
import { useAuth } from "@/contexts/AuthContext"
import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
} from "@/lib/firebase-firestore"
import { notifyAdminsOfTicketCreated } from "@/lib/notifications"
import { fetchVpsAgentSnapshot, type VpsAgentSnapshot, type VpsContainer } from "@/lib/vps-agent-metrics"

type UiStatus = "healthy" | "warning" | "down"

type AppRow = {
  id: string
  organizationId: string
  name: string
  client: string
  env: string
  cpu: number
  ram: number
  disk: number
  requests: string
  status: UiStatus
  host?: string
  uptimeSeconds?: number
  loadAverage?: number[]
  runningProjects?: Array<Record<string, unknown>>
}

type ActionState = "idle" | "loading" | "done"

const statusConfig: Record<UiStatus, { dot: string; label: string; badge: string }> = {
  healthy: {
    dot: "bg-emerald-500",
    label: "OK",
    badge: "text-emerald-700 bg-emerald-50",
  },
  warning: {
    dot: "bg-amber-500 animate-pulse",
    label: "Alerte",
    badge: "text-amber-700 bg-amber-50",
  },
  down: {
    dot: "bg-rose-500",
    label: "Hors ligne",
    badge: "text-rose-700 bg-rose-50",
  },
}

function mapHealth(raw: unknown): UiStatus {
  const h = typeof raw === "string" ? raw.toLowerCase() : ""
  if (h === "ok" || h === "healthy") return "healthy"
  if (h === "degraded" || h === "warning") return "warning"
  if (h === "down" || h === "stopped" || h === "offline") return "down"
  return "warning"
}

function formatRequests(n: unknown): string {
  const v = typeof n === "number" ? n : Number(n)
  if (!Number.isFinite(v)) return "—"
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k/m`
  return `${Math.round(v)}/m`
}

function parseDeployment(id: string, data: Record<string, unknown>, orgNames: Map<string, string>): AppRow | null {
  const orgId = typeof data.organizationId === "string" ? data.organizationId : ""
  const productSlug = typeof data.productSlug === "string" ? data.productSlug : ""
  const nameField = typeof data.name === "string" ? data.name : ""
  const name = nameField || productSlug || `Déploiement ${id.slice(0, 6)}`
  const env = typeof data.environment === "string" ? data.environment : "—"
  const cpu = typeof data.cpu === "number" ? data.cpu : Number(data.cpu)
  const ram = typeof data.ram === "number" ? data.ram : Number(data.ram)
  const disk = typeof data.disk === "number" ? data.disk : Number(data.disk)
  const req = data.requests
  const runtime = data.runtime && typeof data.runtime === "object" ? data.runtime as Record<string, unknown> : {}
  const runningProjects = Array.isArray(runtime.runningProjects) ? runtime.runningProjects as Array<Record<string, unknown>> : []

  const client =
    (orgId && orgNames.get(orgId)) ||
    (typeof data.clientLabel === "string" && data.clientLabel) ||
    orgId ||
    "—"

  return {
    id,
    organizationId: orgId,
    name,
    client,
    env,
    cpu: Number.isFinite(cpu) ? Math.min(100, Math.max(0, cpu)) : 0,
    ram: Number.isFinite(ram) ? Math.min(100, Math.max(0, ram)) : 0,
    disk: Number.isFinite(disk) ? Math.min(100, Math.max(0, disk)) : 0,
    requests: formatRequests(req),
    status: mapHealth(data.health),
    host: typeof runtime.host === "string" ? runtime.host : undefined,
    uptimeSeconds: typeof runtime.uptimeSeconds === "number" ? runtime.uptimeSeconds : undefined,
    loadAverage: Array.isArray(runtime.loadAverage) ? runtime.loadAverage.map(Number).filter(Number.isFinite) : undefined,
    runningProjects,
  }
}

function formatUptime(seconds: number | undefined): string {
  if (!seconds || seconds < 0) return "—"
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3_600)
  const minutes = Math.floor((seconds % 3_600) / 60)
  if (days > 0) return `${days}j ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function projectLabel(project: Record<string, unknown>): string {
  const name = typeof project.name === "string" ? project.name : "process"
  const status = typeof project.status === "string" ? project.status : "running"
  const type = typeof project.type === "string" ? project.type : "service"
  return `${name} · ${type} · ${status}`
}

function metricTone(percent: number): { bar: string; text: string; bg: string } {
  if (percent >= 90) return { bar: "bg-rose-500", text: "text-rose-600", bg: "bg-rose-50" }
  if (percent >= 75) return { bar: "bg-amber-500", text: "text-amber-600", bg: "bg-amber-50" }
  return { bar: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50" }
}

function pct(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`
}

function gb(used: number, total: number): string {
  return `${used.toFixed(2)} / ${total.toFixed(2)} GB`
}

function mb(value: number): string {
  if (value >= 1024) return `${(value / 1024).toFixed(2)} GB`
  return `${value.toFixed(1)} MB`
}

function bytesToMb(value: number): string {
  return `${(value / 1024 / 1024).toFixed(2)} MB`
}

function VpsMetricCard({
  label,
  value,
  detail,
  icon,
  percent,
}: {
  label: string
  value: string
  detail: string
  icon: string
  percent?: number
}) {
  const tone = metricTone(percent ?? 0)
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
        </div>
        <div className={`flex size-10 items-center justify-center rounded-lg ${tone.bg} ${tone.text}`}>
          <span className="material-symbols-outlined text-[22px]">{icon}</span>
        </div>
      </div>
      <p className="mb-3 text-sm text-slate-500">{detail}</p>
      {typeof percent === "number" ? (
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
        </div>
      ) : null}
    </div>
  )
}

function AppDetailModal({
  app,
  onClose,
  onRestart,
}: {
  app: AppRow
  onClose: () => void
  onRestart: () => Promise<void>
}) {
  const [state, setState] = useState<ActionState>("idle")
  const [error, setError] = useState("")

  async function handleRestart() {
    setState("loading")
    setError("")
    try {
      await onRestart()
      setState("done")
      setTimeout(() => onClose(), 1000)
    } catch (err) {
      setState("idle")
      setError(err instanceof Error ? err.message : "Impossible de créer la demande de redémarrage.")
    }
  }

  const cfg = statusConfig[app.status]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className={`size-3 rounded-full shrink-0 ${cfg.dot}`} />
            <div>
              <h3 className="font-bold text-slate-900">{app.name}</h3>
              <p className="text-xs text-slate-400">
                {app.client} · {app.env}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="space-y-3 mb-5">
          {[
            { label: "Statut", value: cfg.label },
            { label: "CPU", value: `${app.cpu}%` },
            { label: "RAM", value: `${app.ram}%` },
            { label: "Req/min", value: app.requests },
            { label: "Environnement", value: app.env },
          ].map(r => (
            <div key={r.label} className="flex justify-between text-sm">
              <span className="text-slate-500">{r.label}</span>
              <span className="font-medium text-slate-900">{r.value}</span>
            </div>
          ))}
        </div>

        {[
          { label: "CPU", val: app.cpu },
          { label: "RAM", val: app.ram },
          { label: "Disque", val: app.disk },
        ].map(b => (
          <div key={b.label} className="mb-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{b.label}</span>
              <span>{b.val}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${b.val === 0 ? "bg-slate-300" : b.val > 80 ? "bg-rose-500" : b.val > 60 ? "bg-amber-500" : "bg-blue-500"}`}
                style={{ width: `${b.val}%` }}
              />
            </div>
          </div>
        ))}

        <div className="mt-5 rounded-xl border border-slate-200 p-4 bg-slate-50">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">VPS agent</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Host</p>
              <p className="font-medium text-slate-900 truncate">{app.host || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Uptime</p>
              <p className="font-medium text-slate-900">{formatUptime(app.uptimeSeconds)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-slate-500">Load average</p>
              <p className="font-medium text-slate-900">
                {app.loadAverage?.length ? app.loadAverage.map(n => n.toFixed(2)).join(" / ") : "—"}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-slate-500 mb-2">Projets / services en cours</p>
            {app.runningProjects?.length ? (
              <div className="space-y-1.5 max-h-28 overflow-auto pr-1">
                {app.runningProjects.slice(0, 8).map((project, index) => (
                  <div
                    key={`${String(project.name ?? "project")}-${index}`}
                    className="text-xs rounded-lg bg-white border border-slate-200 px-2.5 py-2 text-slate-700"
                  >
                    {projectLabel(project)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Aucun projet detecte par Docker/PM2.</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={() => void handleRestart()}
            disabled={state !== "idle"}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-60 ${
              state === "done" ? "bg-emerald-600" : "bg-[#db143c] hover:opacity-90"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {state === "loading" ? "hourglass_empty" : state === "done" ? "check_circle" : "restart_alt"}
            </span>
            {state === "loading" ? "Création ticket…" : state === "done" ? "Demande envoyée" : "Demander redémarrage"}
          </button>
        </div>
        {error ? (
          <p className="mt-3 text-xs text-rose-600">{error}</p>
        ) : null}
      </div>
    </div>
  )
}

type RawDeployment = { id: string; data: Record<string, unknown> }

const ENVIRONMENTS = ["Production", "Staging", "Development"] as const
const HEALTH_OPTIONS = [
  { value: "ok", label: "Sain (OK)" },
  { value: "degraded", label: "Dégradé" },
  { value: "down", label: "Hors ligne" },
]

function AddDeploymentModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    name: "",
    productSlug: "",
    organizationId: "",
    environment: "Production" as typeof ENVIRONMENTS[number],
    health: "ok",
    cpu: 10,
    ram: 20,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!db || !form.name.trim()) return
    setSaving(true)
    setError("")
    try {
      await addDoc(collection(db, COLLECTIONS.deployments), {
        name: form.name.trim(),
        productSlug: form.productSlug.trim() || form.name.trim().toLowerCase().replace(/\s+/g, "-"),
        organizationId: form.organizationId.trim() || "platform",
        environment: form.environment,
        health: form.health,
        cpu: Math.min(100, Math.max(0, form.cpu)),
        ram: Math.min(100, Math.max(0, form.ram)),
        requests: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <form
        className="relative bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-6 space-y-4"
        onClick={e => e.stopPropagation()}
        onSubmit={e => void handleSubmit(e)}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Nouveau déploiement</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {error && (
          <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        {[
          { key: "name" as const, label: "Nom de l'application *", placeholder: "Ex: API Gestion" },
          { key: "productSlug" as const, label: "Slug produit", placeholder: "api-gestion (auto si vide)" },
          { key: "organizationId" as const, label: "ID Organisation", placeholder: "platform" },
        ].map(f => (
          <div key={f.key} className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">{f.label}</label>
            <input
              value={form[f.key]}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              required={f.key === "name"}
              placeholder={f.placeholder}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#db143c]"
            />
          </div>
        ))}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Environnement</label>
            <select
              value={form.environment}
              onChange={e => setForm(p => ({ ...p, environment: e.target.value as typeof ENVIRONMENTS[number] }))}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#db143c]"
            >
              {ENVIRONMENTS.map(env => <option key={env}>{env}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Santé initiale</label>
            <select
              value={form.health}
              onChange={e => setForm(p => ({ ...p, health: e.target.value }))}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#db143c]"
            >
              {HEALTH_OPTIONS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {([
            { key: "cpu" as const, label: "CPU initial (%)" },
            { key: "ram" as const, label: "RAM initiale (%)" },
          ]).map(f => (
            <div key={f.key} className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">{f.label}</label>
              <input
                type="number"
                min={0}
                max={100}
                value={form[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: Number(e.target.value) || 0 }))}
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#db143c]"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 bg-[#db143c] hover:opacity-90 disabled:opacity-60 text-white text-sm font-bold rounded-lg"
          >
            {saving ? "Création…" : "Créer le déploiement"}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function AdminMonitoring() {
  const { user } = useAuth()
  const [rawDeployments, setRawDeployments] = useState<RawDeployment[]>([])
  const [orgNames, setOrgNames] = useState<Map<string, string>>(new Map())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [refreshing, setRefresh] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [vpsSnapshot, setVpsSnapshot] = useState<VpsAgentSnapshot | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [metricsError, setMetricsError] = useState<string | null>(null)
  const [metricsUpdatedAt, setMetricsUpdatedAt] = useState<Date | null>(null)

  useEffect(() => {
    if (!db || !isFirebaseConfigured) return

    let cancelled = false

    getDocs(collection(db, COLLECTIONS.organizations))
      .then(snap => {
        if (cancelled) return
        const m = new Map<string, string>()
        snap.forEach(d => {
          const data = d.data() as Record<string, unknown>
          const label =
            (typeof data.displayName === "string" && data.displayName) ||
            (typeof data.name === "string" && data.name) ||
            d.id
          m.set(d.id, label)
        })
        setOrgNames(m)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!db || !isFirebaseConfigured) {
      setError("Firebase n’est pas configuré.")
      return
    }

    const unsub = onSnapshot(
      collection(db, COLLECTIONS.deployments),
      snap => {
        setError(null)
        const rows: RawDeployment[] = []
        snap.forEach(d => rows.push({ id: d.id, data: d.data() as Record<string, unknown> }))
        rows.sort((a, b) => {
          const an = typeof a.data.name === "string" ? a.data.name : String(a.data.productSlug ?? a.id)
          const bn = typeof b.data.name === "string" ? b.data.name : String(b.data.productSlug ?? b.id)
          return an.localeCompare(bn, "fr")
        })
        setRawDeployments(rows)
      },
      err => setError(err.message)
    )

    return () => unsub()
  }, [db])

  async function loadVpsMetrics() {
    setMetricsLoading(true)
    setMetricsError(null)
    try {
      const snapshot = await fetchVpsAgentSnapshot()
      setVpsSnapshot(snapshot)
      setMetricsUpdatedAt(new Date())
    } catch (err) {
      setMetricsError(err instanceof Error ? err.message : "Impossible de charger les métriques VPS.")
    } finally {
      setMetricsLoading(false)
    }
  }

  useEffect(() => {
    void loadVpsMetrics()
    const interval = window.setInterval(() => {
      void loadVpsMetrics()
    }, 30_000)
    return () => window.clearInterval(interval)
  }, [])

  const apps = useMemo(() => {
    const rows: AppRow[] = []
    for (const d of rawDeployments) {
      const row = parseDeployment(d.id, d.data, orgNames)
      if (row) rows.push(row)
    }
    return rows
  }, [rawDeployments, orgNames])

  const vpsMetrics = vpsSnapshot?.metrics ?? null
  const vpsHealth = vpsSnapshot?.health ?? null
  const containers = vpsMetrics?.containers ?? []

  const selected = useMemo(
    () => (selectedId ? apps.find(a => a.id === selectedId) ?? null : null),
    [apps, selectedId]
  )

  const totalReqDisplay = useMemo(() => {
    let sum = 0
    for (const a of apps) {
      const n = parseFloat(a.requests.replace(/k\/m|\/m/g, ""))
      if (a.requests.includes("k")) sum += n * 1000
      else if (Number.isFinite(n)) sum += n
    }
    if (sum >= 1000) return `${(sum / 1000).toFixed(1)}k`
    return String(Math.round(sum))
  }, [apps])

  function handleRefresh() {
    setRefresh(true)
    void loadVpsMetrics()
    setTimeout(() => setRefresh(false), 1200)
  }

  async function handleRestart(app: AppRow) {
    if (!db || !isFirebaseConfigured || !user?.id) {
      throw new Error("Utilisateur ou configuration Firebase indisponible.")
    }

    const ticketPayload = {
      subject: `Redémarrage demandé — ${app.name}`,
      description: `Demande créée depuis le monitoring admin pour ${app.name} (${app.env}).`,
      priority: "Haute",
      status: "Ouvert",
      createdByUserId: user.id,
      organizationId: app.organizationId || "platform",
      deploymentId: app.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as FirestoreSupportTicket & { deploymentId: string }
    const ticketRef = await addDoc(collection(db, COLLECTIONS.supportTickets), ticketPayload)
    await notifyAdminsOfTicketCreated(ticketRef.id, ticketPayload)

    await updateDoc(doc(db, COLLECTIONS.deployments, app.id), {
      restartRequestedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    await addDoc(collection(db, COLLECTIONS.activityEvents), {
      title: `Demande de redémarrage envoyée (${app.name})`,
      actor: user.name,
      category: "monitoring",
      icon: "restart_alt",
      color: "text-amber-600",
      createdAt: serverTimestamp(),
      organizationId: app.organizationId || "platform",
      deploymentId: app.id,
      createdByUserId: user.id,
    } as Record<string, unknown>)

    setSelectedId(null)
  }

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Monitoring des Applications">
      <div className="min-h-[calc(100vh-64px)] space-y-6 bg-[#f7f5f5] p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">Monitoring en temps réel</h2>
            <p className="mt-1 text-sm text-slate-500">
              État en direct des déploiements Firestore et métriques VPS agent.
            </p>
            {error && <p className="text-xs text-amber-700 mt-2">{error}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
            >
              <span className={`material-symbols-outlined text-[18px] ${refreshing ? "animate-spin" : ""}`}>
                refresh
              </span>
              {refreshing ? "Actualisation…" : "Actualiser"}
            </button>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              disabled={!db || !isFirebaseConfigured}
              className="flex items-center gap-2 rounded-lg bg-[#d23b4c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#bd2f42] disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Nouveau déploiement
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Apps actives",
              value: String(apps.filter(a => a.status === "healthy").length),
              icon: "check_circle",
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
            {
              label: "Alertes",
              value: String(apps.filter(a => a.status === "warning").length),
              icon: "warning",
              color: "text-amber-600",
              bg: "bg-amber-50",
            },
            {
              label: "Hors ligne",
              value: String(apps.filter(a => a.status === "down").length),
              icon: "cancel",
              color: "text-rose-600",
              bg: "bg-rose-50",
            },
            {
              label: "Req/min (total)",
              value: apps.length ? totalReqDisplay : "0",
              icon: "speed",
              color: "text-blue-600",
              bg: "bg-blue-50",
            },
          ].map(k => (
            <div
              key={k.label}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className={`size-10 rounded-lg ${k.bg} ${k.color} flex items-center justify-center mb-3`}>
                <span className="material-symbols-outlined text-[20px]">{k.icon}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{k.value}</p>
              <p className="mt-0.5 text-sm text-slate-500">{k.label}</p>
            </div>
          ))}
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px] text-[#db143c]">dns</span>
                <h3 className="text-xl font-black text-slate-900">Métriques VPS</h3>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Source: VPS agent via HTTPS only (see VITE_VPS_AGENT_BASE_URL) — /health + /metrics + /containers
                {metricsUpdatedAt ? ` · MAJ ${metricsUpdatedAt.toLocaleTimeString("fr-DZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className={`size-2 rounded-full ${metricsError || vpsHealth?.ok === false ? "bg-rose-500" : "bg-emerald-500 animate-pulse"}`} />
              {metricsLoading ? "Chargement..." : metricsError ? "Erreur API" : vpsHealth?.ok ? "Agent OK" : "Live VPS"}
            </div>
          </div>

          {metricsError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {metricsError}
            </div>
          ) : null}

          {metricsLoading && !vpsMetrics ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-36 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
              ))}
            </div>
          ) : vpsMetrics ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <VpsMetricCard
                label="CPU"
                value={pct(vpsMetrics.host.cpu.percent)}
                detail={`${vpsMetrics.host.cpu.cores_logical} cœurs · load ${vpsMetrics.host.cpu.load_1m.toFixed(2)} / ${vpsMetrics.host.cpu.load_5m.toFixed(2)} / ${vpsMetrics.host.cpu.load_15m.toFixed(2)}`}
                icon="memory"
                percent={vpsMetrics.host.cpu.percent}
              />
              <VpsMetricCard
                label="RAM"
                value={pct(vpsMetrics.host.memory.percent)}
                detail={gb(vpsMetrics.host.memory.used_gb, vpsMetrics.host.memory.total_gb)}
                icon="developer_board"
                percent={vpsMetrics.host.memory.percent}
              />
              <VpsMetricCard
                label="Disque"
                value={pct(vpsMetrics.host.disk.percent)}
                detail={`${gb(vpsMetrics.host.disk.used_gb, vpsMetrics.host.disk.total_gb)} · libre ${vpsMetrics.host.disk.free_gb.toFixed(2)} GB`}
                icon="hard_drive"
                percent={vpsMetrics.host.disk.percent}
              />
              <VpsMetricCard
                label="Réseau"
                value={`${vpsMetrics.host.network.mb_recv.toFixed(2)} MB`}
                detail={`↓ ${vpsMetrics.host.network.mb_recv.toFixed(2)} MB · ↑ ${vpsMetrics.host.network.mb_sent.toFixed(2)} MB`}
                icon="network_check"
              />
              <VpsMetricCard
                label="Containers"
                value={`${vpsMetrics.container_summary.running}/${vpsMetrics.container_summary.total}`}
                detail={`${vpsMetrics.container_summary.healthy} healthy · agent ${formatUptime(vpsMetrics.api_uptime_seconds)}`}
                icon="deployed_code"
              />
            </div>
          ) : null}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h3 className="font-semibold text-slate-900">Containers VPS</h3>
            <div className="text-xs text-slate-500">
              {containers.length} container{containers.length > 1 ? "s" : ""}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {["Container", "Image", "CPU", "RAM", "Réseau", "Statut"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {containers.slice(0, 16).map((container: VpsContainer) => {
                  const running = Boolean(container.state?.running)
                  const healthy = container.state?.healthy
                  const tone = running
                    ? healthy === "unhealthy"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                  return (
                    <tr key={container.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900">{container.name}</div>
                        <div className="text-xs text-slate-400">{container.id}</div>
                      </td>
                      <td className="max-w-[260px] truncate px-5 py-3.5 text-slate-500">{container.image}</td>
                      <td className="px-5 py-3.5 text-slate-700">{container.cpu_percent.toFixed(2)}%</td>
                      <td className="px-5 py-3.5 text-slate-700">
                        {pct(container.memory?.percent ?? 0)}
                        <span className="ml-1 text-xs text-slate-400">({mb(container.memory?.usage_mb ?? 0)})</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        ↓ {bytesToMb(container.network?.bytes_recv ?? 0)} · ↑ {bytesToMb(container.network?.bytes_sent ?? 0)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
                          {container.status}{healthy ? ` · ${healthy}` : ""}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!containers.length ? (
              <p className="px-6 py-8 text-center text-sm text-slate-500">Aucun container reçu depuis l'agent VPS.</p>
            ) : null}
          </div>
        </section>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h3 className="font-semibold text-slate-900">Instances & Logs</h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              En direct
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["Application", "Client", "Env.", "CPU", "RAM", "Req/min", "Statut", ""].map(h => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {apps.map(a => {
                const cfg = statusConfig[a.status]
                return (
                  <tr
                    key={a.id}
                    onClick={() => setSelectedId(a.id)}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`size-2 rounded-full shrink-0 ${cfg.dot}`} />
                        <span className="font-medium text-slate-900">{a.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{a.client}</td>
                    <td className="px-5 py-3.5 text-slate-500">{a.env}</td>
                    <td className="px-5 py-3.5 text-slate-700">{a.cpu}%</td>
                    <td className="px-5 py-3.5 text-slate-700">{a.ram}%</td>
                    <td className="px-5 py-3.5 text-slate-700">{a.requests}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="material-symbols-outlined text-[18px] text-slate-500">chevron_right</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {apps.length === 0 && (
            <p className="px-6 py-10 text-center text-sm text-slate-500">
              Aucun déploiement en base. Créez des documents dans la collection des déploiements ou via un script
              d’amorçage.
            </p>
          )}
        </div>
      </div>

      {selected && (
        <AppDetailModal
          app={selected}
          onClose={() => setSelectedId(null)}
          onRestart={() => handleRestart(selected)}
        />
      )}

      {showAddModal && (
        <AddDeploymentModal onClose={() => setShowAddModal(false)} />
      )}
    </DashboardLayout>
  )
}
