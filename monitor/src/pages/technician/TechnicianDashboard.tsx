import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { technicianNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db, isFirebaseConfigured } from "@/config/firebase"
import { collection, onSnapshot, query, where } from "@/lib/firebase-firestore"
import { COLLECTIONS } from "@/data/schema"
import type { FirestoreSupportTicket } from "@/data/schema"
import { canTechnicianAccessTicket } from "@/lib/access-control"
import { firestoreToMillis } from "@/lib/utils"

interface TicketDoc extends FirestoreSupportTicket {
  id: string
}

const STATUS_LABEL: Record<string, string> = {
  Ouvert: "En attente",
  "En cours": "En cours",
  Résolu: "Résolu",
  Fermé: "Fermé",
}

function isSameDay(ms: number, ref: Date): boolean {
  const d = new Date(ms)
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate()
}

export default function TechnicianDashboard() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState<TicketDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db || !user?.id || !isFirebaseConfigured) {
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

    const assignedQ = query(collection(db, COLLECTIONS.supportTickets), where("assignedToId", "==", user.id))
    const unassignedQ = query(collection(db, COLLECTIONS.supportTickets), where("assignedToId", "==", null))

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
  const dateTitle = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(today)

  const todayTickets = tickets.filter((t) => {
    const ms = firestoreToMillis(t.createdAt)
    return ms !== null && isSameDay(ms, today)
  })

  const scheduledToday = tickets.filter((t) => {
    const ms = firestoreToMillis(t.scheduledAt)
    return ms !== null && isSameDay(ms, today)
  })

  const resolues = tickets.filter((t) => t.status === "Résolu")
  const priorityRows = tickets.slice(0, 4)

  const scheduleSlots = useMemo(() => {
    const sorted = [...tickets].sort((a, b) => {
      const ta = firestoreToMillis(a.scheduledAt) ?? firestoreToMillis(a.createdAt) ?? 0
      const tb = firestoreToMillis(b.scheduledAt) ?? firestoreToMillis(b.createdAt) ?? 0
      return ta - tb
    })
    return sorted.slice(0, 5).map((t) => {
      const ms = firestoreToMillis(t.scheduledAt) ?? firestoreToMillis(t.createdAt)
      const timeLabel =
        ms != null
          ? new Date(ms).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
          : "—"
      const active = t.status === "En cours"
      return {
        id: t.id,
        timeLabel,
        title: t.subject || "Intervention",
        subtitle: t.siteAddress ?? t.organizationId ?? "Site client",
        meta: `${STATUS_LABEL[t.status] ?? t.status} · ${t.priority}`,
        active,
      }
    })
  }, [tickets])

  return (
    <DashboardLayout role="technician" navItems={technicianNav} pageTitle="Tableau de bord">
      <div className="p-6 md:p-8 space-y-8 text-slate-900">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-slate-500 text-base">Aperçu de vos tâches et interventions du jour.</p>
            </div>
            <div className="flex gap-3">
              <button type="button" className="flex items-center gap-2 rounded-lg border border-[#3a3527] bg-[#2a261c] px-4 py-2 text-sm text-white transition-colors hover:bg-[#3a3527]">
                <span className="material-symbols-outlined text-sm">filter_list</span>
                Filtres
              </button>
              <Link to="/technician/tickets" className="flex items-center gap-2 bg-[#f9bc06] hover:bg-[#d97706] text-black font-semibold px-4 py-2 rounded-lg text-sm">
                <span className="material-symbols-outlined text-sm">add</span>
                Nouveau Ticket
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 rounded-xl bg-white border border-slate-200">
              <div className="flex justify-between">
                <div className="p-2 rounded-lg bg-orange-100 text-orange-600"><span className="material-symbols-outlined text-[28px]">assignment_ind</span></div>
                <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-full">File</span>
              </div>
              <p className="text-slate-500 text-sm mt-4">Tickets visibles</p>
              <h3 className="text-3xl font-bold">{loading ? "…" : tickets.length}</h3>
            </div>
            <div className="p-6 rounded-xl bg-white border border-slate-200">
              <div className="flex justify-between">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600"><span className="material-symbols-outlined text-[28px]">engineering</span></div>
                <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-full">Créés ce jour</span>
              </div>
              <p className="text-slate-500 text-sm mt-4">Activité aujourd&apos;hui</p>
              <h3 className="text-3xl font-bold">{loading ? "…" : todayTickets.length}</h3>
            </div>
            <div className="p-6 rounded-xl bg-white border border-slate-200">
              <div className="flex justify-between">
                <div className="p-2 rounded-lg bg-[#f9bc06]/20 text-[#d97706]"><span className="material-symbols-outlined text-[28px]">check_circle</span></div>
                <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-full">Pool</span>
              </div>
              <p className="text-slate-500 text-sm mt-4">Créneaux planifiés ce jour</p>
              <h3 className="text-3xl font-bold">{loading ? "…" : scheduledToday.length}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-xl font-bold">Interventions Prioritaires</h3>
                <Link to="/technician/tickets" className="text-sm text-[#f9bc06]">Tout voir</Link>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-xs font-semibold uppercase">Client</th>
                        <th className="px-6 py-4 text-xs font-semibold uppercase">Lieu</th>
                        <th className="px-6 py-4 text-xs font-semibold uppercase">Urgence</th>
                        <th className="px-6 py-4 text-xs font-semibold uppercase">Statut</th>
                        <th className="px-6 py-4 text-xs font-semibold uppercase text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(loading ? [] : priorityRows).map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">{(t.subject ?? "CL").slice(0, 2).toUpperCase()}</div>
                              <div>
                                <p className="text-sm font-medium">{t.subject || "Client"}</p>
                                <p className="text-xs text-slate-500">Ticket #{t.id.slice(0, 4).toUpperCase()}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{t.siteAddress ?? t.organizationId ?? "—"}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">{t.priority}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex text-sm text-slate-600">
                              <span className="w-2 h-2 mr-2 rounded-full bg-yellow-500 mt-1.5 shrink-0" />
                              {STATUS_LABEL[t.status] ?? t.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link to={`/technician/tickets/${t.id}`} className="text-[#f9bc06] font-medium text-sm">Détails</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h3 className="text-xl font-bold px-1">Programme du jour</h3>
              <div className="flex flex-col bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-semibold capitalize">{dateTitle}</h4>
                  <span className="text-xs font-medium bg-[#3a3527] text-[#f9bc06] px-2 py-1 rounded">Aujourd&apos;hui</span>
                </div>
                <div className="relative flex flex-col gap-6 pl-4 border-l border-slate-200 ml-2 flex-1">
                  {scheduleSlots.length === 0 ? (
                    <p className="text-sm text-slate-500 pl-2">Aucun ticket avec horodatage — les entrées avec `scheduledAt` ou `createdAt` apparaissent ici.</p>
                  ) : (
                    scheduleSlots.map((slot) => (
                      <div key={slot.id} className={`relative pl-6 ${slot.active ? "" : ""}`}>
                        <div
                          className={`absolute -left-[21px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${slot.active ? "bg-[#f9bc06] animate-pulse" : "bg-slate-300"}`}
                        />
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-semibold text-slate-500">{slot.timeLabel}</span>
                          <p className="text-sm font-bold">{slot.title}</p>
                          <p className="text-xs text-slate-500">{slot.subtitle}</p>
                          <p className="text-xs text-slate-400">{slot.meta}</p>
                          <Link to={`/technician/tickets/${slot.id}`} className="text-xs font-semibold text-[#f9bc06] mt-1">Ouvrir le ticket</Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <Link to="/technician/calendar" className="w-full flex items-center justify-center gap-2 text-sm font-medium text-slate-600 hover:text-[#f9bc06]">
                    <span className="material-symbols-outlined text-lg">calendar_month</span>
                    Calendrier complet
                  </Link>
                </div>
              </div>
              <div className="h-36 w-full rounded-xl overflow-hidden relative shadow-sm border border-slate-200 bg-[#2a261c] flex items-center justify-center px-4">
                <div className="flex items-center gap-2 text-[#f9bc06] text-center">
                  <span className="material-symbols-outlined">route</span>
                  <span className="text-xs font-medium text-white">
                    {todayTickets.length} ticket(s) créé(s) aujourd&apos;hui · {resolues.length} résolu(s) dans votre vue
                  </span>
                </div>
              </div>
            </div>
          </div>
      </div>
    </DashboardLayout>
  )
}
