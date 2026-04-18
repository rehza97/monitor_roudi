import { useEffect, useMemo, useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { technicianNav } from "@/lib/nav"
import { useParams, Link } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import { COLLECTIONS, type FirestoreSupportTicket } from "@/data/schema"
import { doc, getDoc, serverTimestamp, updateDoc } from "@/lib/firebase-firestore"
import { canTechnicianAccessTicket } from "@/lib/access-control"
import { formatFirestoreDateTime } from "@/lib/utils"

type ChecklistItem = { label: string; done: boolean }

type TicketDoc = FirestoreSupportTicket & {
  id: string
  checklist?: ChecklistItem[]
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { label: "Vérifier l'alimentation du switch", done: false },
  { label: "Tester la connectivité réseau", done: false },
  { label: "Remplacer le matériel défaillant", done: false },
  { label: "Mettre à jour la configuration", done: false },
  { label: "Valider avec le client", done: false },
]

function parseChecklist(raw: unknown): ChecklistItem[] {
  if (!Array.isArray(raw)) return DEFAULT_CHECKLIST
  const rows = raw
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const obj = item as Record<string, unknown>
      if (typeof obj.label !== "string" || !obj.label.trim()) return null
      return { label: obj.label.trim(), done: !!obj.done }
    })
    .filter((v): v is ChecklistItem => v !== null)
  return rows.length > 0 ? rows : DEFAULT_CHECKLIST
}

function statusBadge(status: string): string {
  if (status === "Ouvert") return "text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400"
  if (status === "En cours") return "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400"
  if (status === "Résolu") return "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400"
  return "text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300"
}

export default function TechnicianTicketDetail() {
  const { user } = useAuth()
  const { id } = useParams()
  const [ticket, setTicket] = useState<TicketDoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState("")
  const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle")
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      if (!db || !id) {
        setLoading(false)
        return
      }
      const snap = await getDoc(doc(db, COLLECTIONS.supportTickets, id))
      if (!snap.exists()) {
        setLoading(false)
        return
      }
      const data = snap.data() as FirestoreSupportTicket & { checklist?: unknown }
      if (!canTechnicianAccessTicket(data, user?.id)) {
        setTicket(null)
      } else {
        setTicket({ id: snap.id, ...data, checklist: parseChecklist(data.checklist) })
        setReport(typeof data.report === "string" ? data.report : "")
        setChecklist(parseChecklist(data.checklist))
      }
      setLoading(false)
    }
    void load()
  }, [id, user?.id])

  const done = useMemo(() => checklist.filter((i) => i.done).length, [checklist])

  async function persist(patch: Record<string, unknown>) {
    if (!db || !id) return
    await updateDoc(doc(db, COLLECTIONS.supportTickets, id), {
      ...patch,
      updatedAt: serverTimestamp(),
    })
  }

  async function toggleChecklistItem(index: number) {
    const next = checklist.map((x, idx) => (idx === index ? { ...x, done: !x.done } : x))
    setChecklist(next)
    try {
      await persist({ checklist: next })
    } catch {
      setError("Impossible de sauvegarder la checklist.")
    }
  }

  async function handleSaveReport() {
    if (!report.trim()) return
    setSaveState("saving")
    setError("")
    try {
      await persist({ report: report.trim() })
      setSaveState("saved")
      setTimeout(() => setSaveState("idle"), 1800)
    } catch {
      setSaveState("idle")
      setError("Impossible de sauvegarder le rapport.")
    }
  }

  if (loading) {
    return (
      <DashboardLayout role="technician" navItems={technicianNav} pageTitle="Détails du ticket">
        <div className="p-6 text-sm text-slate-500">Chargement du ticket…</div>
      </DashboardLayout>
    )
  }

  if (!ticket) {
    return (
      <DashboardLayout role="technician" navItems={technicianNav} pageTitle="Détails du ticket">
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-500">Ticket introuvable.</p>
          <Link to="/technician/tickets" className="text-sm text-amber-600 hover:underline">Retour aux interventions</Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="technician" navItems={technicianNav} pageTitle="Détails du ticket">
      <div className="p-6 w-full space-y-6">
        <Link to="/technician/tickets" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Retour aux interventions
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{ticket.subject}</h2>
            <p className="text-slate-500 text-sm mt-1">Ticket {ticket.id.slice(0, 8)} · Org: {ticket.organizationId ?? "—"}</p>
          </div>
          <span className={`text-sm font-semibold px-3 py-1.5 rounded-full shrink-0 ${statusBadge(ticket.status)}`}>{ticket.priority}</span>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Description du problème</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">{ticket.description || "Aucune description."}</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">Rapport d'intervention</h3>
              <textarea
                rows={4}
                value={report}
                onChange={(e) => {
                  setReport(e.target.value)
                  if (saveState === "saved") setSaveState("idle")
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                placeholder="Décrivez les actions réalisées…"
              />
              {saveState === "saved" && (
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Rapport sauvegardé
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => void handleSaveReport()}
                  disabled={saveState === "saving" || !report.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">{saveState === "saving" ? "hourglass_empty" : "save"}</span>
                  {saveState === "saving" ? "Sauvegarde…" : "Sauvegarder"}
                </button>
                <Link
                  to={`/technician/tickets/${id}/validate`}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>Valider l'intervention
                </Link>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 dark:text-white">Checklist</h3>
                <span className="text-xs font-bold text-amber-600">{done}/{checklist.length}</span>
              </div>
              <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${(done / Math.max(1, checklist.length)) * 100}%` }} />
              </div>
              <div className="space-y-2 pt-1">
                {checklist.map((item, i) => (
                  <label key={item.label + i} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => void toggleChecklistItem(i)}
                      className="size-4 rounded accent-amber-500 cursor-pointer"
                    />
                    <span className={`text-sm ${item.done ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-300"}`}>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Infos</h3>
              {[
                { label: "Statut", value: ticket.status },
                { label: "Priorité", value: ticket.priority },
                { label: "Créé le", value: formatFirestoreDateTime(ticket.createdAt) },
                { label: "Dernière MAJ", value: formatFirestoreDateTime(ticket.updatedAt) },
                { label: "Assigné à", value: ticket.assignedToId ?? "—" },
              ].map((i) => (
                <div key={i.label} className="flex justify-between text-sm">
                  <span className="text-slate-500">{i.label}</span>
                  <span className="font-medium text-slate-900 dark:text-white text-right ml-2">{i.value}</span>
                </div>
              ))}
            </div>
            <Link to="/technician/remote" className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-colors">
              <span className="material-symbols-outlined text-[18px]">settings_remote</span>Accès distant
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
