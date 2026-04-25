import { useEffect, useMemo, useRef, useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { technicianNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import { COLLECTIONS } from "@/data/schema"
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "@/lib/firebase-firestore"

type ConversationRow = {
  id: string
  name: string
  role: string
  last: string
  time: string
  unread: number
  color: string
  initials: string
  participantNames: Record<string, string>
  support?: boolean
}

type MessageBubble = {
  id: string
  senderUserId: string
  text: string
  time: string
  mine: boolean
  initials: string
  color: string
}

const DEFAULT_AVATAR = "bg-slate-500"
const SUPPORT_CONVERSATION_NAME = "Support Rodaina"

function roleLabel(role: string): string {
  switch (role) {
    case "admin":
      return "Administrateur"
    case "client":
      return "Client"
    case "engineer":
      return "Ingénieur"
    case "technician":
      return "Technicien"
    default:
      return "Utilisateur"
  }
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return "??"
}

function formatListTime(ts: unknown): string {
  if (ts && typeof ts === "object" && "toDate" in ts && typeof (ts as { toDate: () => Date }).toDate === "function") {
    return (ts as { toDate: () => Date }).toDate().toLocaleString("fr-DZ", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }
  return ""
}

function formatBubbleTime(ts: unknown): string {
  if (ts && typeof ts === "object" && "toDate" in ts && typeof (ts as { toDate: () => Date }).toDate === "function") {
    return (ts as { toDate: () => Date }).toDate().toLocaleTimeString("fr-DZ", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }
  return ""
}

export default function TechnicianMessages() {
  const { user } = useAuth()
  const uid = user?.id

  const [threads, setThreads] = useState<ConversationRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageBubble[]>([])
  const [input, setInput] = useState("")
  const [search, setSearch] = useState("")
  const [creatingConversation, setCreatingConversation] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const selected = useMemo(() => threads.find((t) => t.id === selectedId) ?? null, [threads, selectedId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [selectedId, messages])

  useEffect(() => {
    if (!db || !uid) return

    const q = query(
      collection(db, COLLECTIONS.conversations),
      where("participantIds", "array-contains", uid),
      orderBy("lastMessageAt", "desc"),
    )

    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>
        const participantNames =
          data.participantNames && typeof data.participantNames === "object"
            ? (data.participantNames as Record<string, string>)
            : {}

        const participantIds = Array.isArray(data.participantIds)
          ? (data.participantIds as unknown[]).filter((v): v is string => typeof v === "string")
          : []

        const otherId = participantIds.find((id) => id !== uid) ?? ""
        const name =
          (typeof data.name === "string" && data.name.trim())
            ? data.name.trim()
            : participantNames[otherId] ?? "Contact"
        const lastSender = typeof data.lastSenderUserId === "string" ? data.lastSenderUserId : ""

        return {
          id: d.id,
          name,
          role: roleLabel(typeof data.otherRoleHint === "string" ? data.otherRoleHint : ""),
          last: typeof data.lastMessageText === "string" ? data.lastMessageText : "",
          time: formatListTime(data.lastMessageAt),
          unread: lastSender && lastSender !== uid ? 1 : 0,
          color: DEFAULT_AVATAR,
          initials: initialsFromName(name),
          participantNames,
          support: data.support === true,
        } satisfies ConversationRow
      })

      setThreads(rows)
      setSelectedId((prev) => prev ?? rows[0]?.id ?? null)
    })

    return () => unsub()
  }, [uid])

  useEffect(() => {
    if (!db || !selectedId || !uid) {
      setMessages([])
      return
    }

    const mq = query(
      collection(db, COLLECTIONS.conversations, selectedId, COLLECTIONS.messages),
      orderBy("createdAt", "asc"),
    )

    const unsub = onSnapshot(mq, (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>
        const senderUserId = typeof data.senderUserId === "string" ? data.senderUserId : ""
        const mine = senderUserId === uid
        const senderName =
          mine
            ? "Moi"
            : selected?.participantNames[senderUserId] ?? selected?.name ?? "Contact"
        return {
          id: d.id,
          senderUserId,
          text: typeof data.body === "string" ? data.body : "",
          time: formatBubbleTime(data.createdAt),
          mine,
          initials: initialsFromName(senderName),
          color: DEFAULT_AVATAR,
        } satisfies MessageBubble
      })
      setMessages(list)
    })

    return () => unsub()
  }, [selectedId, uid, selected?.name, selected?.participantNames])

  function selectThread(id: string) {
    setSelectedId(id)
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, unread: 0 } : t)))
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!db || !uid || !selectedId || !text) return

    setInput("")

    const msgCol = collection(db, COLLECTIONS.conversations, selectedId, COLLECTIONS.messages)
    await addDoc(msgCol, {
      senderUserId: uid,
      body: text,
      createdAt: serverTimestamp(),
    })

    await updateDoc(doc(db, COLLECTIONS.conversations, selectedId), {
      lastMessageAt: serverTimestamp(),
      lastMessageText: text,
      lastSenderUserId: uid,
    })
  }

  async function startSupportConversation() {
    if (!db || !uid || !user) return
    const existing = threads.find((thread) => thread.support || thread.name === SUPPORT_CONVERSATION_NAME)
    if (existing) {
      setSelectedId(existing.id)
      return
    }

    setCreatingConversation(true)
    try {
      const introText = "Bonjour, j'ai besoin d'assistance terrain."
      const ref = await addDoc(collection(db, COLLECTIONS.conversations), {
        participantIds: [uid],
        participantNames: {
          [uid]: user.name,
          support: SUPPORT_CONVERSATION_NAME,
        },
        name: SUPPORT_CONVERSATION_NAME,
        support: true,
        createdByUserId: uid,
        lastMessageAt: serverTimestamp(),
        lastMessageText: introText,
        lastSenderUserId: uid,
        createdAt: serverTimestamp(),
      } as Record<string, unknown>)

      await addDoc(collection(db, COLLECTIONS.conversations, ref.id, COLLECTIONS.messages), {
        senderUserId: uid,
        senderName: user.name,
        body: introText,
        text: introText,
        createdAt: serverTimestamp(),
      })
      setSelectedId(ref.id)
    } finally {
      setCreatingConversation(false)
    }
  }

  const filtered = threads.filter((t) => {
    const q = search.toLowerCase()
    return t.name.toLowerCase().includes(q) || t.role.toLowerCase().includes(q)
  })

  return (
    <DashboardLayout role="technician" navItems={technicianNav} pageTitle="Messagerie">
      <div className="flex h-[calc(100vh-64px)]">
        <div className="w-72 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => void startSupportConversation()}
              disabled={creatingConversation}
              className="mb-3 w-full h-9 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[15px]">
                {creatingConversation ? "hourglass_empty" : "add_comment"}
              </span>
              {creatingConversation ? "Création…" : "Démarrer support"}
            </button>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Rechercher..."
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-sm text-slate-400 px-4 text-center gap-3">
                <p>Aucune conversation.</p>
                <button
                  type="button"
                  onClick={() => void startSupportConversation()}
                  disabled={creatingConversation}
                  className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold disabled:opacity-60"
                >
                  Démarrer support
                </button>
              </div>
            ) : null}
            {filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => selectThread(t.id)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800 ${
                  selectedId === t.id ? "bg-blue-50 dark:bg-blue-900/10" : ""
                }`}
              >
                <div className={`size-9 rounded-full ${t.color} text-white text-xs font-bold flex items-center justify-center shrink-0`}>
                  {t.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{t.name}</p>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">{t.time}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{t.last || "—"}</p>
                </div>
                {t.unread > 0 ? (
                  <span className="size-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {t.unread}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 min-w-0">
          {!selected ? (
            <div className="h-full flex items-center justify-center text-sm text-slate-400 px-4 text-center">
              Sélectionnez une conversation.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-5 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className={`size-9 rounded-full ${selected.color} text-white text-xs font-bold flex items-center justify-center shrink-0`}>
                  {selected.initials}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">{selected.name}</p>
                  <p className="text-xs text-slate-400">{selected.role}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {messages.map((m) => (
                  <div key={m.id} className={`flex items-end gap-2.5 ${m.mine ? "flex-row-reverse" : ""}`}>
                    {!m.mine ? (
                      <div className={`size-7 rounded-full ${m.color} text-white text-[10px] font-bold flex items-center justify-center shrink-0 mb-0.5`}>
                        {m.initials}
                      </div>
                    ) : null}
                    <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${m.mine ? "bg-blue-600 text-white rounded-br-sm" : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-bl-sm"}`}>
                      {m.text}
                      <p className={`text-[10px] mt-1 ${m.mine ? "text-blue-200" : "text-slate-400"}`}>{m.time}</p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <div className="px-4 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                <form className="flex items-center gap-2" onSubmit={(e) => void sendMessage(e)}>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 h-10 px-4 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Écrire un message..."
                  />
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="size-10 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white transition-colors shrink-0"
                  >
                    <span className="material-symbols-outlined text-[20px]">send</span>
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
