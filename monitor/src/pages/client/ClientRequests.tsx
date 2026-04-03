import { useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { clientNav } from "@/lib/nav"
import { Link } from "react-router-dom"

/* MOCK rows — disabled */
const allRequests: {
  id: string
  title: string
  type: string
  status: string
  date: string
  budget: string
}[] = []

const statusStyle: Record<string, string> = {
  "En cours":   "text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400",
  "Validée":    "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Livré":      "text-slate-700 bg-slate-100 dark:bg-slate-700 dark:text-slate-300",
  "En attente": "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
  "Annulée":    "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400",
}

const statuses = ["Tous les statuts", "En cours", "Validée", "Livré", "En attente", "Annulée"]

export default function ClientRequests() {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("Tous les statuts")

  const q = search.toLowerCase()
  const filtered = allRequests.filter(r => {
    const matchSearch = r.title.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.type.toLowerCase().includes(q)
    const matchStatus = status === "Tous les statuts" || r.status === status
    return matchSearch && matchStatus
  })

  return (
    <DashboardLayout role="client" navItems={clientNav} pageTitle="Mes Demandes">
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-slate-500 dark:text-slate-400 text-sm">{filtered.length} demande{filtered.length !== 1 ? "s" : ""}</p>
          <Link to="/client/requests/new" className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white text-sm font-semibold rounded-lg hover:bg-cyan-700 transition-colors">
            <span className="material-symbols-outlined text-[18px]">add</span>Nouvelle demande
          </Link>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-600"
              placeholder="Rechercher une demande…"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            {statuses.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                {["Référence", "Titre", "Type", "Budget", "Date", "Statut", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{r.id}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white max-w-[200px] truncate">{r.title}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{r.type}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">{r.budget}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{r.date}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyle[r.status]}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/client/requests/${r.id}`} className="text-cyan-600 hover:text-cyan-700 text-xs font-medium">Voir →</Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">
                    Aucune demande ne correspond à la recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  )
}
