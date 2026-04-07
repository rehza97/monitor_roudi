import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { clientNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import { onSnapshot, addDoc, collection, query, where } from "@/lib/firebase-firestore"
import { COLLECTIONS } from "@/data/schema"
import type { Deployment, DeploymentHealth, DeploymentEnvironment } from "@/data/schema"

// ─── Types ───────────────────────────────────────────────────────────────────

interface FirestoreDeployment extends Omit<Deployment, "id"> {
  name?: string
  requestsPerMin?: number
}

interface DeploymentDoc extends FirestoreDeployment {
  id: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveHealth(health: string): DeploymentHealth {
  if (health === "ok" || health === "healthy") return "ok"
  if (health === "degraded" || health === "warning") return "degraded"
  return "down"
}

const envBadge: Record<DeploymentEnvironment, string> = {
  Production: "text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400",
  Staging: "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
  Development: "text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-400",
}

const healthConfig: Record<
  DeploymentHealth,
  { dot: string; label: string; badge: string }
> = {
  ok: {
    dot: "bg-emerald-500",
    label: "Actif",
    badge: "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  degraded: {
    dot: "bg-amber-500 animate-pulse",
    label: "Alerte",
    badge: "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
  },
  down: {
    dot: "bg-rose-500",
    label: "Arrêtée",
    badge: "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400",
  },
  stopped: {
    dot: "bg-rose-500",
    label: "Arrêtée",
    badge: "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400",
  },
}

function MetricBar({ label, value }: { label: string; value: number }) {
  const color =
    value > 80 ? "bg-rose-500" : value > 60 ? "bg-amber-500" : "bg-emerald-500"
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
        <span>{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  )
}

// ─── AppDetailModal ───────────────────────────────────────────────────────────

function AppDetailModal({
  dep,
  onClose,
}: {
  dep: DeploymentDoc
  onClose: () => void
}) {
  const [reportOpen, setReportOpen] = useState(false)
  const [reportText, setReportText] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const { user } = useAuth()

  const health = resolveHealth(dep.health)
  const hc = healthConfig[health]
  const appName = dep.name ?? dep.productSlug ?? dep.clientListName ?? "Application"

  async function handleSendReport() {
    if (!reportText.trim() || !db || !user) return
    setSending(true)
    try {
      await addDoc(
        collection(db, COLLECTIONS.supportTickets) as Parameters<typeof addDoc>[0],
        {
          subject: `Problème signalé — ${appName}`,
          description: reportText.trim(),
          priority: "Normale",
          status: "Ouvert",
          createdByUserId: user.id,
          organizationId: user.organizationId ?? "",
          deploymentId: dep.id,
        } as Record<string, unknown>,
      )
      setSent(true)
      setReportText("")
      setTimeout(() => {
        setSent(false)
        setReportOpen(false)
      }, 2000)
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className={`size-3 rounded-full shrink-0 ${hc.dot}`} />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">{appName}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{dep.productSlug}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 mb-5">
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
              envBadge[dep.environment] ?? envBadge.Development
            }`}
          >
            {dep.environment}
          </span>
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${hc.badge}`}>
            {hc.label}
          </span>
        </div>

        {/* Metrics */}
        <div className="space-y-3 mb-5">
          <MetricBar label="CPU" value={dep.cpu} />
          <MetricBar label="RAM" value={dep.ram} />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Req/min</p>
            <p className="font-bold text-slate-900 dark:text-white text-sm">
              {dep.requestsPerMin ?? dep.requests ?? "—"}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">CPU</p>
            <p className="font-bold text-slate-900 dark:text-white text-sm">{dep.cpu}%</p>
          </div>
        </div>

        {/* Report problem */}
        {!reportOpen ? (
          <button
            onClick={() => setReportOpen(true)}
            className="w-full py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px] text-rose-500">flag</span>
            Signaler un problème
          </button>
        ) : (
          <div className="space-y-3">
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#db143c]/50 resize-none placeholder:text-slate-400"
              placeholder="Décrivez le problème rencontré…"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setReportOpen(false)}
                className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSendReport}
                disabled={!reportText.trim() || sending || sent}
                className="flex-1 py-2 bg-[#db143c] hover:bg-[#b01030] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                {sent ? (
                  <>
                    <span className="material-symbols-outlined text-[14px]">check</span>
                    Envoyé
                  </>
                ) : sending ? (
                  "Envoi…"
                ) : (
                  "Envoyer"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClientApps() {
  const { user } = useAuth()
  const [deployments, setDeployments] = useState<DeploymentDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<DeploymentDoc | null>(null)

  useEffect(() => {
    if (!db || !user?.organizationId) {
      setLoading(false)
      return
    }

    const q = query(
      collection(db, COLLECTIONS.deployments),
      where("organizationId", "==", user.organizationId),
    )

    const unsub = onSnapshot(q, (snap) => {
      const docs: DeploymentDoc[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as FirestoreDeployment),
      }))
      setDeployments(docs)
      setLoading(false)
    })

    return unsub
  }, [user?.organizationId])

  const total = deployments.length
  const actives = deployments.filter((d) => resolveHealth(d.health) === "ok").length
  const alertes = deployments.filter((d) => resolveHealth(d.health) === "degraded").length
  const arretees = deployments.filter(
    (d) => resolveHealth(d.health) === "down" || d.health === "stopped",
  ).length

  const kpis = [
    {
      label: "Total apps",
      value: total,
      icon: "apps",
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      label: "Actives",
      value: actives,
      icon: "check_circle",
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      label: "En alerte",
      value: alertes,
      icon: "warning",
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-900/20",
    },
    {
      label: "Arrêtées",
      value: arretees,
      icon: "cancel",
      color: "text-rose-600",
      bg: "bg-rose-50 dark:bg-rose-900/20",
    },
  ]

  return (
    <DashboardLayout role="client" navItems={clientNav} pageTitle="Mes Applications">
      <div className="p-6 space-y-6">
        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <div
              key={k.label}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5"
            >
              <div
                className={`size-10 rounded-lg ${k.bg} ${k.color} flex items-center justify-center mb-3`}
              >
                <span className="material-symbols-outlined text-[20px]">{k.icon}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{k.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {total} application{total !== 1 ? "s" : ""}
          </p>
          <Link
            to="/client/requests/new"
            className="flex items-center gap-2 px-4 py-2 bg-[#db143c] hover:bg-[#b01030] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Demander une nouvelle app
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 animate-pulse"
              >
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && deployments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-slate-400 text-[32px]">
                apps
              </span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 font-semibold text-base mb-1">
              Aucune application déployée
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 max-w-xs">
              Soumettez une demande pour déployer votre première application.
            </p>
            <Link
              to="/client/requests/new"
              className="flex items-center gap-2 px-5 py-2.5 bg-[#db143c] hover:bg-[#b01030] text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Soumettre une demande
            </Link>
          </div>
        )}

        {/* Card grid */}
        {!loading && deployments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {deployments.map((dep) => {
              const health = resolveHealth(dep.health)
              const hc = healthConfig[health]
              const appName =
                dep.name ?? dep.clientListName ?? dep.productSlug ?? "Application"
              return (
                <button
                  key={dep.id}
                  onClick={() => setSelected(dep)}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:shadow-lg hover:border-[#db143c]/30 dark:hover:border-[#db143c]/40 transition-all text-left group"
                >
                  {/* App header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-[#db143c]/10 transition-colors">
                        <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 group-hover:text-[#db143c] text-[20px] transition-colors">
                          deployed_code
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                          {appName}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{dep.productSlug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`size-2 rounded-full ${hc.dot}`} />
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${hc.badge}`}
                      >
                        {hc.label}
                      </span>
                    </div>
                  </div>

                  {/* Env badge */}
                  <div className="mb-4">
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        envBadge[dep.environment] ?? envBadge.Development
                      }`}
                    >
                      {dep.environment}
                    </span>
                  </div>

                  {/* Metric bars */}
                  <div className="space-y-2.5">
                    <MetricBar label="CPU" value={dep.cpu} />
                    <MetricBar label="RAM" value={dep.ram} />
                  </div>

                  {/* Footer */}
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      Req/min:{" "}
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        {dep.requestsPerMin ?? dep.requests ?? "—"}
                      </span>
                    </p>
                    <span className="text-xs text-[#db143c] font-medium group-hover:underline">
                      Voir détails →
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {selected && (
        <AppDetailModal dep={selected} onClose={() => setSelected(null)} />
      )}
    </DashboardLayout>
  )
}
