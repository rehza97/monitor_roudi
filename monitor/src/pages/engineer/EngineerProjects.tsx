import { useState, useEffect } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { engineerNav } from "@/lib/nav"
import { Link } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import { collection, query, where, orderBy, onSnapshot } from "@/lib/firebase-firestore"
import { COLLECTIONS } from "@/data/schema"
import type { FirestoreOrder } from "@/data/schema"
import { canEngineerAccessOrder } from "@/lib/access-control"
import { formatFirestoreDate } from "@/lib/utils"

interface Order extends FirestoreOrder { id: string }

const statusColors: Record<string, string> = {
  "En attente": "text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400",
  "Validée":    "text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400",
  "En cours":   "text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400",
  "Rejetée":    "text-rose-700 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400",
  "Livré":      "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400",
}

const priorityDot: Record<string, string> = {
  Haute:   "bg-rose-500",
  Normale: "bg-blue-500",
  Basse:   "bg-slate-400",
}

const ALL_STATUSES = ["Tous", "En cours", "Validée", "En attente", "Rejetée", "Livré"]

export default function EngineerProjects() {
  const { user } = useAuth()
  const [orders, setOrders]     = useState<Order[]>([])
  const [loading, setLoading]   = useState(true)
  const [statusTab, setStatus]  = useState("Tous")
  const [search, setSearch]     = useState("")

  useEffect(() => {
    if (!db) return
    const q = query(
      collection(db, COLLECTIONS.orders),
      where("kind", "==", "client_request"),
      orderBy("createdAt", "desc"),
    )
    const unsub = onSnapshot(q, snap => {
      const visible = snap.docs
        .map(d => ({ id: d.id, ...(d.data() as FirestoreOrder) }))
        .filter((row) => canEngineerAccessOrder(row, user?.id))
      setOrders(visible)
      setLoading(false)
    })
    return unsub
  }, [user?.id])

  const filtered = orders.filter(o => {
    const matchStatus = statusTab === "Tous" || o.status === statusTab
    const term = search.toLowerCase()
    const matchSearch = !term ||
      (o.clientLabel ?? "").toLowerCase().includes(term) ||
      (o.requestType ?? "").toLowerCase().includes(term) ||
      (o.description ?? "").toLowerCase().includes(term)
    return matchStatus && matchSearch
  })

  const enCours    = orders.filter(o => o.status === "En cours").length
  const validees   = orders.filter(o => o.status === "Validée").length
  const enAttente  = orders.filter(o => o.status === "En attente").length

  const kpis = [
    { label: "En cours",   value: enCours,   icon: "sync",       color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-900/20" },
    { label: "Validées",   value: validees,  icon: "check",      color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
    { label: "En attente", value: enAttente, icon: "hourglass_empty", color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-900/20" },
  ]

  return (
    <DashboardLayout role="engineer" navItems={engineerNav} pageTitle="Mes Projets">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Mes Projets</h2>
          <p className="text-slate-500 text-sm mt-1">Vue d'ensemble des demandes clients assignées.</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          {kpis.map(k => (
            <div key={k.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4">
              <div className={`size-11 rounded-xl ${k.bg} ${k.color} flex items-center justify-center shrink-0`}>
                <span className="material-symbols-outlined text-[22px]">{k.icon}</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{k.value}</p>
                <p className="text-xs text-slate-500">{k.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 flex-wrap">
            {ALL_STATUSES.map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  statusTab === s
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}>
                {s}
              </button>
            ))}
          </div>
          <div className="relative ml-auto w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Rechercher…" />
          </div>
        </div>

        {/* Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <span className="material-symbols-outlined text-[48px]">folder_open</span>
            <p className="text-sm">Aucun projet trouvé.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(o => (
              <Link key={o.id} to={`/engineer/requests/${o.id}`}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:border-blue-400 dark:hover:border-blue-600 transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[o.status] ?? statusColors["En attente"]}`}>
                    {o.status}
                  </span>
                  {o.priority && (
                    <div className="flex items-center gap-1.5">
                      <span className={`size-2 rounded-full ${priorityDot[o.priority] ?? "bg-slate-400"}`} />
                      <span className="text-xs text-slate-500">{o.priority}</span>
                    </div>
                  )}
                </div>
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {o.clientLabel ?? "Client inconnu"}
                </h4>
                {o.requestType && (
                  <p className="text-xs text-slate-500 mt-1">{o.requestType}</p>
                )}
                {o.description && (
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2">{o.description}</p>
                )}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-400">{formatFirestoreDate(o.createdAt)}</span>
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium group-hover:underline">Voir le projet →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
