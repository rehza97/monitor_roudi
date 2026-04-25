import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { clientNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp,
} from "@/lib/firebase-firestore"
import { COLLECTIONS, type FirestoreSupportTicket } from "@/data/schema"
import { formatFirestoreDate } from "@/lib/utils"

interface TicketDoc extends FirestoreSupportTicket {
  id: string
}

const statusColor: Record<string, string> = {
  "Ouvert":   "text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400",
  "En cours": "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
  "Résolu":   "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Fermé":    "text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-300",
}

const priorityColor: Record<string, string> = {
  "Urgente": "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400",
  "Haute":   "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
  "Normale": "text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400",
  "Basse":   "text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-300",
}

const INPUT_CLS =
  "w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#db143c]"
const TEXTAREA_CLS =
  "w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#db143c] resize-none"
const LABEL_CLS = "text-sm font-medium text-slate-700 dark:text-slate-300"

interface ModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (
    subject: string,
    description: string,
    priority: string,
    topic: "software" | "material" | "unknown",
  ) => Promise<void>
  saving: boolean
}

function NewTicketModal({ open, onClose, onSubmit, saving }: ModalProps) {
  const [subject, setSubject]       = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority]     = useState("Normale")
  const [topic, setTopic]           = useState<"software" | "material" | "unknown">("unknown")

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim()) return
    await onSubmit(subject.trim(), description.trim(), priority, topic)
    setSubject("")
    setDescription("")
    setPriority("Normale")
    setTopic("unknown")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-900 dark:text-white text-lg">Nouveau ticket</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className={LABEL_CLS}>
              Sujet <span className="text-rose-500">*</span>
            </label>
            <input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={INPUT_CLS}
              placeholder="Décrivez brièvement votre problème"
            />
          </div>

          <div className="space-y-1.5">
            <label className={LABEL_CLS}>Type de ticket</label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value as "software" | "material" | "unknown")}
              className={INPUT_CLS}
            >
              <option value="software">Software</option>
              <option value="material">Matériel</option>
              <option value="unknown">Je ne sais pas</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={LABEL_CLS}>Priorité</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className={INPUT_CLS}
            >
              <option>Basse</option>
              <option>Normale</option>
              <option>Haute</option>
              <option>Urgente</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={LABEL_CLS}>Description</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={TEXTAREA_CLS}
              placeholder="Décrivez le problème en détail, les étapes pour le reproduire…"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving || !subject.trim()}
              className="flex-1 h-10 bg-[#db143c] text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined text-[16px]">hourglass_empty</span>
                  Envoi…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  Envoyer le ticket
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-10 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-sm"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ClientSupport() {
  const { user } = useAuth()

  const [tickets, setTickets] = useState<TicketDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successId, setSuccessId] = useState<string | null>(null)

  useEffect(() => {
    if (!db || !user?.id || !user?.organizationId) {
      setLoading(false)
      return
    }

    const constraints: Parameters<typeof query>[1][] = [
      where("organizationId", "==", user.organizationId),
      where("createdByUserId", "==", user.id),
      orderBy("createdAt", "desc"),
    ]

    const q = query(collection(db, COLLECTIONS.supportTickets), ...constraints)

    const unsub = onSnapshot(q, (snap) => {
      const byUser = snap.docs.map((d) => ({ id: d.id, ...(d.data() as FirestoreSupportTicket) }))
      setTickets(byUser)
      setLoading(false)
    })

    return () => unsub()
  }, [user?.id, user?.organizationId])

  async function handleCreate(
    subject: string,
    description: string,
    priority: string,
    topic: "software" | "material" | "unknown",
  ) {
    if (!db || !user?.id) return
    setSaving(true)
    try {
      const ref = await addDoc(collection(db, COLLECTIONS.supportTickets), {
        subject,
        description,
        topic,
        priority: priority as FirestoreSupportTicket["priority"],
        status: "Ouvert",
        createdByUserId: user.id,
        assignedToId: null,
        organizationId: user.organizationId ?? "",
        createdAt: serverTimestamp(),
      } as FirestoreSupportTicket)
      setSuccessId(ref.id)
      setShowModal(false)
      setTimeout(() => setSuccessId(null), 4000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout role="client" navItems={clientNav} pageTitle="Support & Maintenance">
      <div className="p-6 w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Mes tickets</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#db143c] text-white text-sm font-semibold rounded-lg hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nouveau ticket
          </button>
        </div>

        {/* Success toast */}
        {successId && (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
            <span className="material-symbols-outlined text-emerald-500 text-[20px]">check_circle</span>
            <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
              Ticket créé avec succès ! Notre équipe vous répondra sous 24h.
            </p>
          </div>
        )}

        {/* Ticket list */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {loading ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                  <div className="size-9 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
                  </div>
                  <div className="h-6 w-16 bg-slate-100 dark:bg-slate-800 rounded-full" />
                  <div className="h-6 w-16 bg-slate-100 dark:bg-slate-800 rounded-full" />
                </div>
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14">
              <span className="material-symbols-outlined text-[40px] text-slate-300 dark:text-slate-600">
                support_agent
              </span>
              <p className="font-semibold text-slate-900 dark:text-white">Aucun ticket ouvert</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">
                Vous n'avez pas encore de ticket de support. Créez-en un si vous rencontrez un problème.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-1 px-4 py-2 bg-[#db143c] text-white text-sm font-semibold rounded-lg hover:opacity-90"
              >
                Ouvrir un ticket
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  {/* Icon */}
                  <div className="size-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-slate-500 text-[18px]">
                      confirmation_number
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {t.subject}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t.id.slice(0, 8).toUpperCase()} · {formatFirestoreDate(t.createdAt)}
                    </p>
                  </div>

                  {/* Badges */}
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${priorityColor[t.priority] ?? "text-slate-600 bg-slate-100"}`}
                  >
                    {t.priority}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                      t.topic === "software"
                        ? "text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400"
                        : t.topic === "material"
                          ? "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400"
                          : "text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {t.topic === "software" ? "Software" : t.topic === "material" ? "Matériel" : "Je ne sais pas"}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${statusColor[t.status] ?? "text-slate-600 bg-slate-100"}`}
                  >
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contact urgence */}
        <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800 rounded-xl p-5 flex items-center gap-4">
          <div className="size-12 rounded-full bg-[#db143c] flex items-center justify-center text-white shrink-0">
            <span className="material-symbols-outlined text-[22px]">support_agent</span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-900 dark:text-white">Besoin d'aide urgente ?</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Appelez notre support 24/7 :{" "}
              <span className="font-semibold text-[#db143c]">+213 21 23 45 67</span>
            </p>
          </div>
        </div>
      </div>

      <NewTicketModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreate}
        saving={saving}
      />
    </DashboardLayout>
  )
}
