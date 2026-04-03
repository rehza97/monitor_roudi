import { useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { engineerNav } from "@/lib/nav"
import type { StackServiceRow } from "@/data/schema"
import { stackServices } from "@/data/seed"

type Service = StackServiceRow

const statusColors: Record<string, string> = {
  "Opérationnel": "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
  "Dégradé":      "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
  "Hors ligne":   "text-rose-600 bg-rose-50 dark:bg-rose-900/20",
}
const statusDot: Record<string, string> = {
  "Opérationnel": "bg-emerald-500",
  "Dégradé":      "bg-amber-500 animate-pulse",
  "Hors ligne":   "bg-rose-500",
}

type ActionState = "idle" | "loading" | "done"

function ServiceDetailModal({ service, onClose, onRestart }: { service: Service; onClose: () => void; onRestart: () => void }) {
  const [restartState, setRestartState] = useState<ActionState>("idle")

  function handleRestart() {
    setRestartState("loading")
    setTimeout(() => { setRestartState("done"); onRestart() }, 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">{service.name}</h3>
            <span className="text-xs text-slate-400">{service.env}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="space-y-3 mb-5">
          {[
            { label: "Statut",   value: service.status  },
            { label: "Uptime",   value: service.uptime  },
            { label: "Latence",  value: service.latency },
            { label: "CPU",      value: `${service.cpu}%` },
            { label: "Mémoire",  value: `${service.mem}%` },
          ].map(r => (
            <div key={r.label} className="flex justify-between text-sm">
              <span className="text-slate-500">{r.label}</span>
              <span className="font-medium text-slate-900 dark:text-white">{r.value}</span>
            </div>
          ))}
        </div>

        {/* CPU bar */}
        <div className="mb-2">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>CPU</span><span>{service.cpu}%</span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${service.cpu > 80 ? "bg-rose-500" : service.cpu > 60 ? "bg-amber-500" : "bg-blue-500"}`}
              style={{ width: `${service.cpu}%` }}
            />
          </div>
        </div>
        <div className="mb-5">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Mémoire</span><span>{service.mem}%</span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${service.mem > 80 ? "bg-rose-500" : service.mem > 60 ? "bg-amber-500" : "bg-indigo-500"}`}
              style={{ width: `${service.mem}%` }}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Fermer
          </button>
          <button
            onClick={handleRestart}
            disabled={restartState !== "idle"}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-60 ${
              restartState === "done" ? "bg-emerald-600" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {restartState === "loading" ? "hourglass_empty" : restartState === "done" ? "check_circle" : "restart_alt"}
            </span>
            {restartState === "loading" ? "Redémarrage…" : restartState === "done" ? "Redémarré" : "Redémarrer"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EngineerMonitoring() {
  const [services, setServices]   = useState<Service[]>(() => [...stackServices])
  const [selected, setSelected]   = useState<Service | null>(null)
  const [refreshing, setRefresh]  = useState(false)
  const [lastRefresh, setLast]    = useState<string | null>(null)

  function handleRefresh() {
    setRefresh(true)
    setTimeout(() => {
      setRefresh(false)
      setLast(new Date().toLocaleTimeString("fr-DZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" }))
    }, 1200)
  }

  function handleRestart(name: string) {
    setServices(prev => prev.map(s =>
      s.name === name ? { ...s, status: "Opérationnel", latency: `${Math.floor(Math.random() * 50 + 20)}ms`, cpu: Math.floor(Math.random() * 30 + 10) } : s
    ))
    setSelected(null)
  }

  return (
    <DashboardLayout role="engineer" navItems={engineerNav} pageTitle="Monitoring">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Monitoring</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              {lastRefresh ? `Dernière mise à jour : ${lastRefresh}` : "État en temps réel de vos services."}
            </p>
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

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Services actifs",  value: `${services.filter(s => s.status === "Opérationnel").length}/${services.length}`, icon: "dns",        color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-900/20" },
            { label: "Uptime moyen",     value: "99.5%",                                                                          icon: "monitoring", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
            { label: "Alertes actives",  value: String(services.filter(s => s.status === "Dégradé" || s.status === "Hors ligne").length), icon: "warning", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
            { label: "Latence moyenne",  value: "76ms",                                                                          icon: "speed",      color: "text-indigo-600",  bg: "bg-indigo-50 dark:bg-indigo-900/20" },
          ].map(k => (
            <div key={k.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
              <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${k.bg}`}>
                <span className={`material-symbols-outlined text-[20px] ${k.color}`}>{k.icon}</span>
              </div>
              <div>
                <p className={`text-xl font-black ${k.color}`}>{k.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{k.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Services */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">Services</h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Mise à jour en direct
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {services.map(s => (
              <div
                key={s.name}
                onClick={() => setSelected(s)}
                className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
              >
                <span className={`size-2.5 rounded-full shrink-0 ${statusDot[s.status]}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900 dark:text-white text-sm">{s.name}</p>
                    <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{s.env}</span>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[s.status]}`}>{s.status}</span>
                <div className="hidden md:flex items-center gap-6 text-xs text-slate-500">
                  <span>↑ {s.uptime}</span>
                  <span>{s.latency}</span>
                  <div className="flex items-center gap-1 w-24">
                    <span className="text-[11px]">CPU</span>
                    <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${s.cpu > 80 ? "bg-rose-500" : "bg-blue-500"}`} style={{ width: `${s.cpu}%` }} />
                    </div>
                    <span className="text-[11px] w-7 text-right">{s.cpu}%</span>
                  </div>
                  <div className="flex items-center gap-1 w-24">
                    <span className="text-[11px]">MEM</span>
                    <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${s.mem > 70 ? "bg-amber-500" : "bg-indigo-500"}`} style={{ width: `${s.mem}%` }} />
                    </div>
                    <span className="text-[11px] w-7 text-right">{s.mem}%</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[18px] text-slate-400 shrink-0">chevron_right</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selected && (
        <ServiceDetailModal
          service={selected}
          onClose={() => setSelected(null)}
          onRestart={() => handleRestart(selected.name)}
        />
      )}
    </DashboardLayout>
  )
}
