import { useState, useEffect, useRef } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { clientNav } from "@/lib/nav"
import { clientMonitoringServices } from "@/data/seed"

type Service = { name: string; env: string; status: string; cpu: number; ram: number; uptime: string; version: string }

const statusDot: Record<string, string> = {
  running: "bg-emerald-500",
  stopped: "bg-slate-400",
  warning: "bg-amber-500 animate-pulse",
}

/* MOCK logs terminal — désactivés */
const LOG_LINES: string[] = []

function ServiceModal({ service, onClose }: { service: Service; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className={`size-3 rounded-full shrink-0 ${statusDot[service.status]}`} />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">{service.name}</h3>
              <p className="text-xs text-slate-400">{service.env} · {service.version}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="space-y-3 mb-5">
          {[
            { label: "Statut",        value: service.status === "running" ? "En ligne" : "Arrêté" },
            { label: "CPU",           value: `${service.cpu}%` },
            { label: "RAM",           value: `${service.ram}%` },
            { label: "Uptime",        value: service.uptime },
            { label: "Environnement", value: service.env },
            { label: "Version",       value: service.version },
          ].map(r => (
            <div key={r.label} className="flex justify-between text-sm">
              <span className="text-slate-500">{r.label}</span>
              <span className="font-medium text-slate-900 dark:text-white">{r.value}</span>
            </div>
          ))}
        </div>

        {[{ label: "CPU", val: service.cpu }, { label: "RAM", val: service.ram }].map(b => (
          <div key={b.label} className="mb-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{b.label}</span><span>{b.val}%</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${b.val === 0 ? "bg-slate-300" : b.val > 80 ? "bg-rose-500" : b.val > 60 ? "bg-amber-500" : "bg-cyan-500"}`}
                style={{ width: `${b.val}%` }}
              />
            </div>
          </div>
        ))}

        <button
          onClick={onClose}
          className="w-full mt-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Fermer
        </button>
      </div>
    </div>
  )
}

export default function ClientMonitoring() {
  const [selected, setSelected] = useState<Service | null>(null)
  const [logs,     setLogs]     = useState<string[]>(LOG_LINES)
  const logsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const actions = [
      "GET /api/products 200 9ms",
      "Heartbeat OK",
      "POST /api/events 201 18ms",
      "GET /api/stats 200 22ms",
      "Auth refresh OK",
    ]
    const apps = clientMonitoringServices.map(s => s.name)
    const interval = setInterval(() => {
      const now = new Date()
      const t = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`
      const app    = apps[Math.floor(Math.random() * apps.length)]
      const action = actions[Math.floor(Math.random() * actions.length)]
      const line   = `[${t}] ${app} — ${action}`
      setLogs(prev => [...prev.slice(-19), line])
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight
  }, [logs])

  return (
    <DashboardLayout role="client" navItems={clientNav} pageTitle="Monitoring">
      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Apps actives", value: "3",    icon: "check_circle", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
            { label: "CPU moyen",    value: "15%",   icon: "memory",       color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-900/20" },
            { label: "RAM moyenne",  value: "38%",   icon: "storage",      color: "text-indigo-600",  bg: "bg-indigo-50 dark:bg-indigo-900/20" },
            { label: "Uptime",       value: "99.6%", icon: "timer",        color: "text-cyan-600",    bg: "bg-cyan-50 dark:bg-cyan-900/20" },
          ].map((k) => (
            <div key={k.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className={`size-10 rounded-lg ${k.bg} ${k.color} flex items-center justify-center mb-3`}>
                <span className="material-symbols-outlined text-[20px]">{k.icon}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{k.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Services */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">Services déployés</h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              En direct
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {clientMonitoringServices.map((s) => (
              <button
                key={s.name}
                onClick={() => setSelected(s)}
                className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors text-left"
              >
                <div className={`size-2.5 rounded-full shrink-0 ${statusDot[s.status]}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white text-sm">{s.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{s.env} · {s.version}</p>
                </div>
                <div className="hidden md:flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-xs text-slate-400 mb-0.5">CPU</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-300">{s.cpu}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400 mb-0.5">RAM</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-300">{s.ram}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400 mb-0.5">Uptime</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-300">{s.uptime}</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[18px] text-slate-400 shrink-0">chevron_right</span>
              </button>
            ))}
          </div>
        </div>

        {/* Live logs */}
        <div className="bg-slate-900 dark:bg-black rounded-xl border border-slate-700 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="size-3 rounded-full bg-rose-500" />
            <div className="size-3 rounded-full bg-amber-500" />
            <div className="size-3 rounded-full bg-emerald-500" />
            <span className="text-slate-400 text-xs ml-2 font-mono">logs — live</span>
            <span className="ml-auto flex items-center gap-1 text-xs text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              live
            </span>
          </div>
          <div ref={logsRef} className="font-mono text-xs text-emerald-400 space-y-1 max-h-40 overflow-y-auto">
            {logs.map((l, i) => (
              <p key={i}>{l}</p>
            ))}
          </div>
        </div>
      </div>

      {selected && <ServiceModal service={selected} onClose={() => setSelected(null)} />}
    </DashboardLayout>
  )
}
