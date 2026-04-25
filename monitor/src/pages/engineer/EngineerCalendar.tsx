import { useEffect, useMemo, useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { engineerNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import { COLLECTIONS, type FirestoreProject, type FirestoreMeeting } from "@/data/schema"
import { collection, onSnapshot, query, where } from "@/lib/firebase-firestore"

type CalEvent = {
  id: string
  kind: "project" | "meeting"
  date: Date
  title: string
  subtitle: string
  status: string
  link?: string
}

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

function startOfWeek(d: Date): Date {
  const copy = new Date(d)
  const day = (copy.getDay() + 6) % 7
  copy.setDate(copy.getDate() - day)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function toMs(value: unknown): number {
  if (!value) return 0
  if (typeof value === "object" && value !== null && "toMillis" in value) {
    return ((value as { toMillis: () => number }).toMillis?.() ?? 0)
  }
  if (value instanceof Date) return value.getTime()
  if (typeof value === "string") { const p = Date.parse(value); return Number.isFinite(p) ? p : 0 }
  return 0
}

const PROJECT_COLOR: Record<string, string> = {
  active:    "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  pending:   "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  delivered: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  cancelled: "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700",
}

const MEETING_COLOR = "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"

function EventModal({ event, onClose }: { event: CalEvent; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${event.kind === "meeting" ? MEETING_COLOR : PROJECT_COLOR[event.status] ?? PROJECT_COLOR.active}`}>
            {event.kind === "meeting" ? "Réunion" : "Projet"}
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">{event.title}</h3>
        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-blue-500">calendar_today</span>
            {event.date.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })}
          </div>
          {event.kind === "meeting" && (
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-blue-500">schedule</span>
              {event.date.toLocaleTimeString("fr-DZ", { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-blue-500">info</span>
            {event.subtitle}
          </div>
        </div>
        {event.link && (
          <a href={event.link} target="_blank" rel="noreferrer"
            className="mt-4 flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline">
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            Rejoindre la réunion
          </a>
        )}
        <button onClick={onClose} className="mt-5 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg">
          Fermer
        </button>
      </div>
    </div>
  )
}

export default function EngineerCalendar() {
  const { user } = useAuth()
  const [events, setEvents]         = useState<CalEvent[]>([])
  const [loading, setLoading]       = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [selected, setSelected]     = useState<CalEvent | null>(null)

  useEffect(() => {
    if (!db || !user?.id) { setLoading(false); return }
    let projectEvents: CalEvent[] = []
    let meetingEvents: CalEvent[] = []
    let resolved = 0

    function merge() {
      resolved++
      if (resolved >= 2) {
        const all = [...projectEvents, ...meetingEvents].sort((a, b) => a.date.getTime() - b.date.getTime())
        setEvents(all)
        setLoading(false)
      }
    }

    const unsubProjects = onSnapshot(
      query(collection(db!, COLLECTIONS.projects), where("assignedEngineerId", "==", user.id)),
      (snap) => {
        projectEvents = snap.docs.map((d) => {
          const p = d.data() as FirestoreProject
          const ms = toMs(p.startedAt) || toMs(p.createdAt)
          return {
            id: d.id,
            kind: "project" as const,
            date: new Date(ms || Date.now()),
            title: p.title || p.clientLabel || "Projet",
            subtitle: `${p.clientLabel ?? ""} · ${p.requestType ?? ""}`.replace(/^ · | · $/, ""),
            status: p.status,
          }
        })
        merge()
      },
    )

    const unsubMeetings = onSnapshot(
      query(collection(db!, COLLECTIONS.meetings), where("targetUserIds", "array-contains", user.id)),
      (snap) => {
        const rows: CalEvent[] = []
        snap.docs.forEach((d) => {
          const m = d.data() as FirestoreMeeting
          const ms = toMs(m.scheduledAt)
          if (!ms) return
          rows.push({
            id: d.id,
            kind: "meeting",
            date: new Date(ms),
            title: m.title || "Réunion",
            subtitle: m.platform ?? "Réunion",
            status: m.status ?? "scheduled",
            link: m.meetingLink || undefined,
          })
        })
        meetingEvents = rows
        merge()
      },
    )

    return () => { unsubProjects(); unsubMeetings() }
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

  const weekLabel = `${weekStart.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} — ${weekEnd.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}`

  function eventsForDay(i: number): CalEvent[] {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return events.filter((ev) =>
      ev.date.getFullYear() === d.getFullYear() &&
      ev.date.getMonth() === d.getMonth() &&
      ev.date.getDate() === d.getDate(),
    )
  }

  const upcoming = useMemo(() => {
    const now = Date.now()
    return events.filter((e) => e.date.getTime() >= now).slice(0, 10)
  }, [events])

  const kpis = useMemo(() => ({
    meetings: events.filter((e) => e.kind === "meeting").length,
    projects: events.filter((e) => e.kind === "project").length,
    thisWeek: events.filter((e) => {
      const ms = e.date.getTime()
      return ms >= weekStart.getTime() && ms <= weekEnd.getTime()
    }).length,
  }), [events, weekStart, weekEnd])

  return (
    <DashboardLayout role="engineer" navItems={engineerNav} pageTitle="Calendrier">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Calendrier</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{weekLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset((w) => w - 1)}
              className="size-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button onClick={() => setWeekOffset(0)}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                weekOffset === 0
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600"
                  : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              Aujourd'hui
            </button>
            <button onClick={() => setWeekOffset((w) => w + 1)}
              className="size-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Projets", value: kpis.projects, icon: "folder_open", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
            { label: "Réunions", value: kpis.meetings, icon: "video_call", color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20" },
            { label: "Cette semaine", value: kpis.thisWeek, icon: "event", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
          ].map((k) => (
            <div key={k.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
              <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${k.bg}`}>
                <span className={`material-symbols-outlined text-[20px] ${k.color}`}>{k.icon}</span>
              </div>
              <div>
                <p className={`text-xl font-black ${k.color}`}>{loading ? "—" : k.value}</p>
                <p className="text-xs text-slate-500">{k.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-blue-400" />Projet</div>
          <div className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-purple-400" />Réunion</div>
        </div>

        {/* Week grid */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
            {DAYS.map((d, i) => {
              const date = new Date(weekStart)
              date.setDate(date.getDate() + i)
              const isToday =
                date.getFullYear() === today.getFullYear() &&
                date.getMonth() === today.getMonth() &&
                date.getDate() === today.getDate()
              return (
                <div key={d} className={`px-3 py-3 text-center border-r border-slate-200 dark:border-slate-800 last:border-0 ${isToday ? "bg-blue-50 dark:bg-blue-900/10" : ""}`}>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{d}</p>
                  <p className={`text-xl font-bold mt-1 ${isToday ? "text-blue-600" : "text-slate-900 dark:text-white"}`}>{date.getDate()}</p>
                </div>
              )
            })}
          </div>
          <div className="grid grid-cols-7 min-h-[340px]">
            {DAYS.map((_, i) => {
              const dayEvs = eventsForDay(i)
              return (
                <div key={i} className="border-r border-slate-200 dark:border-slate-800 last:border-0 p-1.5 space-y-1">
                  {loading && i === 0 && (
                    <div className="animate-pulse space-y-1 pt-2">
                      <div className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800" />
                    </div>
                  )}
                  {dayEvs.map((ev) => (
                    <button key={ev.id} onClick={() => setSelected(ev)}
                      className={`w-full text-left p-2 rounded-lg border text-xs hover:opacity-80 transition-opacity ${
                        ev.kind === "meeting" ? MEETING_COLOR : PROJECT_COLOR[ev.status] ?? PROJECT_COLOR.active
                      }`}
                    >
                      {ev.kind === "meeting" && (
                        <p className="font-bold">{ev.date.toLocaleTimeString("fr-DZ", { hour: "2-digit", minute: "2-digit" })}</p>
                      )}
                      <p className="font-medium leading-snug line-clamp-2">{ev.title}</p>
                    </button>
                  ))}
                  {!loading && dayEvs.length === 0 && (
                    <div className="flex items-center justify-center h-16 text-slate-300 dark:text-slate-700 text-xs">—</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Upcoming events */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4">Prochains événements</h3>
          {loading ? (
            <p className="text-sm text-slate-400">Chargement…</p>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun événement à venir.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((ev) => (
                <button key={ev.id} onClick={() => setSelected(ev)}
                  className="w-full flex items-center gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left">
                  <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${ev.kind === "meeting" ? "bg-purple-100 dark:bg-purple-900/20" : "bg-blue-100 dark:bg-blue-900/20"}`}>
                    <span className={`material-symbols-outlined text-[16px] ${ev.kind === "meeting" ? "text-purple-600" : "text-blue-600"}`}>
                      {ev.kind === "meeting" ? "video_call" : "folder_open"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{ev.title}</p>
                    <p className="text-xs text-slate-500">
                      {ev.date.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" })}
                      {ev.kind === "meeting" && ` · ${ev.date.toLocaleTimeString("fr-DZ", { hour: "2-digit", minute: "2-digit" })}`}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-slate-400 text-[18px] shrink-0">chevron_right</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selected && <EventModal event={selected} onClose={() => setSelected(null)} />}
    </DashboardLayout>
  )
}
