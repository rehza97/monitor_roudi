import { useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import { activityEvents } from "@/data/seed"

const categories = ["Tous", "Demandes", "Utilisateurs", "Matériels", "Applications", "Finance"]

export default function AdminHistory() {
  const [search,   setSearch]   = useState("")
  const [category, setCategory] = useState("Tous")

  const q = search.toLowerCase()
  const filtered = activityEvents.filter(e => {
    const matchSearch = e.title.toLowerCase().includes(q) || e.actor.toLowerCase().includes(q)
    const matchCat    = category === "Tous" || e.category === category
    return matchSearch && matchCat
  })

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Historique des Activités">
      <div className="p-6 max-w-3xl space-y-5">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#db143c]"
              placeholder="Filtrer les événements…"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none"
          >
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <p className="text-xs text-slate-400">{filtered.length} événement{filtered.length !== 1 ? "s" : ""}</p>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.map((e, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <div className={`size-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center ${e.color} shrink-0`}>
                <span className="material-symbols-outlined text-[18px]">{e.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{e.title}</p>
                <p className="text-xs text-slate-400">{e.actor} · {e.category}</p>
              </div>
              <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">{e.time}</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-5 py-10 text-center text-slate-400 text-sm">
              Aucun événement ne correspond à la recherche.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
