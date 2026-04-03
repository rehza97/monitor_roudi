import { useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { clientNav } from "@/lib/nav"
import type { SupportTicketRow } from "@/data/schema"
import { supportTickets } from "@/data/seed"

type Ticket = SupportTicketRow
type FormState = "idle" | "submitting" | "done"

const priorityColor: Record<string, string> = {
  "Haute":   "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400",
  "Normale": "text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400",
  "Basse":   "text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-400",
}
const statusColor: Record<string, string> = {
  "En cours": "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
  "Résolu":   "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400",
}

export default function ClientSupport() {
  const [tickets, setTickets]   = useState<Ticket[]>(() => [...supportTickets])
  const [subject, setSubject]   = useState("")
  const [app,     setApp]       = useState("")
  const [priority,setPriority]  = useState("Normale")
  const [desc,    setDesc]      = useState("")
  const [state,   setState]     = useState<FormState>("idle")
  const [lastId,  setLastId]    = useState("TKT-012")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !app) return
    setState("submitting")
    setTimeout(() => {
      const num = parseInt(lastId.split("-")[1]) + 1
      const newId = `TKT-${String(num).padStart(3, "0")}`
      const today = new Date()
      const date = `${today.getDate().toString().padStart(2,"0")} ${["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"][today.getMonth()]} ${today.getFullYear()}`
      setTickets(prev => [{ id: newId, subject: subject.trim(), priority, status: "En cours", date }, ...prev])
      setLastId(newId)
      setState("done")
    }, 1200)
  }

  function resetForm() {
    setSubject(""); setApp(""); setPriority("Normale"); setDesc(""); setState("idle")
  }

  return (
    <DashboardLayout role="client" navItems={clientNav} pageTitle="Support & Maintenance">
      <div className="p-6 space-y-6 max-w-4xl">
        {/* New ticket */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          {state === "done" ? (
            <div className="flex flex-col items-center py-6 gap-4">
              <div className="size-14 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-600 text-[28px]">check_circle</span>
              </div>
              <p className="font-semibold text-slate-900 dark:text-white">Ticket envoyé !</p>
              <p className="text-sm text-slate-500 text-center">Notre équipe traite votre demande sous 24h.</p>
              <button onClick={resetForm} className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-lg">
                Nouveau ticket
              </button>
            </div>
          ) : (
            <>
              <h3 className="font-semibold text-slate-900 dark:text-white">Ouvrir un ticket</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Sujet <span className="text-rose-500">*</span></label>
                  <input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    required
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600"
                    placeholder="Décrivez brièvement votre problème"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Application concernée <span className="text-rose-500">*</span></label>
                    <select
                      value={app}
                      onChange={e => setApp(e.target.value)}
                      required
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none"
                    >
                      <option value="">Sélectionner…</option>
                      <option>EcoTrack Pro</option><option>DevMonitor X</option><option>SecureGate</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Priorité</label>
                    <select
                      value={priority}
                      onChange={e => setPriority(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none"
                    >
                      <option>Normale</option><option>Haute</option><option>Urgente</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                  <textarea
                    rows={4}
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600 resize-none"
                    placeholder="Décrivez le problème en détail…"
                  />
                </div>
                <button
                  type="submit"
                  disabled={state === "submitting" || !subject.trim() || !app}
                  className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 text-white text-sm font-bold rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {state === "submitting" ? "hourglass_empty" : "send"}
                  </span>
                  {state === "submitting" ? "Envoi…" : "Envoyer le ticket"}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Recent tickets */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-white">Tickets récents</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {tickets.map((t) => (
              <div key={t.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{t.subject}</p>
                  <p className="text-xs text-slate-400">{t.id} · {t.date}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${priorityColor[t.priority]}`}>{t.priority}</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[t.status]}`}>{t.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-cyan-50 dark:bg-cyan-900/10 border border-cyan-200 dark:border-cyan-800 rounded-xl p-5 flex items-center gap-4">
          <div className="size-12 rounded-full bg-cyan-600 flex items-center justify-center text-white shrink-0">
            <span className="material-symbols-outlined text-[24px]">support_agent</span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-900 dark:text-white">Besoin d'aide urgente ?</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Appelez notre support 24/7 : <span className="font-semibold text-cyan-700 dark:text-cyan-400">+213 21 23 45 67</span></p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
