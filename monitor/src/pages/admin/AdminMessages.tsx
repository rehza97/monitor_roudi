import { useState, useRef, useEffect } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import type { AdminConversationRow, AdminMessageRow } from "@/data/schema"
import { adminMessengerConversations, adminMessengerThreads } from "@/data/seed"

type Conversation = AdminConversationRow
type Message = AdminMessageRow

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
}

export default function AdminMessages() {
  const [conversations, setConversations] = useState<Conversation[]>(() => [...adminMessengerConversations])
  const [messages, setMessages]           = useState<Record<number, Message[]>>(() => structuredClone(adminMessengerThreads))
  const [selectedId, setSelectedId]       = useState<number | null>(null)
  const [input, setInput]                 = useState("")
  const [search, setSearch]               = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  const selected = conversations.find(c => c.id === selectedId) ?? null

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [selectedId, messages])

  function selectConversation(id: number) {
    setSelectedId(id)
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c))
  }

  function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId || !input.trim()) return
    const now = new Date().toLocaleTimeString("fr-DZ", { hour: "2-digit", minute: "2-digit" })
    const msg: Message = { id: Date.now(), from: "Moi", initials: "AR", text: input.trim(), time: now, mine: true }
    setMessages(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] ?? []), msg] }))
    setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, last: input.trim(), time: now } : c))
    setInput("")
  }

  const filtered = conversations.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.role.toLowerCase().includes(search.toLowerCase())
  )

  const currentMessages = selectedId ? (messages[selectedId] ?? []) : []
  const totalUnread = conversations.reduce((n, c) => n + c.unread, 0)

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Messagerie Administrative">
      <div className="flex h-[calc(100vh-64px)]">
        {/* Thread list */}
        <div className="w-72 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Conversations</p>
              {totalUnread > 0 && (
                <span className="size-5 rounded-full bg-[#db143c] text-white text-[10px] font-bold flex items-center justify-center">{totalUnread}</span>
              )}
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">search</span>
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
                onClick={() => selectConversation(c.id)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${selectedId === c.id ? "bg-rose-50 dark:bg-rose-900/10" : ""}`}
              >
                <div className="size-9 rounded-full bg-[#db143c] flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {getInitials(c.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{c.name}</p>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-1">{c.time}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{c.role} · {c.last}</p>
                </div>
                {c.unread > 0 && (
                  <span className="size-5 rounded-full bg-[#db143c] text-white text-xs font-bold flex items-center justify-center shrink-0">{c.unread}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        {selected ? (
          <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <div className="size-9 rounded-full bg-[#db143c] text-white text-xs font-bold flex items-center justify-center shrink-0">
                {getInitials(selected.name)}
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white text-sm">{selected.name}</p>
                <p className="text-xs text-slate-400">{selected.role}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {currentMessages.map(m => (
                <div key={m.id} className={`flex items-end gap-2.5 ${m.mine ? "flex-row-reverse" : ""}`}>
                  {!m.mine && (
                    <div className="size-7 rounded-full bg-[#db143c] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mb-0.5">
                      {m.initials}
                    </div>
                  )}
                  <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${m.mine ? "bg-[#db143c] text-white rounded-br-sm" : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-bl-sm"}`}>
                    {m.text}
                    <p className={`text-[10px] mt-1 ${m.mine ? "text-red-200" : "text-slate-400"}`}>{m.time}</p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
              <form className="flex items-center gap-2" onSubmit={sendMessage}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  className="flex-1 h-10 px-4 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#db143c]"
                  placeholder="Écrire un message..."
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
    </DashboardLayout>
  )
}
