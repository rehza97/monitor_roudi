import { useState, useRef, useEffect } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { engineerNav } from "@/lib/nav"
import type { EngineerMessageRow, EngineerThreadRow } from "@/data/schema"
import { engineerMessengerMessages, engineerMessengerThreads } from "@/data/seed"

type Thread = EngineerThreadRow
type Message = EngineerMessageRow

export default function EngineerMessages() {
  const [threads, setThreads]         = useState<Thread[]>(() => [...engineerMessengerThreads])
  const [messages, setMessages]       = useState<Record<number, Message[]>>(() => structuredClone(engineerMessengerMessages))
  const [selectedId, setSelectedId]   = useState<number>(1)
  const [input, setInput]             = useState("")
  const [search, setSearch]           = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  const selected = threads.find(t => t.id === selectedId)!

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [selectedId, messages])

  function selectThread(id: number) {
    setSelectedId(id)
    setThreads(prev => prev.map(t => t.id === id ? { ...t, unread: 0 } : t))
  }

  function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    const now = new Date().toLocaleTimeString("fr-DZ", { hour: "2-digit", minute: "2-digit" })
    const newMsg: Message = {
      id:       Date.now(),
      from:     "Moi",
      initials: "ML",
      color:    "bg-blue-600",
      text,
      time:     now,
      mine:     true,
    }
    setMessages(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] ?? []), newMsg] }))
    setThreads(prev => prev.map(t => t.id === selectedId ? { ...t, last: text, time: now } : t))
    setInput("")
  }

  const filtered = threads.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.role.toLowerCase().includes(search.toLowerCase())
  )

  const currentMessages = messages[selectedId] ?? []

  return (
    <DashboardLayout role="engineer" navItems={engineerNav} pageTitle="Messagerie">
      <div className="flex h-[calc(100vh-64px)]">
        {/* Thread list */}
        <div className="w-72 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Rechercher..."
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map(t => (
              <button
                key={t.id}
                onClick={() => selectThread(t.id)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800 ${selectedId === t.id ? "bg-blue-50 dark:bg-blue-900/10" : ""}`}
              >
                <div className={`size-9 rounded-full ${t.color} text-white text-xs font-bold flex items-center justify-center shrink-0`}>{t.initials}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{t.name}</p>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">{t.time}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{t.last}</p>
                </div>
                {t.unread > 0 && (
                  <span className="size-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{t.unread}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 min-w-0">
          <div className="flex items-center gap-3 px-5 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            <div className={`size-9 rounded-full ${selected.color} text-white text-xs font-bold flex items-center justify-center shrink-0`}>{selected.initials}</div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white text-sm">{selected.name}</p>
              <p className="text-xs text-slate-400">{selected.role}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {currentMessages.map(m => (
              <div key={m.id} className={`flex items-end gap-2.5 ${m.mine ? "flex-row-reverse" : ""}`}>
                {!m.mine && (
                  <div className={`size-7 rounded-full ${m.color} text-white text-[10px] font-bold flex items-center justify-center shrink-0 mb-0.5`}>{m.initials}</div>
                )}
                <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${m.mine ? "bg-blue-600 text-white rounded-br-sm" : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-bl-sm"}`}>
                  {m.text}
                  <p className={`text-[10px] mt-1 ${m.mine ? "text-blue-200" : "text-slate-400"}`}>{m.time}</p>
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
        </div>
      </div>
    </DashboardLayout>
  )
}
