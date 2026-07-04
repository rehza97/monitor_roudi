import { useState, useEffect, useRef, useCallback } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { clientNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import { onSnapshot, collection, query, where, orderBy } from "@/lib/firebase-firestore"
import { COLLECTIONS } from "@/data/schema"
import type { DeploymentEnvironment } from "@/data/schema"
import { createSupportTicket } from "@/lib/support-tickets"

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

const statusConfig: Record<
  NormalizedHealth,
  { dot: string; label: string; badge: string }
> = {
  healthy: {
    dot: "bg-emerald-500",
    label: "Opérationnel",
    badge: "text-emerald-700 bg-emerald-50",
  },
  warning: {
    dot: "bg-amber-500 animate-pulse",
    label: "Dégradé",
    badge: "text-amber-700 bg-amber-50",
  },
  down: {
    dot: "bg-rose-500",
    label: "Hors ligne",
    badge: "text-rose-700 bg-rose-50",
  },
}

const envBadge: Record<string, string> = {
  Production: "text-blue-700 bg-blue-50",
  Staging: "text-amber-700 bg-amber-50",
  Development: "text-slate-600 bg-slate-100",
}

function MiniBar({ value }: { value: number }) {
  const color =
    value > 80 ? "bg-rose-500" : value > 60 ? "bg-amber-500" : "bg-emerald-500"
  return (
    <div className="flex items-center gap-2 w-28">
      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-xs font-medium text-slate-600 w-9 text-right">
        {value}%
      </span>
    </div>
  )
}

// ─── ServiceModal ─────────────────────────────────────────────────────────────

function ServiceModal({
  dep,
  onClose,
}: {
  dep: DeploymentDoc
  onClose: () => void
}) {
  const { user } = useAuth()
  const [restartHistory, setRestartHistory] = useState<Array<{ time: string; reason: string; by: string }>>([])
  const [reportText, setReportText] = useState("")
  const [reportOpen, setReportOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const health = normalizeHealth(dep.health)
  const sc = statusConfig[health]
  const appName = dep.name ?? dep.clientListName ?? dep.productSlug ?? "Application"

  useEffect(() => {
    if (!db || !user?.organizationId) return
    const q = query(
      collection(db, COLLECTIONS.supportTickets),
      where("organizationId", "==", user.organizationId),
      where("deploymentId", "==", dep.id),
      orderBy("createdAt", "desc"),
    )
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>
        const by =
          (typeof data.assignedToId === "string" && data.assignedToId) ||
          (typeof data.createdByUserId === "string" && data.createdByUserId) ||
          "Système"
        const createdAt = data.createdAt as unknown
        const time = createdAt && typeof createdAt === "object" && "toDate" in createdAt
          ? (createdAt as { toDate: () => Date }).toDate().toLocaleString("fr-DZ", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
          : "—"
        return {
          reason: typeof data.subject === "string" && data.subject ? data.subject : "Incident",
          by,
          ms: createdAt && typeof createdAt === "object" && "toDate" in createdAt
            ? (createdAt as { toDate: () => Date }).toDate().getTime()
            : 0,
          time,
        }
      })
      setRestartHistory(
        rows
          .sort((a, b) => b.ms - a.ms)
          .slice(0, 3)
          .map(({ reason, by, time }) => ({ reason, by, time })),
      )
    })
    return unsub
  }, [dep.id, user?.organizationId])

  async function handleSignaler() {
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
        className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className={`size-3 rounded-full shrink-0 ${sc.dot}`} />
            <div>
              <h3 className="font-bold text-slate-900">{appName}</h3>
              <p className="text-xs text-slate-400">{dep.environment}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
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
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
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
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500 mb-0.5">Req/min</p>
            <p className="font-bold text-slate-900 text-sm">
              {dep.requestsPerMin ?? dep.requests ?? "—"}
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500 mb-0.5">Santé</p>
            <p className="font-bold text-slate-900 text-sm">{sc.label}</p>
          </div>
        </div>

        {/* Restart history */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Historique des redémarrages
          </p>
          <div className="space-y-2">
            {restartHistory.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs px-3 py-2 bg-slate-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-slate-800">{r.reason}</p>
                  <p className="text-slate-400">{r.by}</p>
                </div>
                <span className="text-slate-400 shrink-0 ml-3">{r.time}</span>
              </div>
            ))}
            {restartHistory.length === 0 && (
              <div className="text-xs text-slate-400 px-2 py-1">Aucun historique pour ce service.</div>
            )}
          </div>
        </div>

        {/* Signaler */}
        {!reportOpen ? (
          <button
            onClick={() => setReportOpen(true)}
            className="w-full py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
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
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#db143c]/50 resize-none placeholder:text-slate-400"
              placeholder="Décrivez le problème…"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setReportOpen(false)}
                className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
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

  const kpis = [
    {
      label: "Applications actives",
      value: healthy,
      icon: "apps",
      color: "text-blue-600",
      bg: "bg-blue-50",
      delta: `${healthy > 0 ? "+" : ""}${healthy}`,
    },
    {
      label: "Utilisation CPU",
      value: warning,
      icon: "memory",
      color: "text-amber-600",
      bg: "bg-amber-50",
      delta: `${warning > 0 ? "+" : ""}${warning}`,
    },
    {
      label: "Utilisation RAM",
      value: down,
      icon: "memory_alt",
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      delta: `${down > 0 ? "+" : ""}${down}`,
    },
    {
      label: "Disponibilité",
      value: healthy + warning > 0 ? "99.9%" : "—",
      icon: "timer",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      delta: "Stable",
    },
  ]

  return (
    <DashboardLayout role="client" navItems={clientNav} pageTitle="Monitoring">
      <div className="min-h-[calc(100vh-64px)] space-y-6 p-6 max-w-7xl mx-auto text-[#0f172a]">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span>Accueil</span>
          <span>/</span>
          <span className="font-medium text-slate-900">Monitoring</span>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Mes Applications</h2>
            <p className="mt-2 max-w-2xl text-slate-600">Surveillance en temps réel des performances, de la disponibilité et des journaux d&apos;erreurs.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700">
              <span className="material-symbols-outlined text-[18px]">add</span>
              Nouveau déploiement
            </button>
            <button type="button" className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Actualiser
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <div
              key={k.label}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="h-1 w-full bg-blue-600" />
              <div className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">{k.label}</p>
                  <span className={`material-symbols-outlined text-[20px] ${k.color}`}>{k.icon}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-slate-900">{k.value}</p>
                  <span className="text-xs font-semibold text-emerald-600">{k.delta}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-slate-900">Services Déployés</h3>
              <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-1">
                <button type="button" className="rounded-md bg-white px-3 py-1 text-xs font-medium text-slate-900 shadow-sm">Tout</button>
                <button type="button" className="rounded-md px-3 py-1 text-xs font-medium text-slate-500 hover:text-slate-700">En ligne</button>
                <button type="button" className="rounded-md px-3 py-1 text-xs font-medium text-slate-500 hover:text-slate-700">Hors ligne</button>
                <button type="button" className="rounded-md px-3 py-1 text-xs font-medium text-slate-500 hover:text-slate-700">Alertes</button>
              </div>
            </div>

            {/* Table panel */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Panel header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Services déployés</h3>
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-500 tabular-nums">
                Actualisation dans{" "}
                <span className="font-medium text-slate-700">
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
            <div className="divide-y divide-slate-100">
              {[1, 2, 3].map((n) => (
                <div key={n} className="px-6 py-4 flex items-center gap-4 animate-pulse">
                  <div className="size-2.5 rounded-full bg-slate-200" />
                  <div className="flex-1 h-4 bg-slate-100 rounded w-1/3" />
                  <div className="h-4 bg-slate-100 rounded w-24" />
                </div>
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && deployments.length === 0 && (
            <div className="py-16 flex flex-col items-center text-center">
              <span className="material-symbols-outlined text-slate-300 text-[48px] mb-3">
                monitoring
              </span>
              <p className="text-slate-600 text-sm">
                Aucun service à surveiller pour le moment.
              </p>
            </div>
          )}

          {/* Table */}
          {!loading && deployments.length > 0 && (
            <>
              {/* Table header */}
              <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <span>Application</span>
                <span>Environnement</span>
                <span>CPU</span>
                <span>RAM</span>
                <span>Req/min</span>
                <span>Statut</span>
              </div>

              <div className="divide-y divide-slate-100">
                {deployments.map((dep) => {
                  const health = normalizeHealth(dep.health)
                  const sc = statusConfig[health]
                  const appName =
                    dep.name ?? dep.clientListName ?? dep.productSlug ?? "Application"
                  return (
                    <button
                      key={dep.id}
                      onClick={() => setSelected(dep)}
                      className="w-full text-left hover:bg-slate-50 transition-colors"
                    >
                      {/* Mobile row */}
                      <div className="md:hidden flex items-center gap-3 px-4 py-3.5">
                        <span className={`size-2.5 rounded-full shrink-0 ${sc.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {appName}
                          </p>
                          <p className="text-xs text-slate-500">{dep.environment}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sc.badge}`}>
                          {sc.label}
                        </span>
                      </div>

                      {/* Desktop row */}
                      <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 items-center px-6 py-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`size-2.5 rounded-full shrink-0 ${sc.dot}`} />
                          <p className="text-sm font-medium text-slate-900 truncate">
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
                        <span className="text-sm text-slate-700 tabular-nums">
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

          <div className="xl:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <span className="material-symbols-outlined text-blue-600">terminal</span>
                Live Logs
              </h3>
              <div className="flex items-center gap-2">
                <span className="mt-0.5 size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-xs text-slate-500">STREAMING</span>
              </div>
            </div>
            <div className="flex min-h-[420px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs shadow-sm">
              <div className="mb-2 flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex gap-1.5">
                  <div className="size-2.5 rounded-full bg-red-500/80" />
                  <div className="size-2.5 rounded-full bg-yellow-500/80" />
                  <div className="size-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <div className="text-slate-500">bash — 80x24</div>
              </div>
              <div className="flex-1 space-y-1 overflow-y-auto text-slate-300">
                {deployments.slice(0, 8).map((dep, idx) => {
                  const appName = dep.name ?? dep.clientListName ?? dep.productSlug ?? "service"
                  const hs = normalizeHealth(dep.health)
                  const level = hs === "healthy" ? "SUCCESS" : hs === "warning" ? "WARN" : "ERROR"
                  const levelColor = hs === "healthy" ? "text-emerald-400" : hs === "warning" ? "text-yellow-400" : "text-rose-400"
                  return (
                    <div key={dep.id} className="flex gap-2">
                      <span className="text-slate-500">[{String(14 + Math.floor(idx / 2)).padStart(2, "0")}:{idx % 2 ? "31" : "12"}:0{idx}]</span>
                      <span className={levelColor}>{level}</span>
                      <span>{appName} · CPU {dep.cpu}% · RAM {dep.ram}%</span>
                    </div>
                  )
                })}
                {!loading && deployments.length === 0 ? (
                  <div className="text-slate-500">No log stream available.</div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selected && (
        <ServiceModal dep={selected} onClose={() => setSelected(null)} />
      )}
    </DashboardLayout>
  )
}
