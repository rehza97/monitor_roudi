import { useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import { Link } from "react-router-dom"

/* MOCK rows — disabled
const allRequests = [ ... ]
*/
const allRequests: {
  id: string
  client: string
  type: string
  budget: string
  status: string
  date: string
}[] = []

const statusColor: Record<string, string> = {
  "En attente": "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
  "Validée":    "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400",
  "En cours":   "text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400",
  "Rejetée":    "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400",
}

const statuses = ["Tous les statuts", "En attente", "Validée", "En cours", "Rejetée"]

export default function AdminRequests() {
  const [search, setSearch]   = useState("")
  const [status, setStatus]   = useState("Tous les statuts")

  const q = search.toLowerCase()
  const filtered = allRequests.filter(r => {
    const matchSearch = r.client.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.type.toLowerCase().includes(q)
    const matchStatus = status === "Tous les statuts" || r.status === status
    return matchSearch && matchStatus
  })

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Demandes">
      <div className="p-6 space-y-5">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#db143c]"
              placeholder="Rechercher par client, référence, type…"
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
            className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none"
          >
            {statuses.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500">{filtered.length} demande{filtered.length !== 1 ? "s" : ""}</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                {["Réf.", "Client", "Type", "Budget", "Date", "Statut", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{r.id}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{r.client}</td>
                  <td className="px-4 py-3 text-slate-500">{r.type}</td>
                  <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{r.budget}</td>
                  <td className="px-4 py-3 text-slate-500">{r.date}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[r.status]}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/admin/requests/${r.id}`} className="text-xs text-[#db143c] font-medium hover:opacity-80">Traiter →</Link>
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
