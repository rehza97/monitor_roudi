import { useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { technicianNav } from "@/lib/nav"
import { Link, useNavigate } from "react-router-dom"

/* MOCK rows — disabled */
const allTickets: {
  id: string
  site: string
  type: string
  priority: string
  status: string
  date: string
}[] = []

const priorityColor: Record<string, string> = {
  "Urgente": "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400",
  "Haute":   "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
  "Normale": "text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-400",
}
const statusColor: Record<string, string> = {
  "En cours": "text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400",
  "Planifié": "text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400",
  "Résolu":   "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400",
}

export default function TechnicianTickets() {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("Tous les statuts")

  const filtered = allTickets.filter(t => {
    const q = search.toLowerCase()
    const matchSearch = t.site.toLowerCase().includes(q) ||
      t.type.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q)
    const matchStatus = statusFilter === "Tous les statuts" || t.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <DashboardLayout role="technician" navItems={technicianNav} pageTitle="Interventions">
      <div className="p-6 space-y-5">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Rechercher un ticket…"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option>Tous les statuts</option>
            <option>En cours</option>
            <option>Planifié</option>
            <option>Résolu</option>
          </select>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>{["Réf.", "Site", "Type", "Priorité", "Date", "Statut", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                    <span className="material-symbols-outlined text-[32px] block mb-2 text-slate-300">search_off</span>
                    Aucun ticket trouvé
                  </td>
                </tr>
              ) : filtered.map(t => (
                <tr
                  key={t.id}
                  onClick={() => navigate(`/technician/tickets/${t.id}`)}
                  className="hover:bg-amber-50/50 dark:hover:bg-amber-900/10 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{t.id}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white max-w-[180px] truncate">{t.site}</td>
                  <td className="px-4 py-3 text-slate-500">{t.type}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${priorityColor[t.priority]}`}>{t.priority}</span></td>
                  <td className="px-4 py-3 text-slate-500">{t.date}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[t.status]}`}>{t.status}</span></td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <Link to={`/technician/tickets/${t.id}`} className="text-xs text-amber-600 font-medium hover:text-amber-700 flex items-center gap-0.5">
                      Voir <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400 text-right">{filtered.length} résultat{filtered.length !== 1 ? "s" : ""}</p>
      </div>
    </DashboardLayout>
  )
}
