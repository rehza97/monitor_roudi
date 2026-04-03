import { useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import { adminMonitoringApps } from "@/data/seed"

type App = { name: string; client: string; env: string; cpu: number; ram: number; requests: string; status: string }
type ActionState = "idle" | "loading" | "done"

const statusConfig: Record<string, { dot: string; label: string; badge: string }> = {
  healthy: { dot: "bg-emerald-500",            label: "OK",         badge: "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400" },
  warning: { dot: "bg-amber-500 animate-pulse",label: "Alerte",     badge: "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400"         },
  down:    { dot: "bg-rose-500",               label: "Hors ligne", badge: "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400"             },
}

function AppDetailModal({ app, onClose, onRestart }: { app: App; onClose: () => void; onRestart: () => void }) {
  const [state, setState] = useState<ActionState>("idle")

  function handleRestart() {
    setState("loading")
    setTimeout(() => { setState("done"); onRestart() }, 1500)
  }

  const cfg = statusConfig[app.status]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className={`size-3 rounded-full shrink-0 ${cfg.dot}`} />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">{app.name}</h3>
              <p className="text-xs text-slate-400">{app.client} · {app.env}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="space-y-3 mb-5">
          {[
            { label: "Statut",       value: cfg.label      },
            { label: "CPU",          value: `${app.cpu}%`  },
            { label: "RAM",          value: `${app.ram}%`  },
            { label: "Req/min",      value: app.requests   },
            { label: "Environnement",value: app.env        },
          ].map(r => (
            <div key={r.label} className="flex justify-between text-sm">
              <span className="text-slate-500">{r.label}</span>
              <span className="font-medium text-slate-900 dark:text-white">{r.value}</span>
            </div>
          ))}
        </div>

        {[{ label: "CPU", val: app.cpu }, { label: "RAM", val: app.ram }].map(b => (
          <div key={b.label} className="mb-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{b.label}</span><span>{b.val}%</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${b.val === 0 ? "bg-slate-300" : b.val > 80 ? "bg-rose-500" : b.val > 60 ? "bg-amber-500" : "bg-blue-500"}`}
                style={{ width: `${b.val}%` }}
              />
            </div>
          </div>
        ))}

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
            Fermer
          </button>
          <button
            onClick={handleRestart}
            disabled={state !== "idle"}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-60 ${
              state === "done" ? "bg-emerald-600" : "bg-[#db143c] hover:opacity-90"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {state === "loading" ? "hourglass_empty" : state === "done" ? "check_circle" : "restart_alt"}
            </span>
            {state === "loading" ? "Redémarrage…" : state === "done" ? "Redémarré" : "Redémarrer"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminMonitoring() {
  const [apps, setApps]       = useState<App[]>(() => [...adminMonitoringApps])
  const [selected, setSelected] = useState<App | null>(null)
  const [refreshing, setRefresh] = useState(false)

  function handleRefresh() {
    setRefresh(true)
    setTimeout(() => setRefresh(false), 1200)
  }

  function handleRestart(name: string) {
    setApps(prev => prev.map(a =>
      a.name === name ? { ...a, status: "healthy", cpu: Math.floor(Math.random() * 20 + 5), ram: Math.floor(Math.random() * 30 + 15), requests: "0.5k/m" } : a
    ))
    setSelected(null)
  }

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Monitoring des Applications">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Monitoring</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">État en temps réel des applications clients.</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 transition-colors"
          >
            <span className={`material-symbols-outlined text-[18px] ${refreshing ? "animate-spin" : ""}`}>refresh</span>
            {refreshing ? "Actualisation…" : "Actualiser"}
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Apps actives",  value: String(apps.filter(a => a.status === "healthy").length), icon: "check_circle", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
            { label: "Alertes",       value: String(apps.filter(a => a.status === "warning").length),  icon: "warning",      color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-900/20"   },
            { label: "Hors ligne",    value: String(apps.filter(a => a.status === "down").length),     icon: "cancel",       color: "text-rose-600",    bg: "bg-rose-50 dark:bg-rose-900/20"     },
            { label: "Requêtes/min",  value: "4.9k",                                                    icon: "speed",        color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-900/20"     },
          ].map(k => (
            <div key={k.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className={`size-10 rounded-lg ${k.bg} ${k.color} flex items-center justify-center mb-3`}>
                <span className="material-symbols-outlined text-[20px]">{k.icon}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{k.value}</p>
              <p className="text-sm text-slate-500 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">État des applications</h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              En direct
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>{["Application", "Client", "Env.", "CPU", "RAM", "Req/min", "Statut", ""].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {apps.map(a => {
                const cfg = statusConfig[a.status]
                return (
                  <tr
                    key={a.name}
                    onClick={() => setSelected(a)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`size-2 rounded-full shrink-0 ${cfg.dot}`} />
                        <span className="font-medium text-slate-900 dark:text-white">{a.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{a.client}</td>
                    <td className="px-5 py-3.5 text-slate-500">{a.env}</td>
                    <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">{a.cpu}%</td>
                    <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">{a.ram}%</td>
                    <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">{a.requests}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="material-symbols-outlined text-[18px] text-slate-400">chevron_right</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <AppDetailModal
          app={selected}
          onClose={() => setSelected(null)}
          onRestart={() => handleRestart(selected.name)}
        />
      )}
    </DashboardLayout>
  )
}
