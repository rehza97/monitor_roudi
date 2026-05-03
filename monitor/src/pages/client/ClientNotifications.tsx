import { useEffect, useMemo, useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { clientNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from "@/lib/firebase-firestore"
import { COLLECTIONS, type FirestoreNotification } from "@/data/schema"
import { formatFirestoreDateTime, firestoreToMillis } from "@/lib/utils"

interface NotifDoc extends FirestoreNotification {
  id: string
}

type Group = "Aujourd'hui" | "Hier" | "Semaine dernière"

const GROUP_ORDER: Group[] = ["Aujourd'hui", "Hier", "Semaine dernière"]

function getGroup(value: unknown): Group {
  const ms = firestoreToMillis(value)
  if (ms == null) return "Semaine dernière"
  const now = Date.now()
  const diff = now - ms
  const oneDay = 24 * 60 * 60 * 1000
  if (diff < oneDay) return "Aujourd'hui"
  if (diff < 2 * oneDay) return "Hier"
  return "Semaine dernière"
}

function toneFromNotification(n: NotifDoc) {
  const t = `${n.title ?? ""} ${n.message ?? ""}`.toLowerCase()
  if (t.includes("accept") || t.includes("valid")) {
    return { icon: "check_circle", wrap: "bg-green-50 text-green-600", badge: "bg-green-100 text-green-700", label: "VALIDÉE" }
  }
  if (t.includes("comment") || t.includes("message") || t.includes("chat")) {
    return { icon: "chat_bubble", wrap: "bg-blue-50 text-blue-600", badge: "bg-blue-100 text-blue-700", label: "MESSAGE" }
  }
  if (t.includes("maintenance") || t.includes("alert") || t.includes("alerte")) {
    return { icon: "info", wrap: "bg-orange-50 text-orange-600", badge: "bg-orange-100 text-orange-700", label: "ALERTE" }
  }
  if (t.includes("facture") || t.includes("invoice")) {
    return { icon: "description", wrap: "bg-slate-100 text-slate-600", badge: "bg-slate-200 text-slate-700", label: "FACTURE" }
  }
  return { icon: n.icon ?? "notifications", wrap: "bg-purple-50 text-purple-600", badge: "bg-purple-100 text-purple-700", label: "INFO" }
}

export default function ClientNotifications() {
  const { user } = useAuth()
  const [notifs, setNotifs] = useState<NotifDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (!db || !user?.id) {
      setLoading(false)
      return
    }

    const qUser = query(
      collection(db, COLLECTIONS.notifications),
      where("userId", "==", user.id),
      orderBy("createdAt", "desc"),
      limit(80),
    )

    const unsubUser = onSnapshot(qUser, (snap) => {
      const byUser = snap.docs.map((d) => ({ id: d.id, ...(d.data() as FirestoreNotification) }))
      setNotifs((prev) => {
        const orgIds = new Set(prev.filter((n) => n.organizationId).map((n) => n.id))
        const merged = [...byUser, ...prev.filter((n) => orgIds.has(n.id))]
        const seen = new Set<string>()
        return merged.filter((n) => {
          if (seen.has(n.id)) return false
          seen.add(n.id)
          return true
        })
      })
      setLoading(false)
    })

    let unsubOrg: (() => void) | undefined
    if (user.organizationId) {
      const qOrg = query(
        collection(db, COLLECTIONS.notifications),
        where("organizationId", "==", user.organizationId),
        orderBy("createdAt", "desc"),
        limit(80),
      )
      unsubOrg = onSnapshot(qOrg, (snap) => {
        const byOrg = snap.docs.map((d) => ({ id: d.id, ...(d.data() as FirestoreNotification) }))
        setNotifs((prev) => {
          const merged = [...prev, ...byOrg]
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return notifs
    return notifs.filter((n) => `${n.title ?? ""} ${n.message ?? ""}`.toLowerCase().includes(q))
  }, [notifs, search])

  const unreadCount = filtered.filter((n) => !n.read).length

  const grouped = useMemo(() => {
    const groups: Record<Group, NotifDoc[]> = {
      "Aujourd'hui": [],
      Hier: [],
      "Semaine dernière": [],
    }
    filtered.forEach((n) => groups[getGroup(n.createdAt)].push(n))
    return groups
  }, [filtered])

  async function markRead(n: NotifDoc) {
    if (!db || n.read) return
    await updateDoc(doc(db, COLLECTIONS.notifications, n.id), { read: true })
  }

  async function markAllRead() {
    const firestore = db
    if (!firestore) return
    const unread = filtered.filter((n) => !n.read)
    if (unread.length === 0) return
    setMarking(true)
    try {
      const batch = writeBatch(firestore)
      unread.forEach((n) => batch.update(doc(firestore, COLLECTIONS.notifications, n.id), { read: true }))
      await batch.commit()
    } finally {
      setMarking(false)
    }
  }

  return (
    <DashboardLayout role="client" navItems={clientNav} pageTitle="Centre de Notifications">
      <div className="w-full bg-[#f6f8fa] px-6 py-6 lg:px-10 lg:py-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h2 className="text-3xl font-black tracking-tight text-slate-900">Alertes et Activités</h2>
            <div className="flex w-full items-center gap-3 md:w-auto">
              <div className="relative flex-1 md:w-72">
                <span className="material-symbols-outlined pointer-events-none absolute left-3 top-2.5 text-[20px] text-slate-400">search</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher..."
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-cyan-400"
                />
              </div>
              <button
                type="button"
                onClick={() => void markAllRead()}
                disabled={marking || unreadCount === 0}
                className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">done_all</span>
                {marking ? "En cours..." : "Tout marquer comme lu"}
              </button>
            </div>
          </div>

          <p className="text-slate-500">Gérez vos mises à jour importantes et suivez l'avancement de vos projets.</p>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
              <span className="material-symbols-outlined text-[48px] text-slate-300">notifications_off</span>
              <p className="mt-3 text-lg font-semibold text-slate-900">Aucune notification</p>
              <p className="mt-1 text-sm text-slate-500">Vous êtes à jour ! Revenez plus tard.</p>
            </div>
          ) : (
            GROUP_ORDER.map((group) => {
              const items = grouped[group]
              if (!items.length) return null
              return (
                <section key={group} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{group}</h3>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  <div className="space-y-3">
                    {items.map((n) => {
                      const tone = toneFromNotification(n)
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => void markRead(n)}
                          className={`group relative flex w-full gap-4 rounded-xl border p-5 text-left transition-all ${
                            n.read
                              ? "border-slate-200/70 bg-white/70 hover:border-slate-300 hover:bg-white"
                              : "border-slate-200 bg-white shadow-sm hover:shadow-md"
                          }`}
                        >
                          {!n.read && <span className="absolute right-4 top-4 size-2.5 animate-pulse rounded-full bg-cyan-500" />}
                          <div className={`flex size-12 shrink-0 items-center justify-center rounded-full ${tone.wrap}`}>
                            <span className="material-symbols-outlined text-[20px]">{tone.icon}</span>
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col gap-1 pr-6">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-base font-semibold text-slate-900">{n.title}</span>
                              {!n.read && (
                                <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${tone.badge}`}>{tone.label}</span>
                              )}
                            </div>
                            {n.message && <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">{n.message}</p>}
                            <span className="mt-1 text-xs font-medium text-slate-400">{formatFirestoreDateTime(n.createdAt)}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </section>
              )
            })
          )}

          <div className="mt-4 flex items-center justify-between border-t border-slate-200 py-6 text-xs text-slate-400">
            <p>© 2026 Rodaina Project. Tous droits réservés.</p>
            <div className="flex gap-4">
              <span>Support</span>
              <span>Confidentialité</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
