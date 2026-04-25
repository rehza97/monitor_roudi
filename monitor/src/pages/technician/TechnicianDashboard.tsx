import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { technicianNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import { collection, onSnapshot, query, where } from "@/lib/firebase-firestore"
import { COLLECTIONS } from "@/data/schema"
import type { FirestoreSupportTicket } from "@/data/schema"
import { canTechnicianAccessTicket } from "@/lib/access-control"
import { formatFirestoreDateTime, firestoreToMillis } from "@/lib/utils"

interface TicketDoc extends FirestoreSupportTicket {
  id: string
}

const STATUS_COLORS: Record<string, string> = {
  "Ouvert":   "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "En cours": "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "Résolu":   "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "Fermé":    "bg-slate-500/15 text-slate-400 border-slate-500/30",
}

const PRIORITY_COLORS: Record<string, string> = {
  "Urgente": "bg-rose-500/15 text-rose-400 border-rose-500/30",
  "Haute":   "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "Normale": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "Basse":   "bg-slate-500/15 text-slate-400 border-slate-500/30",
}

function isSameDay(ms: number, ref: Date): boolean {
  const d = new Date(ms)
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  )
}

export default function TechnicianDashboard() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState<TicketDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db || !user?.id) {
      setLoading(false)
      return
    }

    let assignedRows: TicketDoc[] = []
    let unassignedRows: TicketDoc[] = []
    let assignedLoaded = false
    let unassignedLoaded = false
    const sync = () => {
      if (!assignedLoaded || !unassignedLoaded) return
      const byId = new Map<string, TicketDoc>()
      assignedRows.forEach((ticket) => byId.set(ticket.id, ticket))
      unassignedRows.forEach((ticket) => byId.set(ticket.id, ticket))
      setTickets(
        Array.from(byId.values())
          .filter((t) => canTechnicianAccessTicket(t, user.id))
          .sort((a, b) => (firestoreToMillis(b.createdAt) ?? 0) - (firestoreToMillis(a.createdAt) ?? 0))
          .slice(0, 50),
      )
      setLoading(false)
    }

    const assignedQ = query(
      collection(db, COLLECTIONS.supportTickets),
      where("assignedToId", "==", user.id),
    )
    const unassignedQ = query(
      collection(db, COLLECTIONS.supportTickets),
      where("assignedToId", "==", null),
    )
    const unsubAssigned = onSnapshot(assignedQ, (snap) => {
      assignedRows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as FirestoreSupportTicket) }))
      assignedLoaded = true
      sync()
    })
    const unsubUnassigned = onSnapshot(unassignedQ, (snap) => {
      unassignedRows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as FirestoreSupportTicket) }))
      unassignedLoaded = true
      sync()
    })
    return () => {
      unsubAssigned()
      unsubUnassigned()
    }
  }, [user?.id])

  const today = new Date()
  const todayTickets = tickets.filter((t) => {
    const ms = firestoreToMillis(t.createdAt)
    return ms !== null && isSameDay(ms, today)
  })
  const enCours   = tickets.filter((t) => t.status === "En cours")
  const enAttente = tickets.filter((t) => t.status === "Ouvert")
  const resolues  = tickets.filter((t) => t.status === "Résolu")

  const kpis = [
    { label: "Interventions aujourd'hui", value: todayTickets.length, icon: "home_repair_service", color: "text-rose-400",    bg: "bg-rose-500/10"    },
    { label: "En cours",                  value: enCours.length,      icon: "autorenew",           color: "text-amber-400",   bg: "bg-amber-500/10"   },
    { label: "En attente",                value: enAttente.length,    icon: "hourglass_empty",     color: "text-blue-400",    bg: "bg-blue-500/10"    },
    { label: "Résolues",                  value: resolues.length,     icon: "check_circle",        color: "text-emerald-400", bg: "bg-emerald-500/10" },
  ]

  const quickLinks = [
    { label: "Mes tickets", icon: "home_repair_service", to: "/technician/tickets",  color: "#db143c" },
    { label: "Calendrier",  icon: "calendar_month",      to: "/technician/calendar", color: "#f9bc06" },
    { label: "Inventaire",  icon: "inventory_2",         to: "/technician/inventory",color: "#2463eb" },
    { label: "Clients",     icon: "group",               to: "/technician/clients",  color: "#0891b2" },
  ]

  return (
    <DashboardLayout role="technician" navItems={technicianNav} pageTitle="Tableau de bord">
      <div className="p-6 space-y-6">
        {/* Welcome banner */}
        <div
          className="rounded-2xl px-6 py-5 flex items-center gap-4"
          style={{ background: "linear-gradient(135deg, #db143c22 0%, #db143c08 100%)" }}
        >
          <div
            className="size-12 rounded-xl flex items-center justify-center text-white shrink-0"
            style={{ backgroundColor: "#db143c" }}
          >
            <span className="material-symbols-outlined text-[24px]">build</span>
          </div>
          <div>
            <p className="text-white text-lg font-bold">
              Bonjour, {user?.name ?? "Technicien"} 👋
            </p>
            <p className="text-slate-400 text-sm mt-0.5">
              {today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* KPI cards */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((k) => (
              <div
                key={k.label}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4"
              >
                <div className={`size-11 rounded-xl flex items-center justify-center ${k.bg}`}>
                  <span className={`material-symbols-outlined text-[22px] ${k.color}`}>{k.icon}</span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{k.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{k.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's interventions */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Interventions du jour</h2>
              <Link to="/technician/tickets" className="text-xs font-medium" style={{ color: "#db143c" }}>
                Voir tout →
              </Link>
            </div>
            {loading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
            ) : todayTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <span className="material-symbols-outlined text-[40px] mb-2 opacity-40">event_available</span>
                <p className="text-sm">Aucune intervention aujourd'hui</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {todayTickets.map((t) => (
                  <Link
                    key={t.id}
                    to={`/technician/tickets/${t.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{t.subject}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {t.organizationId ?? "—"} · {formatFirestoreDateTime(t.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_COLORS[t.priority] ?? ""}`}>
                        {t.priority}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[t.status] ?? ""}`}>
                        {t.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick links */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Accès rapide</h2>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {quickLinks.map((ql) => (
                <Link
                  key={ql.to}
                  to={ql.to}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors text-center"
                >
                  <div
                    className="size-10 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: ql.color }}
                  >
                    <span className="material-symbols-outlined text-[20px]">{ql.icon}</span>
                  </div>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{ql.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
