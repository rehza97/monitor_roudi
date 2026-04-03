import { useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { clientNav } from "@/lib/nav"
import type { NotificationRow } from "@/data/schema"
import { clientNotifications } from "@/data/seed"

type Notif = NotificationRow

const groupOrder = ["Aujourd'hui", "Hier", "Semaine dernière"]

export default function ClientNotifications() {
  const [notifs, setNotifs] = useState<Notif[]>(() => [...clientNotifications])

  function markRead(title: string) {
    setNotifs(prev => prev.map(n => n.title === title ? { ...n, read: true } : n))
  }

  function markAllRead() {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  const unreadCount = notifs.filter(n => !n.read).length

  return (
    <DashboardLayout role="client" navItems={clientNav} pageTitle="Notifications">
      <div className="p-6 max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : "Tout est lu"}
          </p>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
            >
              Tout marquer comme lu
            </button>
          )}
        </div>

        {groupOrder.map(group => {
          const items = notifs.filter(n => n.group === group)
          if (items.length === 0) return null
          return (
            <div key={group}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{group}</p>
              <div className="space-y-2">
                {items.map((n) => (
                  <button
                    key={n.title}
                    onClick={() => markRead(n.title)}
                    className={`w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-shadow hover:shadow-sm ${
                      n.read
                        ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                        : "bg-cyan-50/50 dark:bg-cyan-900/10 border-cyan-200 dark:border-cyan-800"
                    }`}
                  >
                    <div className={`size-10 rounded-lg ${n.bg} ${n.color} flex items-center justify-center shrink-0`}>
                      <span className="material-symbols-outlined text-[20px]">{n.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${n.read ? "font-medium" : "font-semibold"} text-slate-900 dark:text-white`}>{n.title}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{n.desc}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-400 whitespace-nowrap">{n.time}</span>
                      {!n.read && <span className="size-2 rounded-full bg-cyan-600 shrink-0" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        })}

        {unreadCount === 0 && notifs.every(n => n.read) && (
          <div className="text-center py-10 text-slate-400 text-sm">Toutes les notifications ont été lues.</div>
        )}
      </div>
    </DashboardLayout>
  )
}
