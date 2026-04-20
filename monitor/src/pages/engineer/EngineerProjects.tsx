import { useState, useEffect } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { engineerNav } from "@/lib/nav"
import { Link } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import { collection, query, where, onSnapshot, limit } from "@/lib/firebase-firestore"
import { COLLECTIONS } from "@/data/schema"
import type { FirestoreProject } from "@/data/schema"
import { formatFirestoreDate } from "@/lib/utils"

interface Project extends FirestoreProject { id: string }

const PROJECT_STATUS_LABEL: Record<FirestoreProject["status"], string> = {
  pending: "Validée",
  active: "En cours",
  delivered: "Livré",
  cancelled: "Annulé",
}

const statusColors: Record<string, string> = {
  "Validée":    "text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400",
  "En cours":   "text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400",
  "Livré":      "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400",
  "Annulé":     "text-rose-700 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400",
}

const priorityDot: Record<string, string> = {
  Haute:   "bg-rose-500",
  Normale: "bg-blue-500",
  Basse:   "bg-slate-400",
}

const ALL_STATUSES = ["Tous", "En cours", "Validée", "Livré", "Annulé"]

function toMillis(value: unknown): number {
  if (!value) return 0
  if (typeof value === "object" && value !== null && "toMillis" in value && typeof (value as { toMillis: unknown }).toMillis === "function") {
    return ((value as { toMillis: () => number }).toMillis?.() ?? 0)
  }
  if (value instanceof Date) return value.getTime()
  if (typeof value === "string") {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export default function EngineerProjects() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading]   = useState(true)
  const [statusTab, setStatus]  = useState("Tous")
  const [search, setSearch]     = useState("")

  useEffect(() => {
    if (!db || !user?.id) return
    const q = query(
      collection(db, COLLECTIONS.projects),
      where("assignedEngineerId", "==", user.id),
      limit(120),
    )
    const unsub = onSnapshot(q, snap => {
      const visible = snap.docs.map((d) => ({ id: d.id, ...(d.data() as FirestoreProject) }))
      const sorted = visible.sort((a, b) => {
        const aDate = toMillis(a.startedAt) || toMillis(a.createdAt)
        const bDate = toMillis(b.startedAt) || toMillis(b.createdAt)
        return bDate - aDate
      })
      setProjects(sorted)
      setLoading(false)
    })
    return unsub
  }, [user?.id])

  const filtered = projects.filter((project) => {
    const uiStatus = PROJECT_STATUS_LABEL[project.status] ?? "Validée"
    const matchStatus = statusTab === "Tous" || uiStatus === statusTab
    const term = search.toLowerCase()
    const matchSearch = !term ||
      (project.title ?? "").toLowerCase().includes(term) ||
      (project.clientLabel ?? "").toLowerCase().includes(term) ||
      (project.requestType ?? "").toLowerCase().includes(term) ||
      (project.description ?? "").toLowerCase().includes(term)
    return matchStatus && matchSearch
  })

  const enCours = projects.filter((project) => project.status === "active").length
  const validees = projects.filter((project) => project.status === "pending").length
  const livres = projects.filter((project) => project.status === "delivered").length

  const kpis = [
    { label: "En cours",   value: enCours,   icon: "sync",       color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-900/20" },
    { label: "Validées",   value: validees,  icon: "check",      color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
    { label: "Livrés", value: livres, icon: "inventory_2", color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-900/20" },
  ]

  return (
    <DashboardLayout role="engineer" navItems={engineerNav} pageTitle="Mes Projets">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Mes Projets</h2>
            <p className="text-slate-500 text-sm mt-1">Projets réels créés à partir des demandes clients acceptées.</p>
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
            {filtered.map((project) => {
              const uiStatus = PROJECT_STATUS_LABEL[project.status] ?? "Validée"
              const openOrderId = project.orderId || project.id
              return (
              <Link key={project.id} to={`/engineer/requests/${openOrderId}`}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:border-blue-400 dark:hover:border-blue-600 transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[uiStatus] ?? statusColors["Validée"]}`}>
                    {uiStatus}
                  </span>
                  {project.priority && (
                    <div className="flex items-center gap-1.5">
                      <span className={`size-2 rounded-full ${priorityDot[project.priority] ?? "bg-slate-400"}`} />
                      <span className="text-xs text-slate-500">{project.priority}</span>
                    </div>
                  )}
                </div>
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {project.title || project.clientLabel || "Projet client"}
                </h4>
                {project.clientLabel && (
                  <p className="text-xs text-slate-500 mt-1">{project.clientLabel}</p>
                )}
                {project.description && (
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2">{project.description}</p>
                )}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-400">{formatFirestoreDate(project.startedAt ?? project.createdAt)}</span>
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium group-hover:underline">Voir le projet →</span>
                </div>
              </Link>
            )})}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
