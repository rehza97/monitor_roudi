import { useState, useEffect, useRef, useCallback } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { clientNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import { onSnapshot, addDoc, collection, query, where } from "@/lib/firebase-firestore"
import { COLLECTIONS } from "@/data/schema"
import type { DeploymentHealth, DeploymentEnvironment } from "@/data/schema"

// ─── Types ────────────────────────────────────────────────────────────────────

interface FirestoreDeployment {
  organizationId: string
  productSlug?: string
  name?: string
  clientListName?: string
  environment: DeploymentEnvironment
  health: string
  cpu: number
  ram: number
  requests?: string
  requestsPerMin?: number
}

interface DeploymentDoc extends FirestoreDeployment {
  id: string
}

type NormalizedHealth = "healthy" | "warning" | "down"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeHealth(raw: string): NormalizedHealth {
  if (raw === "ok" || raw === "healthy") return "healthy"
  if (raw === "degraded" || raw === "warning") return "warning"
  return "down"
}

function resolveDeploymentHealth(raw: string): DeploymentHealth {
  if (raw === "ok" || raw === "healthy") return "ok"
  if (raw === "degraded" || raw === "warning") return "degraded"
  return "down"
}

const statusConfig: Record<
  NormalizedHealth,
  { dot: string; label: string; badge: string }
> = {
  healthy: {
    dot: "bg-emerald-500",
    label: "Opérationnel",
    badge: "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  warning: {
    dot: "bg-amber-500 animate-pulse",
    label: "Dégradé",
    badge: "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
  },
  down: {
    dot: "bg-rose-500",
    label: "Hors ligne",
    badge: "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400",
  },
}

const envBadge: Record<string, string> = {
  Production: "text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400",
  Staging: "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
  Development: "text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-400",
}

function MiniBar({ value }: { value: number }) {
  const color =
    value > 80 ? "bg-rose-500" : value > 60 ? "bg-amber-500" : "bg-emerald-500"
  return (
    <div className="flex items-center gap-2 w-28">
      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 w-9 text-right">
        {value}%
      </span>
    </div>
  )
}

// ─── ServiceModal ─────────────────────────────────────────────────────────────

const RESTART_HISTORY = [
  { time: "Hier 03:14", reason: "Mise à jour déployée", by: "Admin" },
  { time: "Il y a 3j 11:52", reason: "Crash mémoire détecté", by: "Système" },
  { time: "Il y a 7j 22:05", reason: "Redémarrage planifié", by: "Admin" },
]

function ServiceModal({
  dep,
  onClose,
}: {
  dep: DeploymentDoc
  onClose: () => void
}) {
  const { user } = useAuth()
  const [reportText, setReportText] = useState("")
  const [reportOpen, setReportOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const health = normalizeHealth(dep.health)
  const sc = statusConfig[health]
  const appName = dep.name ?? dep.clientListName ?? dep.productSlug ?? "Application"

  async function handleSignaler() {
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
      setTimeout(() => { setSent(false); setReportOpen(false) }, 2000)
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
        className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className={`size-3 rounded-full shrink-0 ${sc.dot}`} />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">{appName}</h3>
              <p className="text-xs text-slate-400">{dep.environment}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Status badge */}
        <div className="flex gap-2 mb-5">
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${sc.badge}`}>
            {sc.label}
          </span>
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${envBadge[dep.environment] ?? envBadge.Development}`}>
            {dep.environment}
          </span>
        </div>

        {/* Metric bars */}
        <div className="space-y-3 mb-5">
          {[
            { label: "CPU", value: dep.cpu },
            { label: "RAM", value: dep.ram },
          ].map((b) => (
            <div key={b.label}>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>{b.label}</span>
                <span className="font-medium">{b.value}%</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    b.value > 80
                      ? "bg-rose-500"
                      : b.value > 60
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(b.value, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Req/min</p>
            <p className="font-bold text-slate-900 dark:text-white text-sm">
              {dep.requestsPerMin ?? dep.requests ?? "—"}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Santé</p>
            <p className="font-bold text-slate-900 dark:text-white text-sm">{sc.label}</p>
          </div>
        </div>

        {/* Restart history */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Historique des redémarrages
          </p>
          <div className="space-y-2">
            {RESTART_HISTORY.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg"
              >
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{r.reason}</p>
                  <p className="text-slate-400">{r.by}</p>
                </div>
                <span className="text-slate-400 shrink-0 ml-3">{r.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Signaler */}
        {!reportOpen ? (
          <button
            onClick={() => setReportOpen(true)}
            className="w-full py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px] text-rose-500">flag</span>
            Signaler
          </button>
        ) : (
          <div className="space-y-2">
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#db143c]/50 resize-none placeholder:text-slate-400"
              placeholder="Décrivez le problème…"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setReportOpen(false)}
                className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Annuler
              </button>
              <button
                onClick={handleSignaler}
                disabled={!reportText.trim() || sending || sent}
                className="flex-1 py-2 bg-[#db143c] hover:bg-[#b01030] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                {sent ? (
                  <><span className="material-symbols-outlined text-[14px]">check</span>Envoyé</>
                ) : sending ? "Envoi…" : "Envoyer"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const REFRESH_INTERVAL = 30

export default function ClientMonitoring() {
  const { user } = useAuth()
  const [deployments, setDeployments] = useState<DeploymentDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<DeploymentDoc | null>(null)
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const resetCountdown = useCallback(() => {
    setCountdown(REFRESH_INTERVAL)
  }, [])

  // Countdown timer (visual only)
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) return REFRESH_INTERVAL
        return prev - 1
      })
    }, 1000)
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [])

  // Firestore real-time
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
      resetCountdown()
    })

    return unsub
  }, [user?.organizationId, resetCountdown])

  const healthy = deployments.filter((d) => normalizeHealth(d.health) === "healthy").length
  const warning = deployments.filter((d) => normalizeHealth(d.health) === "warning").length
  const down = deployments.filter((d) => normalizeHealth(d.health) === "down").length
  const totalReqMin = deployments.reduce((sum, d) => {
    const r = d.requestsPerMin ?? (typeof d.requests === "number" ? d.requests : 0)
    return sum + (typeof r === "number" ? r : 0)
  }, 0)

  const kpis = [
    {
      label: "Saines",
      value: healthy,
      icon: "check_circle",
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      label: "En alerte",
      value: warning,
      icon: "warning",
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-900/20",
    },
    {
      label: "Hors ligne",
      value: down,
      icon: "cancel",
      color: "text-rose-600",
      bg: "bg-rose-50 dark:bg-rose-900/20",
    },
    {
      label: "Req/min total",
      value: totalReqMin,
      icon: "bolt",
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
  ]

  return (
    <DashboardLayout role="client" navItems={clientNav} pageTitle="Monitoring">
      <div className="p-6 space-y-6">
        {/* KPIs */}
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

        {/* Table panel */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Panel header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">Services déployés</h3>
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-400 tabular-nums">
                Actualisation dans{" "}
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  {countdown}s
                </span>
              </span>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                En direct
              </div>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {[1, 2, 3].map((n) => (
                <div key={n} className="px-6 py-4 flex items-center gap-4 animate-pulse">
                  <div className="size-2.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div className="flex-1 h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24" />
                </div>
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && deployments.length === 0 && (
            <div className="py-16 flex flex-col items-center text-center">
              <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-[48px] mb-3">
                monitoring
              </span>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Aucun service à surveiller pour le moment.
              </p>
            </div>
          )}

          {/* Table */}
          {!loading && deployments.length > 0 && (
            <>
              {/* Table header */}
              <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-2 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <span>Application</span>
                <span>Environnement</span>
                <span>CPU</span>
                <span>RAM</span>
                <span>Req/min</span>
                <span>Statut</span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {deployments.map((dep) => {
                  const health = normalizeHealth(dep.health)
                  const sc = statusConfig[health]
                  const appName =
                    dep.name ?? dep.clientListName ?? dep.productSlug ?? "Application"
                  return (
                    <button
                      key={dep.id}
                      onClick={() => setSelected(dep)}
                      className="w-full text-left hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Mobile row */}
                      <div className="md:hidden flex items-center gap-3 px-4 py-3.5">
                        <span className={`size-2.5 rounded-full shrink-0 ${sc.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {appName}
                          </p>
                          <p className="text-xs text-slate-400">{dep.environment}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sc.badge}`}>
                          {sc.label}
                        </span>
                      </div>

                      {/* Desktop row */}
                      <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 items-center px-6 py-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`size-2.5 rounded-full shrink-0 ${sc.dot}`} />
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {appName}
                          </p>
                        </div>
                        <div>
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              envBadge[dep.environment] ?? envBadge.Development
                            }`}
                          >
                            {dep.environment}
                          </span>
                        </div>
                        <MiniBar value={dep.cpu} />
                        <MiniBar value={dep.ram} />
                        <span className="text-sm text-slate-700 dark:text-slate-300 tabular-nums">
                          {dep.requestsPerMin ?? dep.requests ?? "—"}
                        </span>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${sc.badge}`}>
                          {sc.label}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {selected && (
        <ServiceModal dep={selected} onClose={() => setSelected(null)} />
      )}
    </DashboardLayout>
  )
}
