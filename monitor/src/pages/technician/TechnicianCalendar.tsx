import { useEffect, useMemo, useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { technicianNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import { COLLECTIONS, type FirestoreSupportTicket } from "@/data/schema"
import { collection, onSnapshot, query, where } from "@/lib/firebase-firestore"
import { firestoreToMillis } from "@/lib/utils"

type TicketEvent = {
  id: string
  date: Date
  title: string
  client: string
  priority: string
  address: string
  duration: string
}

const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

function parseEvent(id: string, data: FirestoreSupportTicket): TicketEvent {
  const createdMs = firestoreToMillis(data.createdAt)
  const updatedMs = firestoreToMillis(data.updatedAt)
  const base = new Date(updatedMs ?? createdMs ?? Date.now())
  return {
    id,
    date: base,
    title: data.subject || "Intervention",
    client: data.organizationId || "Client",
    priority: data.priority,
    address: "Sur site",
    duration: data.duration || "—",
  }
}

function eventColor(priority: string): string {
  if (priority === "Urgente") return "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
  if (priority === "Haute") return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
  if (priority === "Normale") return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
  return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
}

function Modal({ event, onClose }: { event: TicketEvent; onClose: () => void }) {
  const hh = event.date.toLocaleTimeString("fr-DZ", { hour: "2-digit", minute: "2-digit" })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div className={`text-xs font-bold px-2.5 py-1 rounded-full border ${eventColor(event.priority)}`}>{hh}</div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{event.title}</h3>
        <div className="space-y-2.5 text-sm">
          {[
            { icon: "person", label: event.client },
            { icon: "location_on", label: event.address },
            { icon: "schedule", label: `Durée : ${event.duration}` },
          ].map((r) => (
            <div key={r.icon} className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
              <span className="material-symbols-outlined text-[18px] text-amber-500">{r.icon}</span>
              {r.label}
            </div>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button onClick={onClose} className="py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors">Fermer</button>
        </div>
      </div>
    </div>
  )
}

export default function TechnicianCalendar() {
  const { user } = useAuth()
  const [events, setEvents] = useState<TicketEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedEvent, setSelectedEvent] = useState<TicketEvent | null>(null)

  useEffect(() => {
    if (!db || !user?.id) {
      setLoading(false)
      return
    }
    const q = query(
      collection(db, COLLECTIONS.supportTickets),
      where("assignedToId", "==", user.id),
    )
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs
        .map((d) => parseEvent(d.id, d.data() as FirestoreSupportTicket))
        .sort((a, b) => a.date.getTime() - b.date.getTime())
      setEvents(rows)
      setLoading(false)
    })
    return unsub
  }, [user?.id])

  const today = new Date()
  const weekStart = useMemo(() => {
    const base = startOfWeek(today)
    base.setDate(base.getDate() + weekOffset * 7)
    return base
  }, [weekOffset])
  const weekEnd = useMemo(() => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 6)
    return d
  }, [weekStart])

  const weekLabel = `Semaine du ${weekStart.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} au ${weekEnd.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}`

  function eventsForDay(dayIndex: number) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + dayIndex)
    return events.filter((ev) => {
      return (
        ev.date.getFullYear() === d.getFullYear() &&
        ev.date.getMonth() === d.getMonth() &&
        ev.date.getDate() === d.getDate()
      )
    })
  }

  const upcoming = useMemo(() => {
    const now = Date.now()
    return events.filter((e) => e.date.getTime() >= now).slice(0, 8)
  }, [events])

  return (
    <DashboardLayout role="technician" navItems={technicianNav} pageTitle="Calendrier">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Calendrier</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{weekLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset((w) => w - 1)} className="size-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                weekOffset === 0
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-600"
                  : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              Aujourd'hui
            </button>
            <button onClick={() => setWeekOffset((w) => w + 1)} className="size-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
            {days.map((d, i) => {
              const date = new Date(weekStart)
              date.setDate(date.getDate() + i)
              const isToday =
                date.getFullYear() === today.getFullYear() &&
                date.getMonth() === today.getMonth() &&
                date.getDate() === today.getDate()
              return (
                <div key={d} className={`px-4 py-3 text-center border-r border-slate-200 dark:border-slate-800 last:border-0 ${isToday ? "bg-amber-50 dark:bg-amber-900/10" : ""}`}>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{d}</p>
                  <p className={`text-xl font-bold mt-1 ${isToday ? "text-amber-600" : "text-slate-900 dark:text-white"}`}>{date.getDate()}</p>
                </div>
              )
            })}
          </div>
          <div className="grid grid-cols-7 min-h-[360px]">
            {days.map((_, i) => {
              const dayEvents = eventsForDay(i)
              return (
                <div key={i} className="border-r border-slate-200 dark:border-slate-800 last:border-0 p-2 space-y-1.5">
                  {dayEvents.map((ev) => (
                    <button key={ev.id} onClick={() => setSelectedEvent(ev)} className={`w-full text-left p-2.5 rounded-lg border text-xs hover:opacity-80 transition-opacity ${eventColor(ev.priority)}`}>
                      <p className="font-bold">{ev.date.toLocaleTimeString("fr-DZ", { hour: "2-digit", minute: "2-digit" })}</p>
                      <p className="font-medium leading-snug mt-0.5">{ev.title}</p>
                      <p className="opacity-70 mt-0.5 truncate">{ev.client}</p>
                    </button>
                  ))}
                  {!loading && dayEvents.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-slate-300 dark:text-slate-700 text-xs">—</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4">Prochaines interventions</h3>
          {loading ? (
            <p className="text-sm text-slate-400">Chargement…</p>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-slate-400">Aucune intervention planifiée.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((ev) => (
                <button key={ev.id} onClick={() => setSelectedEvent(ev)} className="w-full flex items-center gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left">
                  <div className={`w-1.5 self-stretch rounded-full shrink-0 ${eventColor(ev.priority).split(" ")[0]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{ev.title}</p>
                    <p className="text-xs text-slate-500">{ev.client} · {ev.date.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" })} · {ev.date.toLocaleTimeString("fr-DZ", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-400 text-[18px] shrink-0">chevron_right</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedEvent && <Modal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </DashboardLayout>
  )
}
