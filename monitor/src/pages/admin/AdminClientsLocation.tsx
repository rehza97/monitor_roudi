import { useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import type { AdminMapClientRow } from "@/data/schema"
import { adminMapClients } from "@/data/seed"

type Client = AdminMapClientRow

const clients = adminMapClients

export default function AdminClientsLocation() {
  const [selected, setSelected] = useState<Client | null>(null)
  const [search, setSearch]     = useState("")

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.city.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Localisation des Clients">
      <div className="flex h-[calc(100vh-64px)]">
        {/* Map area */}
        <div className="flex-1 relative bg-slate-200 dark:bg-slate-800 overflow-hidden">
          {/* Algerian map background placeholder */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-[80px] block mb-2">map</span>
              <p className="text-slate-400 dark:text-slate-500 text-sm">Algérie — Carte interactive</p>
              <p className="text-slate-300 dark:text-slate-600 text-xs">Intégrer Leaflet.js ici</p>
            </div>
          </div>

          {/* Markers */}
          {clients.map(c => (
            <button
              key={c.name}
              onClick={() => setSelected(selected?.name === c.name ? null : c)}
              className="absolute -translate-x-1/2 -translate-y-full group"
              style={{ top: `${c.top}%`, left: `${c.left}%` }}
            >
              <div className={`size-9 rounded-full border-2 border-white shadow-lg flex items-center justify-center transition-transform group-hover:scale-110 ${
                selected?.name === c.name ? "bg-white ring-2 ring-[#db143c] scale-125" : c.status === "Actif" ? "bg-[#db143c]" : "bg-slate-400"
              }`}>
                <span className={`material-symbols-outlined text-[16px] ${selected?.name === c.name ? "text-[#db143c]" : "text-white"}`}>location_on</span>
              </div>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                <div className="bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-slate-400">{c.city}</p>
                </div>
              </div>
            </button>
          ))}

          {/* Selected client popup */}
          {selected && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-4 min-w-[220px]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-full bg-[#db143c] flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {selected.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{selected.name}</p>
                    <p className="text-xs text-slate-400">{selected.city}</p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 shrink-0">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-slate-400">{selected.coords}</span>
                <span className={`font-semibold px-2 py-0.5 rounded-full ${selected.status === "Actif" ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400" : "text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-400"}`}>
                  {selected.status}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Client list */}
        <div className="w-72 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">search</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#db143c]"
                placeholder="Rechercher un client…"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map(c => (
              <button
                key={c.name}
                onClick={() => setSelected(selected?.name === c.name ? null : c)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${selected?.name === c.name ? "bg-rose-50 dark:bg-rose-900/10" : ""}`}
              >
                <div className="size-9 rounded-full bg-[#db143c] flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {c.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.city} · {c.coords}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${c.status === "Actif" ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400" : "text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-400"}`}>
                  {c.status}
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-4 py-8 text-sm text-center text-slate-400">Aucun client trouvé.</p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
