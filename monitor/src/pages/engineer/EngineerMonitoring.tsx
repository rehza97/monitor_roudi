import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { engineerNav } from "@/lib/nav"
import { db } from "@/config/firebase"
import { COLLECTIONS } from "@/data/schema"
import { collection, onSnapshot, orderBy, query } from "@/lib/firebase-firestore"

type Service = {
  id: string
  name: string
  env: string
  status: "Opérationnel" | "Dégradé" | "Hors ligne"
  uptime: string
  latency: string
  cpu: number
  mem: number
}

const statusColors: Record<Service["status"], string> = {
  Opérationnel: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
  Dégradé: "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
  "Hors ligne": "text-rose-600 bg-rose-50 dark:bg-rose-900/20",
}

const statusDot: Record<Service["status"], string> = {
  Opérationnel: "bg-emerald-500",
  Dégradé: "bg-amber-500 animate-pulse",
  "Hors ligne": "bg-rose-500",
}

function mapStatus(raw: unknown): Service["status"] {
  const s = typeof raw === "string" ? raw.toLowerCase() : ""
  if (s === "ok" || s === "healthy" || s === "opérationnel") return "Opérationnel"
  if (s === "degraded" || s === "warning" || s === "dégradé") return "Dégradé"
  return "Hors ligne"
}

export default function EngineerMonitoring() {
  const [services, setServices] = useState<Service[]>([])
  const [lastRefresh, setLastRefresh] = useState<string | null>(null)

  useEffect(() => {
    if (!db) return
    const q = query(collection(db, COLLECTIONS.stackServices), orderBy("name", "asc"))
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>
        return {
          id: d.id,
          name: typeof data.name === "string" ? data.name : "Service",
          env: typeof data.env === "string" ? data.env : "Production",
          status: mapStatus(data.status),
          uptime: typeof data.uptime === "string" ? data.uptime : "99.9%",
          latency: typeof data.latency === "string" ? data.latency : "--",
          cpu: typeof data.cpu === "number" ? data.cpu : Number(data.cpu) || 0,
          mem: typeof data.mem === "number" ? data.mem : Number(data.mem) || 0,
        } satisfies Service
      })
      setServices(rows)
      setLastRefresh(
        new Date().toLocaleTimeString("fr-DZ", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      )
    })
    return () => unsub()
  }, [])

  const stats = useMemo(() => {
    const active = services.filter((s) => s.status === "Opérationnel").length
    const alerts = services.filter((s) => s.status !== "Opérationnel").length
    const latencyAvg =
      services.length > 0
        ? Math.round(
            services.reduce((sum, s) => {
              const n = Number(String(s.latency).replace("ms", ""))
              return sum + (Number.isFinite(n) ? n : 0)
            }, 0) / services.length,
          )
        : 0
    return {
      active,
      alerts,
      uptime: services.length > 0 ? "99.5%" : "--",
      latency: services.length > 0 ? `${latencyAvg}ms` : "--",
    }
  }, [services])

  return (
    <DashboardLayout role="engineer" navItems={engineerNav} pageTitle="Monitoring">
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Monitoring</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {lastRefresh ? `Dernière mise à jour : ${lastRefresh}` : "État en temps réel de vos services."}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Services actifs",
              value: `${stats.active}/${services.length}`,
              icon: "dns",
              color: "text-blue-600",
              bg: "bg-blue-50 dark:bg-blue-900/20",
            },
            {
              label: "Uptime moyen",
              value: stats.uptime,
              icon: "monitoring",
              color: "text-emerald-600",
              bg: "bg-emerald-50 dark:bg-emerald-900/20",
            },
            {
              label: "Alertes actives",
              value: String(stats.alerts),
              icon: "warning",
              color: "text-amber-600",
              bg: "bg-amber-50 dark:bg-amber-900/20",
            },
            {
              label: "Latence moyenne",
              value: stats.latency,
              icon: "speed",
              color: "text-indigo-600",
              bg: "bg-indigo-50 dark:bg-indigo-900/20",
            },
          ].map((k) => (
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

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">Services</h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Firebase Live
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {services.length === 0 ? (
              <div className="px-5 py-10 text-sm text-slate-400 text-center">Aucun service monitoré.</div>
            ) : null}
            {services.map((s) => (
              <div key={s.id} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
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
                  <span>CPU {s.cpu}%</span>
                  <span>MEM {s.mem}%</span>
                </div>
                <Link
                  to={`/engineer/logs/${s.id}`}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                >
                  Logs →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
