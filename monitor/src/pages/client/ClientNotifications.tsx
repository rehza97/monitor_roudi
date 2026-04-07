import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { clientNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  doc,
  writeBatch,
} from "@/lib/firebase-firestore"
import { COLLECTIONS, type FirestoreNotification } from "@/data/schema"
import { formatFirestoreDateTime, firestoreToMillis } from "@/lib/utils"

interface NotifDoc extends FirestoreNotification {
  id: string
}

type Group = "Aujourd'hui" | "Cette semaine" | "Plus ancien"

function getGroup(value: unknown): Group {
  const ms = firestoreToMillis(value)
  if (ms == null) return "Plus ancien"

  const now = Date.now()
  const diff = now - ms
  const ONE_DAY = 24 * 60 * 60 * 1000
  const ONE_WEEK = 7 * ONE_DAY

  if (diff < ONE_DAY) return "Aujourd'hui"
  if (diff < ONE_WEEK) return "Cette semaine"
  return "Plus ancien"
}

const GROUP_ORDER: Group[] = ["Aujourd'hui", "Cette semaine", "Plus ancien"]

const DEFAULT_ICON = "notifications"
const DEFAULT_COLOR = "text-blue-500"
const DEFAULT_BG    = "bg-blue-50 dark:bg-blue-900/20"

export default function ClientNotifications() {
  const { user } = useAuth()

  const [notifs, setNotifs]   = useState<NotifDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    if (!db || !user?.id) {
      setLoading(false)
      return
    }

    // Query by userId
    const qUser = query(
      collection(db, COLLECTIONS.notifications),
      where("userId", "==", user.id),
      orderBy("createdAt", "desc"),
      limit(50),
    )

    const unseenUser = onSnapshot(qUser, (snap) => {
      const byUser = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as FirestoreNotification),
      }))
      setNotifs((prev) => {
        const orgIds = new Set(prev.filter((n) => n.organizationId).map((n) => n.id))
        const merged = [
          ...byUser,
          ...prev.filter((n) => orgIds.has(n.id)),
        ]
        // Deduplicate
        const seen = new Set<string>()
        return merged.filter((n) => {
          if (seen.has(n.id)) return false
          seen.add(n.id)
          return true
        })
      })
      setLoading(false)
    })

    // Query by organizationId (if exists)
    let unseenOrg: (() => void) | undefined
    if (user.organizationId) {
      const qOrg = query(
        collection(db, COLLECTIONS.notifications),
        where("organizationId", "==", user.organizationId),
        orderBy("createdAt", "desc"),
        limit(50),
      )
      unseenOrg = onSnapshot(qOrg, (snap) => {
        const byOrg = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as FirestoreNotification),
        }))
        setNotifs((prev) => {
          const merged = [...prev, ...byOrg]
          const seen = new Set<string>()
          return merged
            .filter((n) => {
              if (seen.has(n.id)) return false
              seen.add(n.id)
              return true
            })
            .sort((a, b) => {
              const ma = firestoreToMillis(a.createdAt) ?? 0
              const mb = firestoreToMillis(b.createdAt) ?? 0
              return mb - ma
            })
        })
      })
    }

    return () => {
      unseenUser()
      unseenOrg?.()
    }
  }, [user?.id, user?.organizationId])

  const unreadCount = notifs.filter((n) => !n.read).length

  async function markRead(n: NotifDoc) {
    if (!db || n.read) return
    try {
      await updateDoc(doc(db, COLLECTIONS.notifications, n.id), { read: true })
    } catch {
      // silent
    }
  }

  async function markAllRead() {
    if (!db) return
    const unread = notifs.filter((n) => !n.read)
    if (unread.length === 0) return
    setMarking(true)
    try {
      const batch = writeBatch(db)
      unread.forEach((n) => {
        batch.update(doc(db!, COLLECTIONS.notifications, n.id), { read: true })
      })
      await batch.commit()
    } finally {
      setMarking(false)
    }
  }

  // Group notifications
  const grouped: Record<Group, NotifDoc[]> = {
    "Aujourd'hui": [],
    "Cette semaine": [],
    "Plus ancien": [],
  }

  notifs.forEach((n) => {
    grouped[getGroup(n.createdAt)].push(n)
  })

  return (
    <DashboardLayout role="client" navItems={clientNav} pageTitle="Notifications">
      <div className="p-6 w-full space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Notifications</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold bg-[#db143c] text-white rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={marking}
              className="text-sm text-[#db143c] hover:opacity-80 font-medium disabled:opacity-50"
            >
              {marking ? "En cours…" : "Tout marquer comme lu"}
            </button>
          )}
        </div>

        {loading && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4 p-4 animate-pulse">
                <div className="size-9 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-3.5 w-64 bg-slate-100 dark:bg-slate-800 rounded" />
                  <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && notifs.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="material-symbols-outlined text-[48px] text-slate-300 dark:text-slate-600">
              notifications_off
            </span>
            <p className="font-semibold text-slate-900 dark:text-white">Aucune notification</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Vous êtes à jour ! Les nouvelles notifications apparaîtront ici.
            </p>
          </div>
        )}

        {!loading &&
          notifs.length > 0 &&
          GROUP_ORDER.map((group) => {
            const items = grouped[group]
            if (items.length === 0) return null

            return (
              <div key={group}>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1">
                  {group}
                </p>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                  {items.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => markRead(n)}
                      className={`w-full flex items-start gap-4 p-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                        !n.read ? "bg-rose-50/30 dark:bg-rose-900/5" : ""
                      }`}
                    >
                      {/* Icon */}
                      <div
                        className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${n.color ? "" : DEFAULT_BG}`}
                        style={n.color ? { background: `${n.color}20` } : undefined}
                      >
                        <span
                          className={`material-symbols-outlined text-[18px] ${n.color ? "" : DEFAULT_COLOR}`}
                          style={n.color ? { color: n.color } : undefined}
                        >
                          {n.icon ?? DEFAULT_ICON}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-sm font-medium text-slate-900 dark:text-white truncate ${
                              !n.read ? "font-semibold" : ""
                            }`}
                          >
                            {n.title}
                          </p>
                          {!n.read && (
                            <span className="size-2 rounded-full bg-[#db143c] shrink-0" />
                          )}
                        </div>
                        {n.message && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          {formatFirestoreDateTime(n.createdAt)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
      </div>
    </DashboardLayout>
  )
}
