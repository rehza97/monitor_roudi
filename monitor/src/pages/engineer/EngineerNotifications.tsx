import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { engineerNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import { COLLECTIONS } from "@/data/schema"
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from "@/lib/firebase-firestore"

type NotificationDoc = {
  id: string
  title: string
  body?: string
  icon?: string
  color?: string
  read: boolean
  link?: string
  createdAt?: unknown
}

function formatTime(ts: unknown): string {
  if (
    ts &&
    typeof ts === "object" &&
    "toDate" in ts &&
    typeof (ts as { toDate: () => Date }).toDate === "function"
  ) {
    return (ts as { toDate: () => Date }).toDate().toLocaleString("fr-DZ", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }
  return ""
}

export default function EngineerNotifications() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [notifs, setNotifs] = useState<NotificationDoc[]>([])

  useEffect(() => {
    if (!db || !user?.id) return

    const q = query(
      collection(db, COLLECTIONS.notifications),
      where("userId", "==", user.id),
      orderBy("createdAt", "desc"),
    )

    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>
        return {
          id: d.id,
          title: typeof data.title === "string" ? data.title : "Notification",
          body: typeof data.body === "string" ? data.body : undefined,
          icon: typeof data.icon === "string" ? data.icon : "notifications",
          color: typeof data.color === "string" ? data.color : "text-blue-600",
          read: Boolean(data.read),
          link: typeof data.link === "string" ? data.link : undefined,
          createdAt: data.createdAt,
        } satisfies NotificationDoc
      })
      setNotifs(rows)
    })

    return () => unsub()
  }, [user?.id])

  const unread = useMemo(() => notifs.filter((n) => !n.read), [notifs])

  async function markAllRead() {
    if (!db || unread.length === 0) return
    const batch = writeBatch(db)
    for (const n of unread) {
      batch.update(doc(db, COLLECTIONS.notifications, n.id), { read: true })
    }
    await batch.commit()
  }

  async function handleClick(n: NotificationDoc) {
    if (!db) return
    if (!n.read) {
      await updateDoc(doc(db, COLLECTIONS.notifications, n.id), { read: true })
    }
    if (n.link) navigate(n.link)
  }

  return (
    <DashboardLayout role="engineer" navItems={engineerNav} pageTitle="Notifications">
      <div className="p-6 w-full space-y-4 bg-[#f6f6f8] min-h-[calc(100vh-64px)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <p className="text-slate-600 text-sm">{notifs.length} notifications</p>
            {unread.length > 0 ? (
              <span className="size-5 rounded-full bg-[#1337ec] text-white text-[10px] font-bold flex items-center justify-center">
                {unread.length}
              </span>
            ) : null}
          </div>
          <button
            onClick={() => void markAllRead()}
            disabled={unread.length === 0}
            className="text-sm text-[#2463eb] hover:text-[#1d4ed8] font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            Tout marquer comme lu
          </button>
        </div>

        {notifs.map((n) => (
          <button
            key={n.id}
            onClick={() => void handleClick(n)}
            className={`w-full text-left flex items-start gap-4 p-4 rounded-xl border transition-all ${
              n.read
                ? "bg-white border-slate-200 opacity-75 hover:bg-slate-50"
                : "bg-white border-[#2463eb]/30 ring-1 ring-[#2463eb]/20 hover:bg-slate-50"
            }`}
          >
            <div className="size-10 rounded-lg bg-[#2463eb]/10 text-[#2463eb] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">{n.icon ?? "notifications"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm ${
                  n.read ? "text-slate-500" : "font-semibold text-slate-900"
                }`}
              >
                {n.title}
              </p>
              {n.body ? <p className="text-xs text-slate-400 mt-0.5">{n.body}</p> : null}
              {n.link ? (
                <p className="text-xs text-[#2463eb] mt-0.5 flex items-center gap-0.5">
                  Voir le détail <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                </p>
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className="text-xs text-slate-400 whitespace-nowrap">{formatTime(n.createdAt)}</span>
              {!n.read ? <span className="size-2 rounded-full bg-[#2463eb]" /> : null}
            </div>
          </button>
        ))}

        {notifs.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <span className="material-symbols-outlined text-[32px] block mb-2">notifications_off</span>
            <p className="text-sm">Aucune notification.</p>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  )
}
