import { useState } from "react"
import { useNavigate } from "react-router-dom"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { engineerNav } from "@/lib/nav"
import type { StaffNotificationRow } from "@/data/schema"
import { engineerNotifications } from "@/data/seed"

type Notif = StaffNotificationRow

export default function EngineerNotifications() {
  const navigate = useNavigate()
  const [notifs, setNotifs] = useState<Notif[]>(() => [...engineerNotifications])

  const unread = notifs.filter(n => !n.read).length

  function markAllRead() {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  function handleClick(n: Notif) {
    setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
    if (n.link) navigate(n.link)
  }

  return (
    <DashboardLayout role="engineer" navItems={engineerNav} pageTitle="Notifications">
      <div className="p-6 w-full space-y-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <p className="text-slate-500 text-sm">{notifs.length} notifications</p>
            {unread > 0 && (
              <span className="size-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">{unread}</span>
            )}
          </div>
          <button
            onClick={markAllRead}
            disabled={unread === 0}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            Tout marquer comme lu
          </button>
        </div>

        {notifs.map(n => (
          <button
            key={n.id}
            onClick={() => handleClick(n)}
            className={`w-full text-left flex items-start gap-4 p-4 rounded-xl border transition-all hover:shadow-sm ${
              n.read
                ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 ring-1 ring-blue-200 dark:ring-blue-800/50"
            }`}
          >
            <div className={`size-10 rounded-lg ${n.bg} ${n.color} flex items-center justify-center shrink-0`}>
              <span className="material-symbols-outlined text-[20px]">{n.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${n.read ? "text-slate-500 dark:text-slate-400" : "font-semibold text-slate-900 dark:text-white"}`}>
                {n.title}
              </p>
              {n.link && (
                <p className="text-xs text-blue-600 mt-0.5 flex items-center gap-0.5">
                  Voir le détail <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className="text-xs text-slate-400 whitespace-nowrap">{n.time}</span>
              {!n.read && <span className="size-2 rounded-full bg-blue-600" />}
            </div>
          </button>
        ))}

        {notifs.every(n => n.read) && (
          <div className="text-center py-8 text-slate-400">
            <span className="material-symbols-outlined text-[32px] block mb-2">done_all</span>
            <p className="text-sm">Toutes les notifications ont été lues</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
