import { useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { technicianNav } from "@/lib/nav"
import type { FieldServiceClientRow } from "@/data/schema"
import { fieldServiceClients } from "@/data/seed"

type Client = FieldServiceClientRow

function ClientModal({ client, onClose }: { client: Client; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center font-bold text-lg">
              {client.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">{client.name}</h3>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${client.status === "Actif" ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" : "text-slate-500 bg-slate-100 dark:bg-slate-800"}`}>
                {client.status}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="space-y-3 text-sm">
          {[
            { icon: "person",             label: "Contact",             value: client.contact },
            { icon: "email",              label: "Email",               value: client.email },
            { icon: "phone",              label: "Téléphone",           value: client.phone },
            { icon: "location_on",        label: "Adresse",             value: client.address },
            { icon: "home_repair_service",label: "Tickets ouverts",     value: String(client.tickets) },
            { icon: "event",              label: "Client depuis",       value: client.since },
            { icon: "update",             label: "Dernière intervention",value: client.lastIntervention },
          ].map(r => (
            <div key={r.icon} className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[18px] text-amber-500 shrink-0 mt-0.5">{r.icon}</span>
              <div className="min-w-0">
                <p className="text-xs text-slate-400">{r.label}</p>
                <p className="font-medium text-slate-900 dark:text-white truncate">{r.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <a
            href={`mailto:${client.email}`}
            className="flex items-center justify-center gap-1.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">email</span>Email
          </a>
          <a
            href={`tel:${client.phone.replace(/\s/g, "")}`}
            className="flex items-center justify-center gap-1.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">call</span>Appeler
          </a>
        </div>
      </div>
    </div>
  )
}

export default function TechnicianClients() {
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Client | null>(null)

  const filtered = fieldServiceClients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.city.toLowerCase().includes(search.toLowerCase()) ||
    c.contact.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <DashboardLayout role="technician" navItems={technicianNav} pageTitle="Clients">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Clients</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{fieldServiceClients.length} clients assignés</p>
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 pl-9 pr-4 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Rechercher…"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  {["Entreprise", "Contact", "Téléphone", "Ville", "Tickets", "Statut", ""].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className="hover:bg-amber-50/50 dark:hover:bg-amber-900/10 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">{c.name}</td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-400">{c.contact}</td>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{c.phone}</td>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{c.city}</td>
                    <td className="px-5 py-4">
                      <span className={`font-bold ${c.tickets > 0 ? "text-amber-600" : "text-slate-400"}`}>{c.tickets}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.status === "Actif" ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" : "text-slate-500 bg-slate-100 dark:bg-slate-800"}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs text-amber-600 font-medium flex items-center gap-0.5">
                        Détails <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selected && <ClientModal client={selected} onClose={() => setSelected(null)} />}
    </DashboardLayout>
  )
}
