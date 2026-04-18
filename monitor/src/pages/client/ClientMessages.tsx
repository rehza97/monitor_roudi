import { useState, useEffect, useRef } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { clientNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import {
  onSnapshot,
  addDoc,
  updateDoc,
  collection,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "@/lib/firebase-firestore"
import { COLLECTIONS } from "@/data/schema"
import { firestoreTsToMillis, markClientConversationRead } from "@/lib/client-messaging-read"

// ─── Types ────────────────────────────────────────────────────────────────────

interface FirestoreConversation {
  participantIds: string[]
  participantNames?: Record<string, string>
  lastMessage?: string
  lastMessageText?: string
  lastMessageAt?: unknown
  lastSenderUserId?: string
  name?: string
  createdAt?: unknown
}

interface ConversationDoc extends FirestoreConversation {
  id: string
}

interface FirestoreMessage {
  text: string
  senderUserId: string
  senderName: string
  createdAt?: unknown
}

interface MessageDoc extends FirestoreMessage {
  id: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function firestoreToTime(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const d = (value as { toDate: () => Date }).toDate()
    if (d instanceof Date && !Number.isNaN(d.getTime())) {
      const now = new Date()
      const diff = now.getTime() - d.getTime()
      if (diff < 60_000) return "À l'instant"
      if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min`
      if (diff < 86_400_000) {
        return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
      }
      return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
    }
  }
  return ""
}

function getConvDisplayName(
  conv: ConversationDoc,
  myId: string,
): string {
  if (conv.name) return conv.name
  if (conv.participantNames) {
    const otherEntry = Object.entries(conv.participantNames).find(
      ([uid]) => uid !== myId,
    )
    if (otherEntry) return otherEntry[1]
  }
  return "Conversation"
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2)
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
  if (parts.length === 1 && parts[0].length >= 2)
    return parts[0].slice(0, 2).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClientMessages() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<ConversationDoc[]>([])
  const [messages, setMessages] = useState<MessageDoc[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [msgText, setMsgText] = useState("")
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  // ── Conversations listener ────────────────────────────────────────────────
  useEffect(() => {
    if (!db || !user?.id) {
      setLoadingConvs(false)
      return
    }

    const q = query(
      collection(db, COLLECTIONS.conversations),
      where("participantIds", "array-contains", user.id),
      orderBy("lastMessageAt", "desc"),
    )

    const unsub = onSnapshot(q, (snap) => {
      const docs: ConversationDoc[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as FirestoreConversation),
      }))
      setConversations(docs)
      setLoadingConvs(false)

      // Auto-select first conversation
      if (!activeConvId && docs.length > 0) {
        setActiveConvId(docs[0].id)
      }
    })

    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // ── Messages listener ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!db || !activeConvId) {
      setMessages([])
      return
    }

    setLoadingMsgs(true)

    const q = query(
      collection(db, COLLECTIONS.conversations, activeConvId, COLLECTIONS.messages),
      orderBy("createdAt", "asc"),
    )

    const unsub = onSnapshot(q, (snap) => {
      const docs: MessageDoc[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as FirestoreMessage),
      }))
      setMessages(docs)
      setLoadingMsgs(false)

      let maxMillis = 0
      snap.docs.forEach((d) => {
        const data = d.data() as { createdAt?: unknown }
        maxMillis = Math.max(maxMillis, firestoreTsToMillis(data.createdAt))
      })
      if (user?.id && activeConvId && maxMillis > 0) {
        markClientConversationRead(user.id, activeConvId, maxMillis)
      }
    })

    return unsub
  }, [activeConvId, user?.id])

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ── Send message ──────────────────────────────────────────────────────────
  async function sendMessage() {
    const text = msgText.trim()
    if (!text || !db || !user || !activeConvId) return
    setSending(true)
    try {
      const msgsRef = collection(
        db,
        COLLECTIONS.conversations,
        activeConvId,
        COLLECTIONS.messages,
      )
      await addDoc(msgsRef as Parameters<typeof addDoc>[0], {
        text,
        senderUserId: user.id,
        senderName: user.name,
        createdAt: serverTimestamp(),
      } as Record<string, unknown>)

      const convRef = doc(db, COLLECTIONS.conversations, activeConvId)
      await updateDoc(convRef, {
        lastMessage: text,
        lastMessageText: text,
        lastMessageAt: serverTimestamp(),
        lastSenderUserId: user.id,
      } as Record<string, unknown>)

      setMsgText("")
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void sendMessage()
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const activeConv = conversations.find((c) => c.id === activeConvId) ?? null

  const filteredConvs = conversations.filter((c) => {
    if (!search) return true
    const name = getConvDisplayName(c, user?.id ?? "")
    return (
      name.toLowerCase().includes(search.toLowerCase()) ||
      (c.lastMessage ?? "").toLowerCase().includes(search.toLowerCase())
    )
  })

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout role="client" navItems={clientNav} pageTitle="Messagerie">
      <div className="flex h-[calc(100vh-64px)]">
        {/* ── Left panel: conversation list ─────────────────────────────── */}
        <div className="w-72 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
          {/* Search header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              Messages
            </p>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">
                search
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-400"
                placeholder="Rechercher…"
              />
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {loadingConvs && (
              <div className="space-y-0 divide-y divide-slate-100 dark:divide-slate-800">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
                    <div className="size-9 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loadingConvs && filteredConvs.length === 0 && (
              <div className="py-12 px-4 flex flex-col items-center text-center">
                <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-[40px] mb-2">
                  chat_bubble
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Aucune conversation. Contactez le support.
                </p>
              </div>
            )}

            {!loadingConvs &&
              filteredConvs.map((conv) => {
                const name = getConvDisplayName(conv, user?.id ?? "")
                const initials = getInitials(name)
                const isActive = conv.id === activeConvId
                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left ${
                      isActive
                        ? "bg-rose-50 dark:bg-rose-900/10 border-l-2 border-[#db143c]"
                        : ""
                    }`}
                  >
                    <div className="size-9 rounded-full bg-[#db143c] flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {name}
                        </p>
                        <span className="text-xs text-slate-400 shrink-0 ml-2">
                          {firestoreToTime(conv.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {conv.lastMessage ?? "—"}
                      </p>
                    </div>
                  </button>
                )
              })}
          </div>
        </div>

        {/* ── Right panel: chat ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 min-w-0">
          {!activeConv ? (
            /* No conversation selected */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-[56px] mb-4">
                forum
              </span>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                {conversations.length === 0
                  ? "Aucune conversation. Contactez le support."
                  : "Sélectionnez une conversation pour afficher les messages."}
              </p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-5 h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                <div className="size-8 rounded-full bg-[#db143c] flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {getInitials(getConvDisplayName(activeConv, user?.id ?? ""))}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {getConvDisplayName(activeConv, user?.id ?? "")}
                  </p>
                  <p className="text-xs text-emerald-500 flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    En ligne
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {loadingMsgs && (
                  <div className="space-y-3">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className={`flex ${n % 2 === 0 ? "justify-end" : "justify-start"} animate-pulse`}
                      >
                        <div className="h-9 bg-slate-200 dark:bg-slate-700 rounded-2xl w-48" />
                      </div>
                    ))}
                  </div>
                )}

                {!loadingMsgs && messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-[40px] mb-2">
                      chat
                    </span>
                    <p className="text-xs text-slate-400">
                      Aucun message. Commencez la conversation.
                    </p>
                  </div>
                )}

                {!loadingMsgs &&
                  messages.map((msg) => {
                    const mine = msg.senderUserId === user?.id
                    const senderInitials = mine
                      ? (user?.initials ?? getInitials(user?.name ?? ""))
                      : getInitials(msg.senderName)
                    const avatarColor = mine ? "#db143c" : "#64748b"
                    return (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}
                      >
                        {/* Their avatar */}
                        {!mine && (
                          <div
                            className="size-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mb-1"
                            style={{ backgroundColor: avatarColor }}
                          >
                            {senderInitials}
                          </div>
                        )}

                        <div className={`max-w-xs lg:max-w-md ${mine ? "items-end" : "items-start"} flex flex-col`}>
                          {!mine && (
                            <p className="text-xs text-slate-400 mb-1 ml-1">
                              {msg.senderName}
                            </p>
                          )}
                          <div
                            className={`px-4 py-2.5 text-sm ${
                              mine
                                ? "bg-[#db143c] text-white rounded-2xl rounded-br-sm"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl rounded-bl-sm"
                            }`}
                          >
                            <p>{msg.text}</p>
                            <p
                              className={`text-[10px] mt-1 ${mine ? "text-rose-200" : "text-slate-400"}`}
                            >
                              {firestoreToTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>

                        {/* My avatar */}
                        {mine && (
                          <div
                            className="size-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mb-1"
                            style={{ backgroundColor: user?.avatarColor ?? "#db143c" }}
                          >
                            {user?.initials ?? getInitials(user?.name ?? "")}
                          </div>
                        )}
                      </div>
                    )
                  })}
                <div ref={bottomRef} />
              </div>

              {/* Input bar */}
              <div className="flex items-center gap-3 px-5 py-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <input
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                  className="flex-1 h-10 px-4 rounded-full bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none disabled:opacity-60 placeholder:text-slate-400"
                  placeholder="Écrire un message…"
                />
                <button
                  onClick={() => void sendMessage()}
                  disabled={!msgText.trim() || sending}
                  className="size-9 rounded-full bg-[#db143c] flex items-center justify-center text-white hover:bg-[#b01030] disabled:opacity-40 transition-colors"
                >
                  {sending ? (
                    <span className="material-symbols-outlined text-[16px] animate-spin">
                      progress_activity
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">send</span>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
