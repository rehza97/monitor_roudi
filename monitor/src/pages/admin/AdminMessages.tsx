import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db, isFirebaseConfigured } from "@/config/firebase"
import { COLLECTIONS } from "@/data/schema"
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from "@/lib/firebase-firestore"

type FirestoreTimestamp = { toMillis: () => number; toDate: () => Date }

function isTimestamp(v: unknown): v is FirestoreTimestamp {
  return (
    typeof v === "object" &&
    v !== null &&
    "toMillis" in v &&
    typeof (v as FirestoreTimestamp).toMillis === "function"
  )
}

function formatListTime(ts: unknown): string {
  if (!isTimestamp(ts)) return ""
  return ts.toDate().toLocaleString("fr-DZ", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

function formatBubbleTime(ts: unknown): string {
  if (!isTimestamp(ts)) return ""
  return ts.toDate().toLocaleTimeString("fr-DZ", { hour: "2-digit", minute: "2-digit" })
}

function readKey(conversationId: string) {
  return `adminConvRead:${conversationId}`
}

function getReadMs(conversationId: string): number {
  const raw = localStorage.getItem(readKey(conversationId))
  const n = raw ? Number(raw) : 0
  return Number.isFinite(n) ? n : 0
}

function markRead(conversationId: string, lastMillis: number) {
  const prev = getReadMs(conversationId)
  if (lastMillis > prev) localStorage.setItem(readKey(conversationId), String(lastMillis))
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

type ConversationRow = {
  id: string
  name: string
  role: string
  last: string
  time: string
  unread: number
  lastMillis: number
  participantIds: string[]
  participantNames: Record<string, string>
}

type MessageBubble = {
  id: string
  from: string
  initials: string
  text: string
  time: string
  mine: boolean
}

type PickableUser = { id: string; name: string; email: string; role: string }

function roleLabel(role: string) {
  switch (role) {
    case "client":
      return "Client"
    case "engineer":
      return "Ingénieur"
    case "technician":
      return "Technicien"
    case "admin":
      return "Administrateur"
    default:
      return role
  }
}

export default function AdminMessages() {
  const { user } = useAuth()
  const uid = user?.id

  const [conversationRows, setConversationRows] = useState<ConversationRow[]>([])
  const [messagesByConv, setMessagesByConv] = useState<Record<string, MessageBubble[]>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [search, setSearch] = useState("")
  const [firestoreError, setFirestoreError] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [pickUsers, setPickUsers] = useState<PickableUser[]>([])
  const [pickLoading, setPickLoading] = useState(false)
  const [pickSearch, setPickSearch] = useState("")
  const [creating, setCreating] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const convMetaRef = useRef<Map<string, { lastMillis: number; lastSender?: string }>>(new Map())
  const hydratedRef = useRef(false)
  const selectedIdRef = useRef<string | null>(null)
  selectedIdRef.current = selectedId

  const selected = conversationRows.find(c => c.id === selectedId) ?? null

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [selectedId, messagesByConv])

  useEffect(() => {
    if (!db || !isFirebaseConfigured || !uid) return
    const firestore = db

    const q = query(collection(firestore, COLLECTIONS.conversations), orderBy("lastMessageAt", "desc"))

    const unsub = onSnapshot(
      q,
      snap => {
        setFirestoreError(null)
        const rows: ConversationRow[] = []
        const prevMeta = convMetaRef.current
        const nextMeta = new Map<string, { lastMillis: number; lastSender?: string }>()

        snap.forEach(d => {
          const data = d.data() as Record<string, unknown>
          const participantIds = Array.isArray(data.participantIds)
            ? (data.participantIds as unknown[]).filter((x): x is string => typeof x === "string")
            : []
          const participantNames =
            data.participantNames && typeof data.participantNames === "object" && data.participantNames !== null
              ? (data.participantNames as Record<string, string>)
              : {}

          const otherId = participantIds.find(id => id !== uid) ?? participantIds[0] ?? "?"
          const name =
            participantNames[otherId] ||
            (otherId === uid ? user?.name ?? "Moi" : `Utilisateur ${otherId.slice(0, 6)}…`)
          const role = roleLabel(typeof data.otherRoleHint === "string" ? data.otherRoleHint : "client")

          const lastAt = data.lastMessageAt
          const lastMillis = isTimestamp(lastAt) ? lastAt.toMillis() : 0
          const lastText = typeof data.lastMessageText === "string" ? data.lastMessageText : ""
          const lastSender =
            typeof data.lastSenderUserId === "string" ? data.lastSenderUserId : undefined

          const readMs = getReadMs(d.id)
          const unread = lastMillis > readMs && lastSender && lastSender !== uid ? 1 : 0

          rows.push({
            id: d.id,
            name,
            role,
            last: lastText || "—",
            time: formatListTime(lastAt),
            unread,
            lastMillis,
            participantIds,
            participantNames,
          })

          const old = prevMeta.get(d.id)
          nextMeta.set(d.id, { lastMillis, lastSender })

          if (
            hydratedRef.current &&
            old &&
            lastMillis > old.lastMillis &&
            lastSender &&
            lastSender !== uid &&
            d.id !== selectedIdRef.current
          ) {
            const preview = lastText.length > 80 ? `${lastText.slice(0, 80)}…` : lastText
            toast.message(name, { description: preview || "Nouveau message" })
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              if (document.visibilityState !== "visible") {
                new Notification(`Message — ${name}`, {
                  body: preview || "Nouveau message",
                  tag: d.id,
                })
              }
            }

            const targets = participantIds.filter(id => id !== lastSender)
            for (const targetUid of targets) {
              if (targetUid === uid) continue
              addDoc(collection(firestore, COLLECTIONS.notifications), {
                userId: targetUid,
                kind: "chat",
                read: false,
                title: name,
                body: preview || "Nouveau message",
                conversationId: d.id,
                createdAt: serverTimestamp(),
              }).catch(() => {})
            }
          }
        })

        convMetaRef.current = nextMeta
        hydratedRef.current = true
        setConversationRows(rows)
      },
      err => setFirestoreError(err.message)
    )

    return () => unsub()
  }, [db, uid, user?.name])

  useEffect(() => {
    if (!db || !isFirebaseConfigured || !selectedId) {
      return
    }
    const firestore = db

    const mq = query(
      collection(firestore, COLLECTIONS.conversations, selectedId, COLLECTIONS.messages),
      orderBy("createdAt", "asc")
    )

    const unsub = onSnapshot(
      mq,
      snap => {
        const list: MessageBubble[] = []
        snap.forEach(d => {
          const data = d.data() as Record<string, unknown>
          const sender = typeof data.senderUserId === "string" ? data.senderUserId : ""
          const body = typeof data.body === "string" ? data.body : ""
          const mine = sender === uid
          const fromName = mine ? "Moi" : selected?.participantNames[sender] || "Contact"
          list.push({
            id: d.id,
            from: fromName,
            initials: getInitials(fromName),
            text: body,
            time: formatBubbleTime(data.createdAt),
            mine,
          })
        })
        setMessagesByConv(prev => ({ ...prev, [selectedId]: list }))

        let maxMillis = 0
        snap.forEach(d => {
          const data = d.data() as Record<string, unknown>
          const c = data.createdAt
          if (isTimestamp(c)) maxMillis = Math.max(maxMillis, c.toMillis())
        })
        if (maxMillis > 0) markRead(selectedId, maxMillis)
      },
      () => {}
    )

    return () => unsub()
  }, [db, selectedId, uid, selected?.participantNames])

  const openNewConversation = useCallback(async () => {
    if (!db || !isFirebaseConfigured || !uid) return
    setNewOpen(true)
    setPickLoading(true)
    setPickSearch("")
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.users))
      const list: PickableUser[] = []
      snap.forEach(d => {
        if (d.id === uid) return
        const data = d.data() as Record<string, unknown>
        const role = typeof data.role === "string" ? data.role : "client"
        const email = typeof data.email === "string" ? data.email : ""
        const name = typeof data.name === "string" && data.name.trim() ? data.name.trim() : email || d.id
        list.push({ id: d.id, name, email, role })
      })
      list.sort((a, b) => a.name.localeCompare(b.name, "fr"))
      setPickUsers(list)
    } catch {
      toast.error("Impossible de charger les utilisateurs.")
    } finally {
      setPickLoading(false)
    }
  }, [db, uid])

  async function startConversationWith(other: PickableUser) {
    if (!db || !uid || !user) return
    const myName = user.name
    const ids = [uid, other.id].sort()
    const existing = conversationRows.find(
      r => r.participantIds.length === 2 && [...r.participantIds].sort().join() === ids.join()
    )
    if (existing) {
      setSelectedId(existing.id)
      setNewOpen(false)
      toast.info("Conversation existante ouverte.")
      return
    }

    setCreating(true)
    try {
      const participantNames: Record<string, string> = {
        [uid]: myName,
        [other.id]: other.name,
      }
      const ref = await addDoc(collection(db, COLLECTIONS.conversations), {
        participantIds: [uid, other.id],
        participantNames,
        organizationId: user.organizationId ?? null,
        otherRoleHint: other.role,
        lastMessageAt: serverTimestamp(),
        lastMessageText: "",
        lastSenderUserId: uid,
        createdAt: serverTimestamp(),
      })
      setSelectedId(ref.id)
      markRead(ref.id, Date.now())
      setNewOpen(false)
      toast.success("Conversation créée.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Création impossible.")
    } finally {
      setCreating(false)
    }
  }

  function selectConversation(id: string) {
    setSelectedId(id)
    const row = conversationRows.find(c => c.id === id)
    if (row && row.lastMillis) markRead(id, row.lastMillis)
    setConversationRows(prev => prev.map(c => (c.id === id ? { ...c, unread: 0 } : c)))
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!db || !selectedId || !input.trim() || !uid || !user) return

    const text = input.trim()
    setInput("")

    const convRef = doc(db, COLLECTIONS.conversations, selectedId)
    const msgCol = collection(db, COLLECTIONS.conversations, selectedId, COLLECTIONS.messages)
    const msgRef = doc(msgCol)
    const row = conversationRows.find(c => c.id === selectedId)
    const targets = (row?.participantIds ?? []).filter(id => id !== uid)

    try {
      const batch = writeBatch(db)
      batch.set(msgRef, {
        senderUserId: uid,
        body: text,
        createdAt: serverTimestamp(),
      })
      batch.update(convRef, {
        lastMessageAt: serverTimestamp(),
        lastMessageText: text,
        lastSenderUserId: uid,
      })
      await batch.commit()

      for (const targetUid of targets) {
        await addDoc(collection(db, COLLECTIONS.notifications), {
          userId: targetUid,
          kind: "chat",
          read: false,
          title: user.name,
          body: text.length > 120 ? `${text.slice(0, 120)}…` : text,
          conversationId: selectedId,
          createdAt: serverTimestamp(),
        })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Envoi impossible.")
      setInput(text)
    }
  }

  const filtered = conversationRows.filter(
    c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.role.toLowerCase().includes(search.toLowerCase())
  )

  const currentMessages = selectedId ? (messagesByConv[selectedId] ?? []) : []
  const totalUnread = conversationRows.reduce((n, c) => n + c.unread, 0)

  const filteredPick = pickUsers.filter(
    u =>
      u.name.toLowerCase().includes(pickSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(pickSearch.toLowerCase())
  )

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Messagerie Administrative">
      <div className="flex h-[calc(100vh-64px)]">
        <div className="w-72 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">Conversations</p>
                {totalUnread > 0 && (
                  <span className="size-5 rounded-full bg-[#db143c] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {totalUnread}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={openNewConversation}
                className="shrink-0 text-xs font-semibold text-[#db143c] hover:underline"
              >
                Nouveau
              </button>
            </div>
            {firestoreError && (
              <p className="text-[11px] text-amber-700 dark:text-amber-400">{firestoreError}</p>
            )}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">
                search
              </span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#db143c]"
                placeholder="Rechercher…"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => selectConversation(c.id)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                  selectedId === c.id ? "bg-rose-50 dark:bg-rose-900/10" : ""
                }`}
              >
                <div className="size-9 rounded-full bg-[#db143c] flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {getInitials(c.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{c.name}</p>
                    <span className="text-[10px] text-slate-400 shrink-0">{c.time}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {c.role} · {c.last}
                  </p>
                </div>
                {c.unread > 0 && (
                  <span className="size-5 rounded-full bg-[#db143c] text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {c.unread}
                  </span>
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-4 py-8 text-sm text-center text-slate-400">
                Aucune conversation. Utilisez « Nouveau » pour en démarrer une.
              </p>
            )}
          </div>
        </div>

        {selected ? (
          <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 min-w-0">
            <div className="flex items-center gap-3 px-5 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <div className="size-9 rounded-full bg-[#db143c] text-white text-xs font-bold flex items-center justify-center shrink-0">
                {getInitials(selected.name)}
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white text-sm">{selected.name}</p>
                <p className="text-xs text-slate-400">{selected.role}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {currentMessages.map(m => (
                <div key={m.id} className={`flex items-end gap-2.5 ${m.mine ? "flex-row-reverse" : ""}`}>
                  {!m.mine && (
                    <div className="size-7 rounded-full bg-[#db143c] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mb-0.5">
                      {m.initials}
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                      m.mine
                        ? "bg-[#db143c] text-white rounded-br-sm"
                        : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-bl-sm"
                    }`}
                  >
                    {m.text}
                    <p className={`text-[10px] mt-1 ${m.mine ? "text-red-200" : "text-slate-400"}`}>{m.time}</p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="px-4 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
              <form className="flex items-center gap-2" onSubmit={sendMessage}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  className="flex-1 h-10 px-4 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#db143c]"
                  placeholder="Écrire un message…"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="size-10 flex items-center justify-center rounded-xl bg-[#db143c] hover:opacity-90 disabled:opacity-40 text-white transition-opacity shrink-0"
                >
                  <span className="material-symbols-outlined text-[20px]">send</span>
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
            <div className="text-center">
              <span className="material-symbols-outlined text-slate-300 text-[48px] block mb-2">chat</span>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Sélectionnez une conversation</p>
            </div>
          </div>
        )}
      </div>

      {newOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => !creating && setNewOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-md max-h-[min(80vh,520px)] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Nouvelle conversation</h3>
              <button type="button" onClick={() => setNewOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-3 border-b border-slate-100 dark:border-slate-800">
              <input
                value={pickSearch}
                onChange={e => setPickSearch(e.target.value)}
                placeholder="Rechercher par nom ou email…"
                className="w-full h-9 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm"
              />
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {pickLoading ? (
                <p className="p-6 text-center text-sm text-slate-400">Chargement…</p>
              ) : (
                filteredPick.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    disabled={creating}
                    onClick={() => startConversationWith(u)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 disabled:opacity-50"
                  >
                    <div className="size-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold">
                      {getInitials(u.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{u.name}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {roleLabel(u.role)} · {u.email}
                      </p>
                    </div>
                  </button>
                ))
              )}
              {!pickLoading && filteredPick.length === 0 && (
                <p className="p-6 text-center text-sm text-slate-400">Aucun utilisateur.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
