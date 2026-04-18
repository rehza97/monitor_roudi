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

type UiStatus = "healthy" | "warning" | "down"

type AppRow = {
  id: string
  organizationId: string
  name: string
  client: string
  env: string
  cpu: number
  ram: number
  requests: string
  status: UiStatus
}

type ActionState = "idle" | "loading" | "done"

const statusConfig: Record<UiStatus, { dot: string; label: string; badge: string }> = {
  healthy: {
    dot: "bg-emerald-500",
    label: "OK",
    badge: "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  warning: {
    dot: "bg-amber-500 animate-pulse",
    label: "Alerte",
    badge: "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
  },
  down: {
    dot: "bg-rose-500",
    label: "Hors ligne",
    badge: "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400",
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
  const req = data.requests

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
    requests: formatRequests(req),
    status: mapHealth(data.health),
  }
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
        className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className={`size-3 rounded-full shrink-0 ${cfg.dot}`} />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">{app.name}</h3>
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
              <span className="font-medium text-slate-900 dark:text-white">{r.value}</span>
            </div>
          ))}
        </div>

        {[{ label: "CPU", val: app.cpu }, { label: "RAM", val: app.ram }].map(b => (
          <div key={b.label} className="mb-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{b.label}</span>
              <span>{b.val}%</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${b.val === 0 ? "bg-slate-300" : b.val > 80 ? "bg-rose-500" : b.val > 60 ? "bg-amber-500" : "bg-blue-500"}`}
                style={{ width: `${b.val}%` }}
              />
            </div>
          </div>
        ))}

        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
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
          <p className="mt-3 text-xs text-rose-600 dark:text-rose-400">{error}</p>
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
        className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-md p-6 space-y-4"
        onClick={e => e.stopPropagation()}
        onSubmit={e => void handleSubmit(e)}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white">Nouveau déploiement</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {error && (
          <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        {[
          { key: "name" as const, label: "Nom de l'application *", placeholder: "Ex: API Gestion" },
          { key: "productSlug" as const, label: "Slug produit", placeholder: "api-gestion (auto si vide)" },
          { key: "organizationId" as const, label: "ID Organisation", placeholder: "platform" },
        ].map(f => (
          <div key={f.key} className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{f.label}</label>
            <input
              value={form[f.key]}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              required={f.key === "name"}
              placeholder={f.placeholder}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#db143c]"
            />
          </div>
        ))}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Environnement</label>
            <select
              value={form.environment}
              onChange={e => setForm(p => ({ ...p, environment: e.target.value as typeof ENVIRONMENTS[number] }))}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#db143c]"
            >
              {ENVIRONMENTS.map(env => <option key={env}>{env}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Santé initiale</label>
            <select
              value={form.health}
              onChange={e => setForm(p => ({ ...p, health: e.target.value }))}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#db143c]"
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
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{f.label}</label>
              <input
                type="number"
                min={0}
                max={100}
                value={form[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: Number(e.target.value) || 0 }))}
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#db143c]"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
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

  const apps = useMemo(() => {
    const rows: AppRow[] = []
    for (const d of rawDeployments) {
      const row = parseDeployment(d.id, d.data, orgNames)
      if (row) rows.push(row)
    }
    return rows
  }, [rawDeployments, orgNames])

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
    setTimeout(() => setRefresh(false), 1200)
  }

  async function handleRestart(app: AppRow) {
    if (!db || !isFirebaseConfigured || !user?.id) {
      throw new Error("Utilisateur ou configuration Firebase indisponible.")
    }

    await addDoc(collection(db, COLLECTIONS.supportTickets), {
      subject: `Redémarrage demandé — ${app.name}`,
      description: `Demande créée depuis le monitoring admin pour ${app.name} (${app.env}).`,
      priority: "Haute",
      status: "Ouvert",
      createdByUserId: user.id,
      organizationId: app.organizationId || "platform",
      deploymentId: app.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as FirestoreSupportTicket & { deploymentId: string })

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
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Monitoring</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              État en direct des déploiements synchronisé avec Firestore.
            </p>
            {error && <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">{error}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 transition-colors"
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
              className="flex items-center gap-2 px-4 py-2 bg-[#db143c] text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50"
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
              bg: "bg-emerald-50 dark:bg-emerald-900/20",
            },
            {
              label: "Alertes",
              value: String(apps.filter(a => a.status === "warning").length),
              icon: "warning",
              color: "text-amber-600",
              bg: "bg-amber-50 dark:bg-amber-900/20",
            },
            {
              label: "Hors ligne",
              value: String(apps.filter(a => a.status === "down").length),
              icon: "cancel",
              color: "text-rose-600",
              bg: "bg-rose-50 dark:bg-rose-900/20",
            },
            {
              label: "Req/min (total)",
              value: apps.length ? totalReqDisplay : "0",
              icon: "speed",
              color: "text-blue-600",
              bg: "bg-blue-50 dark:bg-blue-900/20",
            },
          ].map(k => (
            <div
              key={k.label}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5"
            >
              <div className={`size-10 rounded-lg ${k.bg} ${k.color} flex items-center justify-center mb-3`}>
                <span className="material-symbols-outlined text-[20px]">{k.icon}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{k.value}</p>
              <p className="text-sm text-slate-500 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">État des applications</h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              En direct
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                {["Application", "Client", "Env.", "CPU", "RAM", "Req/min", "Statut", ""].map(h => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {apps.map(a => {
                const cfg = statusConfig[a.status]
                return (
                  <tr
                    key={a.id}
                    onClick={() => setSelectedId(a.id)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`size-2 rounded-full shrink-0 ${cfg.dot}`} />
                        <span className="font-medium text-slate-900 dark:text-white">{a.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{a.client}</td>
                    <td className="px-5 py-3.5 text-slate-500">{a.env}</td>
                    <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">{a.cpu}%</td>
                    <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">{a.ram}%</td>
                    <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">{a.requests}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="material-symbols-outlined text-[18px] text-slate-400">chevron_right</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {apps.length === 0 && (
            <p className="px-6 py-10 text-center text-sm text-slate-400">
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
