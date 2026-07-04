import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { clientNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import { onSnapshot, collection, query, where, orderBy } from "@/lib/firebase-firestore"
import { COLLECTIONS } from "@/data/schema"
import type { Deployment, DeploymentHealth, DeploymentEnvironment, FirestoreOrder } from "@/data/schema"
import { createSupportTicket } from "@/lib/support-tickets"

// ─── Types ───────────────────────────────────────────────────────────────────

interface FirestoreDeployment extends Omit<Deployment, "id"> {
  name?: string
  requestsPerMin?: number
}

interface DeploymentDoc extends FirestoreDeployment {
  id: string
}

interface AppOrderDoc extends FirestoreOrder {
  id: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveHealth(health: string): DeploymentHealth {
  if (health === "ok" || health === "healthy") return "ok"
  if (health === "degraded" || health === "warning") return "degraded"
  return "down"
}

const envBadge: Record<DeploymentEnvironment, string> = {
  Production: "text-blue-700 bg-blue-50",
  Staging: "text-amber-700 bg-amber-50",
  Development: "text-slate-600 bg-slate-100",
}

const healthConfig: Record<
  DeploymentHealth,
  { dot: string; label: string; badge: string }
> = {
  ok: {
    dot: "bg-emerald-500",
    label: "Actif",
    badge: "text-emerald-700 bg-emerald-50",
  },
  degraded: {
    dot: "bg-amber-500 animate-pulse",
    label: "Alerte",
    badge: "text-amber-700 bg-amber-50",
  },
  down: {
    dot: "bg-rose-500",
    label: "Arrêtée",
    badge: "text-rose-700 bg-rose-50",
  },
  stopped: {
    dot: "bg-rose-500",
    label: "Arrêtée",
    badge: "text-rose-700 bg-rose-50",
  },
}

function MetricBar({ label, value }: { label: string; value: number }) {
  const color =
    value > 80 ? "bg-rose-500" : value > 60 ? "bg-amber-500" : "bg-emerald-500"
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
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
    if (!reportText.trim() || !user) return
    setSending(true)
    try {
      await createSupportTicket({
        subject: `Problème signalé — ${appName}`,
        description: reportText.trim(),
        topic: "software",
        priority: "Normale",
        createdByUserId: user.id,
        organizationId: user.organizationId ?? "",
        clientLabel: user.name,
        deploymentId: dep.id,
      })
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
        className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className={`size-3 rounded-full shrink-0 ${hc.dot}`} />
            <div>
              <h3 className="font-bold text-slate-900 text-base">{appName}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{dep.productSlug}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
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
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500 mb-0.5">Req/min</p>
            <p className="font-bold text-slate-900 text-sm">
              {dep.requestsPerMin ?? dep.requests ?? "—"}
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500 mb-0.5">CPU</p>
            <p className="font-bold text-slate-900 text-sm">{dep.cpu}%</p>
          </div>
        </div>

        {/* Report problem */}
        {!reportOpen ? (
          <button
            onClick={() => setReportOpen(true)}
            className="w-full py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
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
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#db143c]/50 resize-none placeholder:text-slate-400"
              placeholder="Décrivez le problème rencontré…"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setReportOpen(false)}
                className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
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
  const [appOrders, setAppOrders] = useState<AppOrderDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(true)
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

  useEffect(() => {
    if (!db || !user?.organizationId) {
      setOrdersLoading(false)
      return
    }

    const q = query(
      collection(db, COLLECTIONS.orders),
      where("organizationId", "==", user.organizationId),
      where("kind", "==", "client_request"),
      orderBy("createdAt", "desc"),
    )

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as FirestoreOrder) }))
        .filter((order) => {
          const type = order.requestType ?? ""
          return type.startsWith("Commande app:") || type.startsWith("Application custom:")
        })
      setAppOrders(docs)
      setOrdersLoading(false)
    })

    return unsub
  }, [user?.organizationId])

  const total = deployments.length + appOrders.length
  const actives = deployments.filter((d) => resolveHealth(d.health) === "ok").length
  const alertes = deployments.filter((d) => resolveHealth(d.health) === "degraded").length
  const kpis = [
    {
      label: "Total apps",
      value: total,
      icon: "apps",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Commandées",
      value: appOrders.length,
      icon: "shopping_cart",
      color: "text-cyan-700",
      bg: "bg-cyan-50",
    },
    {
      label: "Actives",
      value: actives,
      icon: "check_circle",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "En alerte",
      value: alertes,
      icon: "warning",
      color: "text-amber-600",
      bg: "bg-amber-50",
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
              className="bg-white rounded-xl border border-slate-200 p-5"
            >
              <div
                className={`size-10 rounded-lg ${k.bg} ${k.color} flex items-center justify-center mb-3`}
              >
                <span className="material-symbols-outlined text-[20px]">{k.icon}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{k.value}</p>
              <p className="text-sm text-slate-500 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between">
          <p className="text-slate-500 text-sm">
            {total} application{total !== 1 ? "s" : ""} et commande{appOrders.length !== 1 ? "s" : ""}
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
        {(loading || ordersLoading) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse"
              >
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-xl bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !ordersLoading && deployments.length === 0 && appOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-slate-400 text-[32px]">
                apps
              </span>
            </div>
            <p className="text-slate-700 font-semibold text-base mb-1">
              Aucune application déployée
            </p>
            <p className="text-slate-500 text-sm mb-6 max-w-xs">
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
        {!ordersLoading && appOrders.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Applications commandées</h3>
              <Link to="/client/requests" className="text-sm font-semibold text-[#0891b2] hover:underline">Voir les demandes</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {appOrders.map((order) => {
                const isCustom = (order.requestType ?? "").startsWith("Application custom:")
                const title = (order.requestType ?? "Application").replace(/^Commande app:\s*/, "").replace(/^Application custom:\s*/, "")
                return (
                  <Link
                    key={order.id}
                    to={`/client/requests/${order.id}`}
                    className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg hover:border-[#0891b2]/30 transition-all text-left group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0 group-hover:bg-[#0891b2]/10 transition-colors">
                          <span className="material-symbols-outlined text-[#0891b2] text-[20px]">
                            {isCustom ? "add_box" : "deployed_code"}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm truncate">{title}</p>
                          <p className="text-xs text-slate-400 truncate">REQ-{order.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-amber-700 bg-amber-50">
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2">{order.description || "Commande en cours de traitement."}</p>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500">{isCustom ? "App custom" : "App catalogue"}</span>
                      <span className="text-sm font-bold text-slate-900">{order.budgetLabel || "Sur devis"}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

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
                  className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg hover:border-[#db143c]/30 transition-all text-left group"
                >
                  {/* App header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-[#db143c]/10 transition-colors">
                        <span className="material-symbols-outlined text-slate-500 group-hover:text-[#db143c] text-[20px] transition-colors">
                          deployed_code
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">
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
                      <span className="font-medium text-slate-600">
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
