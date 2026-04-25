import { useEffect, useMemo, useRef, useState } from "react"
import { db } from "@/config/firebase"
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "@/lib/firebase-firestore"
import { COLLECTIONS, type FirestoreNotification, type UserProfile } from "@/data/schema"
import {
  CLIENT_CONV_READ_EVENT,
  firestoreTsToMillis,
  getClientConvReadMs,
} from "@/lib/client-messaging-read"
interface NotifRow extends FirestoreNotification {
  id: string
}

/**
 * Live unread counts for dashboard sidebars (Messagerie + Notifications).
 * Message unread: conversations where the last message is from someone else
 * and is newer than the local read cursor.
 */
export function useClientSidebarBadges(role: string, user: UserProfile | null) {
  const [messageUnread, setMessageUnread] = useState(0)
  const [notifsByUser, setNotifsByUser] = useState<NotifRow[]>([])
  const [notifsByOrg, setNotifsByOrg] = useState<NotifRow[]>([])
  const [readTick, setReadTick] = useState(0)
  const convDocsRef = useRef<{ id: string; data: () => Record<string, unknown> }[]>([])
  const computeMsgUnreadRef = useRef<() => void>(() => {})

  useEffect(() => {
    function onRead() {
      setReadTick((t) => t + 1)
    }
    window.addEventListener(CLIENT_CONV_READ_EVENT, onRead)
    return () => window.removeEventListener(CLIENT_CONV_READ_EVENT, onRead)
  }, [])

  useEffect(() => {
    if (!role || !user?.id || !db) {
      setMessageUnread(0)
      convDocsRef.current = []
      computeMsgUnreadRef.current = () => {}
      return
    }

    const uid = user.id
    const q = query(
      collection(db, COLLECTIONS.conversations),
      where("participantIds", "array-contains", uid),
      orderBy("lastMessageAt", "desc"),
    )

    function computeUnread(): void {
      let n = 0
      for (const d of convDocsRef.current) {
        const data = d.data()
        const lastMillis = firestoreTsToMillis(data.lastMessageAt)
        const lastSender =
          typeof data.lastSenderUserId === "string" ? data.lastSenderUserId : undefined
        const readMs = getClientConvReadMs(uid, d.id)
        if (lastMillis > readMs && lastSender && lastSender !== uid) n += 1
      }
      setMessageUnread(n)
    }

    computeMsgUnreadRef.current = computeUnread

    const unsub = onSnapshot(
      q,
      (snap) => {
        convDocsRef.current = snap.docs
        computeUnread()
      },
      () => {
        convDocsRef.current = []
        setMessageUnread(0)
      },
    )

    return () => {
      unsub()
      convDocsRef.current = []
      computeMsgUnreadRef.current = () => {}
    }
  }, [role, user?.id])

  useEffect(() => {
    if (!role || !user?.id) return
    computeMsgUnreadRef.current()
  }, [readTick, role, user?.id])

  useEffect(() => {
    if (!role || !user?.id || !db) {
      setNotifsByUser([])
      setNotifsByOrg([])
      return
    }

    const qUser = query(
      collection(db, COLLECTIONS.notifications),
      where("userId", "==", user.id),
      orderBy("createdAt", "desc"),
      limit(80),
    )

    const unsubUser = onSnapshot(
      qUser,
      (snap) => {
        setNotifsByUser(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as FirestoreNotification) })),
        )
      },
      () => setNotifsByUser([]),
    )

    let unsubOrg: (() => void) | undefined
    if (user.organizationId) {
      const qOrg = query(
        collection(db, COLLECTIONS.notifications),
        where("organizationId", "==", user.organizationId),
        orderBy("createdAt", "desc"),
        limit(80),
      )
      unsubOrg = onSnapshot(
        qOrg,
        (snap) => {
          setNotifsByOrg(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as FirestoreNotification) })),
          )
        },
        () => setNotifsByOrg([]),
      )
    } else {
      setNotifsByOrg([])
    }

    return () => {
      unsubUser()
      unsubOrg?.()
    }
  }, [role, user?.id, user?.organizationId])

  const notificationUnread = useMemo(() => {
    const merged = new Map<string, NotifRow>()
    for (const n of notifsByUser) merged.set(n.id, n)
    for (const n of notifsByOrg) merged.set(n.id, n)
    return [...merged.values()].filter((n) => n.read !== true).length
  }, [notifsByUser, notifsByOrg])

  return { messageUnread, notificationUnread }
}
