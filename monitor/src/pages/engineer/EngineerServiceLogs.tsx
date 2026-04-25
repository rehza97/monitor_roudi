import { useEffect, useRef, useState } from "react"
import { useParams, Link } from "react-router-dom"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { engineerNav } from "@/lib/nav"
import { db } from "@/config/firebase"
import { COLLECTIONS, type FirestoreServiceLog } from "@/data/schema"
import {
  addDoc, collection, doc, getDoc, onSnapshot,
  orderBy, query, serverTimestamp, where, limit,
} from "@/lib/firebase-firestore"

type LogLevel = "all" | "error" | "warning" | "info" | "debug"

type LogRow = FirestoreServiceLog & { id: string; ts: number }

const LEVEL_STYLE: Record<string, string> = {
  error:   "text-rose-400",
  warning: "text-amber-400",
  info:    "text-blue-400",
  debug:   "text-slate-500",
}
const LEVEL_BADGE: Record<string, string> = {
  error:   "text-rose-600 bg-rose-50 dark:bg-rose-900/20",
  warning: "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
  info:    "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
  debug:   "text-slate-500 bg-slate-100 dark:bg-slate-800",
}

function toMs(value: unknown): number {
  if (!value) return 0
  if (typeof value === "object" && value !== null && "toMillis" in value) {
    return (value as { toMillis: () => number }).toMillis()
  }
  return 0
}

export default function EngineerServiceLogs() {
  const { serviceId } = useParams<{ serviceId: string }>()
  const [serviceName, setServiceName] = useState("")
  const [logs, setLogs]               = useState<LogRow[]>([])
  const [loading, setLoading]         = useState(true)
  const [levelFilter, setLevelFilter] = useState<LogLevel>("all")
  const [search, setSearch]           = useState("")
  const [simulating, setSimulating]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!db || !serviceId) { setLoading(false); return }

    getDoc(doc(db, COLLECTIONS.stackServices, serviceId))
      .then((snap) => {
        if (snap.exists()) {
          const d = snap.data() as Record<string, unknown>
          setServiceName(typeof d.name === "string" ? d.name : serviceId)
        }
      })
      .catch(() => {})

    const q = query(
      collection(db, COLLECTIONS.serviceLogs),
      where("serviceId", "==", serviceId),
      orderBy("createdAt", "desc"),
      limit(300),
    )

    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as FirestoreServiceLog),
        ts: toMs(d.data().createdAt),
      }))
      setLogs(rows)
      setLoading(false)
    })

    return unsub
  }, [serviceId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs.length])

  async function simulateLog() {
    if (!db || !serviceId || simulating) return
    setSimulating(true)
    const levels: FirestoreServiceLog["level"][] = ["info", "info", "info", "warning", "error", "debug"]
    const messages = [
      "Health check passed — all endpoints nominal",
      "Received 142 requests in the last 60s",
      "Cache hit ratio: 94.2%",
      "Response time p95: 312ms — within threshold",
      "Database connection pool: 8/20 connections active",
      "Warning: CPU usage reached 78% — monitoring",
      "Error: timeout connecting to downstream service auth-api",
      "Deployment artifact validated",
      "Backup snapshot completed successfully",
    ]
    const level = levels[Math.floor(Math.random() * levels.length)]
    const message = messages[Math.floor(Math.random() * messages.length)]
    await addDoc(collection(db, COLLECTIONS.serviceLogs), {
      serviceId,
      serviceName,
      level,
      message,
      source: "agent",
      createdAt: serverTimestamp(),
    } satisfies Omit<FirestoreServiceLog, "id">)
    setSimulating(false)
  }

  const filtered = logs.filter((l) => {
    const matchLevel = levelFilter === "all" || l.level === levelFilter
    const matchSearch = !search || l.message.toLowerCase().includes(search.toLowerCase()) || (l.source ?? "").toLowerCase().includes(search.toLowerCase())
    return matchLevel && matchSearch
  })

  const counts = {
    all: logs.length,
    error: logs.filter((l) => l.level === "error").length,
    warning: logs.filter((l) => l.level === "warning").length,
    info: logs.filter((l) => l.level === "info").length,
    debug: logs.filter((l) => l.level === "debug").length,
  }

  return (
    <DashboardLayout role="engineer" navItems={engineerNav} pageTitle="Logs">
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link to="/engineer/monitoring" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </Link>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Logs — {serviceName || serviceId}
              </h2>
            </div>
            <div className="flex items-center gap-1.5 ml-7 text-xs text-slate-500">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Temps réel · {counts.all} entrées
            </div>
          </div>
          <button
            onClick={() => void simulateLog()}
            disabled={simulating}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">{simulating ? "hourglass_empty" : "add"}</span>
            Simuler un log
          </button>
        </div>

        {/* Level tabs */}
        <div className="flex flex-wrap gap-2">
          {(["all", "error", "warning", "info", "debug"] as LogLevel[]).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                levelFilter === lvl
                  ? lvl === "all"
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent"
                    : `${LEVEL_BADGE[lvl]} border-current`
                  : "border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {lvl.toUpperCase()}
              <span className="tabular-nums">{counts[lvl]}</span>
            </button>
          ))}
          <div className="ml-auto relative">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrer les messages…"
              className="h-8 pl-8 pr-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
            />
          </div>
        </div>

        {/* Terminal */}
        <div className="bg-slate-950 rounded-xl border border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700 bg-slate-900">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="size-3 rounded-full bg-rose-500" />
                <span className="size-3 rounded-full bg-amber-400" />
                <span className="size-3 rounded-full bg-emerald-400" />
              </div>
              <span className="text-slate-400 text-xs font-mono ml-2">{serviceName || serviceId} · stdout</span>
            </div>
            <span className="text-xs text-slate-500">{filtered.length} lignes affichées</span>
          </div>

          <div className="p-4 min-h-[480px] max-h-[600px] overflow-y-auto font-mono text-xs leading-relaxed">
            {loading && (
              <p className="text-slate-500 animate-pulse">Chargement des logs…</p>
            )}
            {!loading && filtered.length === 0 && (
              <p className="text-slate-600">Aucun log. Cliquez sur "Simuler un log" pour en générer.</p>
            )}
            {[...filtered].reverse().map((log) => {
              const time = log.ts
                ? new Date(log.ts).toLocaleTimeString("fr-DZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                : "??:??:??"
              return (
                <div key={log.id} className="flex items-start gap-3 py-0.5 hover:bg-white/5 px-1 rounded group">
                  <span className="text-slate-600 shrink-0 tabular-nums">{time}</span>
                  <span className={`uppercase shrink-0 font-bold w-7 ${LEVEL_STYLE[log.level] ?? LEVEL_STYLE.info}`}>
                    {log.level === "warning" ? "WARN" : log.level.slice(0, 4).toUpperCase()}
                  </span>
                  {log.source && (
                    <span className="text-slate-600 shrink-0">[{log.source}]</span>
                  )}
                  <span className="text-slate-300 break-all">{log.message}</span>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
