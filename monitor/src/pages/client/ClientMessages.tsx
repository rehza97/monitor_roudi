import { useState, useRef, useEffect } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { clientNav } from "@/lib/nav"
import type { ClientConversationRow, ClientMessageRow } from "@/data/schema"
import { clientMessengerConversations, clientMessengerThreads } from "@/data/seed"

type Message = ClientMessageRow
type Conv = ClientConversationRow

export default function ClientMessages() {
  const [convs,    setConvs]    = useState<Conv[]>(() => [...clientMessengerConversations])
  const [threads,  setThreads]  = useState<Record<number, Message[]>>(() => structuredClone(clientMessengerThreads))
  const [activeId, setActiveId] = useState(1)
  const [msg,      setMsg]      = useState("")
  const [search,   setSearch]   = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  const activeConv = convs.find(c => c.id === activeId)!
  const messages   = threads[activeId] ?? []

  const filteredConvs = convs.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.lastMsg.toLowerCase().includes(search.toLowerCase())
  )

  function selectConv(id: number) {
    setActiveId(id)
    setConvs(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c))
  }

  function sendMessage() {
    const text = msg.trim()
    if (!text) return
    const now = new Date()
    const time = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`
    const newMsg: Message = { from: "Moi", text, time, mine: true }
    setThreads(prev => ({ ...prev, [activeId]: [...(prev[activeId] ?? []), newMsg] }))
    setConvs(prev => prev.map(c => c.id === activeId ? { ...c, lastMsg: text, time } : c))
    setMsg("")
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const totalUnread = convs.reduce((s, c) => s + c.unread, 0)

  return (
    <DashboardLayout role="client" navItems={clientNav} pageTitle="Messagerie">
      <div className="flex h-[calc(100vh-64px)]">
        {/* Conversation list */}
        <div className="w-72 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">Messages</span>
              {totalUnread > 0 && (
                <span className="size-5 rounded-full bg-cyan-600 text-white text-xs font-bold flex items-center justify-center">{totalUnread}</span>
              )}
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">search</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none"
                placeholder="Rechercher…"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {filteredConvs.map((c) => (
              <button
                key={c.id}
                onClick={() => selectConv(c.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left ${c.id === activeId ? "bg-cyan-50 dark:bg-cyan-900/10" : ""}`}
              >
                <div className="size-9 rounded-full bg-cyan-600 flex items-center justify-center text-white text-xs font-bold shrink-0">{c.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className={`text-sm truncate ${c.unread > 0 ? "font-bold text-slate-900 dark:text-white" : "font-semibold text-slate-900 dark:text-white"}`}>{c.name}</p>
                    <span className="text-xs text-slate-400 shrink-0">{c.time}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{c.lastMsg}</p>
                </div>
                {c.unread > 0 && <span className="size-5 rounded-full bg-cyan-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{c.unread}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Chat panel */}
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3 px-5 h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
            <div className="size-8 rounded-full bg-cyan-600 flex items-center justify-center text-white text-xs font-bold">{activeConv.avatar}</div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{activeConv.name}</p>
              <p className="text-xs text-emerald-500 flex items-center gap-1"><span className="size-1.5 rounded-full bg-emerald-500" />En ligne</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${m.mine ? "bg-cyan-600 text-white rounded-br-sm" : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-bl-sm"}`}>
                  <p>{m.text}</p>
                  <p className={`text-xs mt-1 ${m.mine ? "text-cyan-200" : "text-slate-400"}`}>{m.time}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="flex items-center gap-3 px-5 py-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
            <button className="size-9 flex items-center justify-center text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined text-[20px]">attach_file</span>
            </button>
            <input
              value={msg}
              onChange={e => setMsg(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 h-10 px-4 rounded-full bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none"
              placeholder="Écrire un message…"
            />
            <button
              onClick={sendMessage}
              disabled={!msg.trim()}
              className="size-9 rounded-full bg-cyan-600 flex items-center justify-center text-white hover:bg-cyan-700 disabled:opacity-40 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
