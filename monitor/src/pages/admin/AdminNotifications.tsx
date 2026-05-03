import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
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
import { COLLECTIONS, type FirestoreNotification } from "@/data/schema"
import { formatFirestoreDateTime } from "@/lib/utils"

type Notif = FirestoreNotification & { id: string; body?: string }

export default function AdminNotifications() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db || !user?.id) {
      setLoading(false)
      return
    }

    const q = query(
      collection(db, COLLECTIONS.notifications),
      where("userId", "==", user.id),
      orderBy("createdAt", "desc"),
    )

    const unsub = onSnapshot(q, (snap) => {
      setNotifs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as FirestoreNotification) })))
      setLoading(false)
    })
    return () => unsub()
  }, [user?.id])

  const unread = useMemo(() => notifs.filter((n) => !n.read), [notifs])

  async function markAllRead() {
    const firestore = db
    if (!firestore || unread.length === 0) return
    const batch = writeBatch(firestore)
    unread.forEach((n) => batch.update(doc(firestore, COLLECTIONS.notifications, n.id), { read: true }))
    await batch.commit()
  }

  async function handleOpen(n: Notif) {
    const firestore = db
    if (firestore && !n.read) await updateDoc(doc(firestore, COLLECTIONS.notifications, n.id), { read: true })
    if (n.link) navigate(n.link)
  }

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Notifications">
      <div className="min-h-[calc(100vh-64px)] bg-[#f7f5f5] px-6 py-8">
        <div className="mx-auto max-w-4xl space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">Notifications</h1>
              <p className="mt-1 text-sm text-slate-500">{unread.length} non lue{unread.length > 1 ? "s" : ""}</p>
            </div>
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={unread.length === 0}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Tout marquer comme lu
            </button>
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Chargement...</div>
          ) : notifs.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
              <span className="material-symbols-outlined text-[44px] text-slate-300">notifications_off</span>
              <p className="mt-2 font-semibold text-slate-900">Aucune notification</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifs.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => void handleOpen(n)}
                  className={`flex w-full items-start gap-4 rounded-xl border bg-white p-5 text-left shadow-sm transition hover:border-[#d23b4c]/40 ${
                    n.read ? "border-slate-200 opacity-75" : "border-[#d23b4c]/30 ring-1 ring-[#d23b4c]/10"
                  }`}
                >
                  <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${n.color || "bg-rose-50 text-rose-600"}`}>
                    <span className="material-symbols-outlined text-[22px]">{n.icon || "notifications"}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-bold text-slate-900">{n.title}</p>
                      <span className="shrink-0 text-xs text-slate-400">{formatFirestoreDateTime(n.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{n.message || n.body || "Nouvelle activité."}</p>
                    {n.link ? <p className="mt-2 text-xs font-semibold text-[#d23b4c]">Voir le détail</p> : null}
                  </div>
                  {!n.read ? <span className="mt-2 size-2 rounded-full bg-[#d23b4c]" /> : null}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
