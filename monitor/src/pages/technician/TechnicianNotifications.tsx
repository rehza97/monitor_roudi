import { useEffect, useMemo, useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { technicianNav } from "@/lib/nav"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from "@/lib/firebase-firestore"
import { COLLECTIONS, type FirestoreNotification } from "@/data/schema"
import { firestoreToMillis, formatFirestoreDateTime } from "@/lib/utils"

type Notif = FirestoreNotification & { id: string }

function notifIcon(n: Notif): string {
  if (n.icon && n.icon.trim()) return n.icon
  return "notifications"
}

function notifColorClass(n: Notif): string {
  if (n.color && n.color.includes("text-")) return n.color
  return n.read ? "text-slate-500" : "text-amber-600"
}

function notifBgClass(n: Notif): string {
  if (n.color && n.color.includes("bg-")) return n.color
  return n.read ? "bg-slate-100 dark:bg-slate-800" : "bg-amber-50 dark:bg-amber-900/20"
}

export default function TechnicianNotifications() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db || !user?.id) {
      setLoading(false)
      return
    }

    const qUser = query(
      collection(db, COLLECTIONS.notifications),
      where("userId", "==", user.id),
    )

    const unsubUser = onSnapshot(qUser, (snap) => {
      const userRows = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as FirestoreNotification) }))
        .sort((a, b) => (firestoreToMillis(b.createdAt) ?? 0) - (firestoreToMillis(a.createdAt) ?? 0))
      setNotifs((prev) => {
        const merged = [...userRows, ...prev.filter((n) => n.organizationId)]
        const seen = new Set<string>()
        return merged
          .filter((n) => {
            if (seen.has(n.id)) return false
            seen.add(n.id)
            return true
          })
          .sort((a, b) => (firestoreToMillis(b.createdAt) ?? 0) - (firestoreToMillis(a.createdAt) ?? 0))
      })
      setLoading(false)
    })

    let unsubOrg: (() => void) | undefined
    if (user.organizationId) {
      const qOrg = query(
        collection(db, COLLECTIONS.notifications),
        where("organizationId", "==", user.organizationId),
      )
      unsubOrg = onSnapshot(qOrg, (snap) => {
        const orgRows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as FirestoreNotification) }))
        setNotifs((prev) => {
          const merged = [...prev, ...orgRows]
          const seen = new Set<string>()
          return merged
            .filter((n) => {
              if (seen.has(n.id)) return false
              seen.add(n.id)
              return true
            })
            .sort((a, b) => (firestoreToMillis(b.createdAt) ?? 0) - (firestoreToMillis(a.createdAt) ?? 0))
        })
      })
    }

    return () => {
      unsubUser()
      unsubOrg?.()
    }
  }, [user?.id, user?.organizationId])

  const unread = useMemo(() => notifs.filter((n) => !n.read).length, [notifs])

  async function markAllRead() {
    const firestore = db
    if (!firestore) return
    const unreadItems = notifs.filter((n) => !n.read)
    if (unreadItems.length === 0) return
    const batch = writeBatch(firestore)
    unreadItems.forEach((n) => {
      batch.update(doc(firestore, COLLECTIONS.notifications, n.id), { read: true })
    })
    await batch.commit()
  }

  async function markRead(id: string) {
    if (!db) return
    const current = notifs.find((n) => n.id === id)
    if (!current || current.read) return
    await updateDoc(doc(db, COLLECTIONS.notifications, id), { read: true })
  }

  async function handleClick(n: Notif) {
    await markRead(n.id)
    if (n.link) navigate(n.link)
  }

  return (
    <DashboardLayout role="technician" navItems={technicianNav} pageTitle="Notifications">
      <div className="p-6 w-full space-y-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <p className="text-slate-500 text-sm">{notifs.length} notifications</p>
            {unread > 0 && (
              <span className="size-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">{unread}</span>
            )}
          </div>
          <button
            onClick={() => void markAllRead()}
            disabled={unread === 0}
            className="text-sm text-amber-600 hover:text-amber-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            Tout marquer comme lu
          </button>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-slate-400">Chargement…</div>
        ) : notifs.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <span className="material-symbols-outlined text-[32px] block mb-2">notifications_off</span>
            <p className="text-sm">Aucune notification</p>
          </div>
        ) : (
          notifs.map((n) => (
            <button
              key={n.id}
              onClick={() => void handleClick(n)}
              className={`w-full text-left flex items-start gap-4 p-4 rounded-xl border transition-all hover:shadow-sm ${
                n.read
                  ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-70"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 ring-1 ring-amber-200 dark:ring-amber-800/50"
              }`}
            >
              <div className={`size-10 rounded-lg ${notifBgClass(n)} ${notifColorClass(n)} flex items-center justify-center shrink-0`}>
                <span className="material-symbols-outlined text-[20px]">{notifIcon(n)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${n.read ? "text-slate-500 dark:text-slate-400" : "font-semibold text-slate-900 dark:text-white"}`}>
                  {n.title}
                </p>
                {n.message && <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>}
                {n.link && (
                  <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-0.5">
                    Voir le détail <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="text-xs text-slate-400 whitespace-nowrap">{formatFirestoreDateTime(n.createdAt)}</span>
                {!n.read && <span className="size-2 rounded-full bg-amber-500" />}
              </div>
            </button>
          ))
        )}
      </div>
    </DashboardLayout>
  )
}
