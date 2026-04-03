import { useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { technicianNav } from "@/lib/nav"

type CalEvent = { day: number; time: string; title: string; client: string; color: string; address: string; duration: string }

const baseEvents: CalEvent[] = [
  { day: 1, time: "09:00", title: "Installation serveur",  client: "DataViz Ltd",   color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",     address: "Alger Centre", duration: "2h" },
  { day: 2, time: "14:00", title: "Maintenance réseau",    client: "FinCorp SA",    color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",   address: "Oran",         duration: "3h" },
  { day: 3, time: "10:30", title: "Déploiement NAS",       client: "HRSoft",        color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800", address: "Alger",        duration: "1h30" },
  { day: 4, time: "08:00", title: "Remplacement disque",   client: "LogiTech SARL", color: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",         address: "Constantine",  duration: "1h" },
  { day: 5, time: "15:00", title: "Audit sécurité",        client: "ShopEasy",      color: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800", address: "Annaba",       duration: "4h" },
]

const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
const BASE_DATE = 17 // week starts March 17

function Modal({ event, onClose }: { event: CalEvent; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div className={`text-xs font-bold px-2.5 py-1 rounded-full border ${event.color}`}>{event.time}</div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{event.title}</h3>
        <div className="space-y-2.5 text-sm">
          {[
            { icon: "person",       label: event.client },
            { icon: "location_on",  label: event.address },
            { icon: "schedule",     label: `Durée : ${event.duration}` },
          ].map(r => (
            <div key={r.icon} className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
              <span className="material-symbols-outlined text-[18px] text-amber-500">{r.icon}</span>
              {r.label}
            </div>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(event.address + ", Algérie")}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">map</span>Itinéraire
          </a>
          <button
            onClick={onClose}
            className="py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TechnicianCalendar() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null)

  const startDay = BASE_DATE + weekOffset * 7
  const weekLabel = `Semaine du ${startDay} – ${startDay + 6} mars 2025`

  return (
    <DashboardLayout role="technician" navItems={technicianNav} pageTitle="Calendrier">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Calendrier</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{weekLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset(w => w - 1)}
              className="size-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
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
            <button
              onClick={() => setWeekOffset(w => w + 1)}
              className="size-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Week grid */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
            {days.map((d, i) => {
              const isToday = weekOffset === 0 && i === 0
              return (
                <div key={d} className={`px-4 py-3 text-center border-r border-slate-200 dark:border-slate-800 last:border-0 ${isToday ? "bg-amber-50 dark:bg-amber-900/10" : ""}`}>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{d}</p>
                  <p className={`text-xl font-bold mt-1 ${isToday ? "text-amber-600" : "text-slate-900 dark:text-white"}`}>{startDay + i}</p>
                </div>
              )
            })}
          </div>
          <div className="grid grid-cols-7 min-h-[360px]">
            {days.map((_, i) => {
              const dayEvents = weekOffset === 0 ? baseEvents.filter(e => e.day === i + 1) : []
              return (
                <div key={i} className="border-r border-slate-200 dark:border-slate-800 last:border-0 p-2 space-y-1.5">
                  {dayEvents.map(ev => (
                    <button
                      key={ev.title}
                      onClick={() => setSelectedEvent(ev)}
                      className={`w-full text-left p-2.5 rounded-lg border text-xs hover:opacity-80 transition-opacity ${ev.color}`}
                    >
                      <p className="font-bold">{ev.time}</p>
                      <p className="font-medium leading-snug mt-0.5">{ev.title}</p>
                      <p className="opacity-70 mt-0.5">{ev.client}</p>
                    </button>
                  ))}
                  {weekOffset !== 0 && (
                    <div className="flex items-center justify-center h-20 text-slate-300 dark:text-slate-700 text-xs">
                      —
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Upcoming */}
        {weekOffset === 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Prochaines interventions</h3>
            <div className="space-y-2">
              {baseEvents.map(ev => (
                <button
                  key={ev.title}
                  onClick={() => setSelectedEvent(ev)}
                  className="w-full flex items-center gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <div className={`w-1.5 self-stretch rounded-full shrink-0 ${ev.color.split(" ")[0]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{ev.title}</p>
                    <p className="text-xs text-slate-500">{ev.client} · {days[ev.day - 1]} {startDay + ev.day - 1} mars · {ev.time}</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-400 text-[18px] shrink-0">chevron_right</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedEvent && <Modal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </DashboardLayout>
  )
}
