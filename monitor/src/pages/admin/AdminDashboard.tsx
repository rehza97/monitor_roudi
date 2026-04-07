import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import { db, isFirebaseConfigured } from "@/config/firebase"
import { COLLECTIONS, ORDER_KIND, type FirestoreOrder } from "@/data/schema"
import { collection, onSnapshot, orderBy, query, limit } from "@/lib/firebase-firestore"
import { formatFirestoreDate } from "@/lib/utils"

const statusColor: Record<string, string> = {
  "En attente": "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
  Validée:      "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400",
  "En cours":   "text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400",
  Rejetée:      "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400",
}

type OrderRow = {
  id: string
  client: string
  type: string
  status: string
  date: string
}

type DeploymentHealth = "healthy" | "warning" | "down"
function mapHealth(raw: unknown): DeploymentHealth {
  const h = typeof raw === "string" ? raw.toLowerCase() : ""
  if (h === "ok" || h === "healthy") return "healthy"
  if (h === "degraded" || h === "warning") return "warning"
  return "down"
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState<{ id: string; data: FirestoreOrder }[]>([])
  const [engineers, setEngineers] = useState<number>(0)
  const [deployments, setDeployments] = useState<{ health: DeploymentHealth }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db || !isFirebaseConfigured) {
      setLoading(false)
      return
    }

    const unsubs: Array<() => void> = []

    // Orders
    unsubs.push(
      onSnapshot(
        query(collection(db, COLLECTIONS.orders), orderBy("createdAt", "desc"), limit(100)),
        snap => {
          setOrders(snap.docs.map(d => ({ id: d.id, data: d.data() as FirestoreOrder })))
          setLoading(false)
        },
        () => setLoading(false)
      )
    )

    // Engineers count
    unsubs.push(
      onSnapshot(
        collection(db, COLLECTIONS.engineers),
        snap => setEngineers(snap.size),
        () => {}
      )
    )

    // Deployments health
    unsubs.push(
      onSnapshot(
        collection(db, COLLECTIONS.deployments),
        snap => {
          setDeployments(snap.docs.map(d => ({
            health: mapHealth((d.data() as Record<string, unknown>).health),
          })))
        },
        () => {}
      )
    )

    return () => unsubs.forEach(u => u())
  }, [])

  const stats = useMemo(() => {
    const clientRequests = orders.filter(o => o.data.kind === ORDER_KIND.clientRequest)
    const pending = clientRequests.filter(o => o.data.status === "En attente").length
    const validated = clientRequests.filter(o => o.data.status === "Validée").length
    const healthyDeploys = deployments.filter(d => d.health === "healthy").length
    const alertDeploys = deployments.filter(d => d.health !== "healthy").length
    return { pending, validated, healthyDeploys, alertDeploys, total: clientRequests.length }
  }, [orders, deployments])

  const recentOrders = useMemo((): OrderRow[] => {
    return orders
      .filter(o => o.data.kind === ORDER_KIND.clientRequest)
      .slice(0, 8)
      .map(o => ({
        id: o.id,
        client: o.data.clientLabel ?? "—",
        type: o.data.requestType ?? "—",
        status: o.data.status ?? "En attente",
        date: formatFirestoreDate(o.data.createdAt),
      }))
  }, [orders])

  const kpis = [
    {
      label: "Demandes en attente",
      value: loading ? "…" : String(stats.pending),
      icon: "hourglass_empty",
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      trend: stats.total > 0 ? `${Math.round((stats.pending / stats.total) * 100)}% du total` : null,
      link: "/admin/requests",
    },
    {
      label: "Demandes validées",
      value: loading ? "…" : String(stats.validated),
      icon: "check_circle",
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      trend: stats.total > 0 ? `${Math.round((stats.validated / stats.total) * 100)}% du total` : null,
      link: "/admin/requests",
    },
    {
      label: "Ingénieurs actifs",
      value: loading ? "…" : String(engineers),
      icon: "engineering",
      color: "text-violet-600",
      bg: "bg-violet-50 dark:bg-violet-900/20",
      trend: null,
      link: "/admin/engineers",
    },
    {
      label: "Apps en alerte",
      value: loading ? "…" : String(stats.alertDeploys),
      icon: "warning",
      color: "text-rose-600",
      bg: "bg-rose-50 dark:bg-rose-900/20",
      trend: deployments.length > 0 ? `${stats.healthyDeploys} saines sur ${deployments.length}` : null,
      link: "/admin/monitoring",
    },
  ]

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Tableau de bord">
      <div className="p-6 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <Link
              key={k.label}
              to={k.link}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:border-[#db143c]/30 transition-colors block"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`size-10 rounded-lg ${k.bg} ${k.color} flex items-center justify-center`}>
                  <span className="material-symbols-outlined text-[20px]">{k.icon}</span>
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{k.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{k.label}</p>
              {k.trend && (
                <p className="text-xs text-slate-400 mt-1">{k.trend}</p>
              )}
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent requests */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-white">Demandes récentes</h3>
              <Link to="/admin/requests" className="text-sm text-[#db143c] hover:opacity-80 font-medium">
                Voir tout →
              </Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <div className="px-6 py-8 text-center text-slate-400 text-sm">Chargement…</div>
              ) : recentOrders.length === 0 ? (
                <div className="px-6 py-8 text-center text-slate-400 text-sm">
                  Aucune demande.{" "}
                  <Link to="/admin/requests" className="text-[#db143c] underline">
                    Créer une demande
                  </Link>
                </div>
              ) : (
                recentOrders.map((r) => (
                  <div key={r.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{r.client}</p>
                      <p className="text-xs text-slate-400 truncate">{r.type} · {r.date}</p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${statusColor[r.status] ?? "bg-slate-100 text-slate-600"}`}
                    >
                      {r.status}
                    </span>
                    <Link
                      to={`/admin/requests/${r.id}`}
                      className="text-xs text-[#db143c] font-medium hover:opacity-80 shrink-0"
                    >
                      Traiter →
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Server status */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">État des déploiements</h3>
              <Link to="/admin/monitoring" className="text-xs text-[#db143c] font-medium hover:opacity-80">
                Monitoring →
              </Link>
            </div>
            {loading ? (
              <p className="text-sm text-slate-400">Chargement…</p>
            ) : deployments.length === 0 ? (
              <p className="text-sm text-slate-400">Aucun déploiement.</p>
            ) : (
              <div className="space-y-3">
                {[
                  { label: "Sains", value: stats.healthyDeploys, dot: "bg-emerald-500", color: "text-emerald-700" },
                  { label: "En alerte", value: deployments.filter(d => d.health === "warning").length, dot: "bg-amber-500 animate-pulse", color: "text-amber-700" },
                  { label: "Hors ligne", value: deployments.filter(d => d.health === "down").length, dot: "bg-rose-500", color: "text-rose-700" },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-3">
                    <span className={`size-2 rounded-full shrink-0 ${s.dot}`} />
                    <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{s.label}</span>
                    <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Accès rapides</p>
              {[
                { label: "Ingénieurs", icon: "engineering", to: "/admin/engineers" },
                { label: "Matériels", icon: "inventory_2", to: "/admin/materials" },
                { label: "Rapports", icon: "analytics", to: "/admin/reports" },
                { label: "Historique", icon: "history", to: "/admin/history" },
              ].map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm text-slate-700 dark:text-slate-300"
                >
                  <span className="material-symbols-outlined text-[18px] text-slate-400">{item.icon}</span>
                  {item.label}
                  <span className="material-symbols-outlined text-[14px] text-slate-300 ml-auto">chevron_right</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
