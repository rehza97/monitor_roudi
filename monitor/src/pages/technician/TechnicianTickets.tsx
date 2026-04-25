import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { technicianNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import {
  collection,
  onSnapshot,
  query,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  where,
} from "@/lib/firebase-firestore"
import { COLLECTIONS } from "@/data/schema"
import type { FirestoreSupportTicket } from "@/data/schema"
import { canTechnicianAccessTicket } from "@/lib/access-control"
import { formatFirestoreDate } from "@/lib/utils"

interface TicketDoc extends FirestoreSupportTicket {
  id: string
}

const STATUS_COLORS: Record<string, string> = {
  "Ouvert":   "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "En cours": "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "Résolu":   "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "Fermé":    "bg-slate-500/15 text-slate-400 border-slate-500/30",
}

const PRIORITY_COLORS: Record<string, string> = {
  "Urgente": "bg-rose-500/15 text-rose-400 border-rose-500/30",
  "Haute":   "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "Normale": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "Basse":   "bg-slate-500/15 text-slate-400 border-slate-500/30",
}

const STATUS_OPTIONS = ["Tous", "Ouvert", "En cours", "Résolu", "Fermé"] as const
const PRIORITY_OPTIONS = ["Toutes", "Urgente", "Haute", "Normale", "Basse"] as const

type NewTicketForm = {
  subject: string
  description: string
  priority: FirestoreSupportTicket["priority"]
  organizationId: string
}

const EMPTY_FORM: NewTicketForm = {
  subject: "",
  description: "",
  priority: "Normale",
  organizationId: "",
}

export default function TechnicianTickets() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [tickets, setTickets] = useState<TicketDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "")
  const [statusFilter, setStatusFilter] = useState<string>("Tous")
  const [priorityFilter, setPriorityFilter] = useState<string>("Toutes")
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<NewTicketForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setSearch(searchParams.get("q") ?? "")
  }, [searchParams])

  useEffect(() => {
    if (!db || !user?.id) {
      setLoading(false)
      return
    }

    let assignedRows: TicketDoc[] = []
    let unassignedRows: TicketDoc[] = []
    let assignedLoaded = false
    let unassignedLoaded = false
    const sync = () => {
      if (!assignedLoaded || !unassignedLoaded) return
      const byId = new Map<string, TicketDoc>()
      assignedRows.forEach((ticket) => byId.set(ticket.id, ticket))
      unassignedRows.forEach((ticket) => byId.set(ticket.id, ticket))
      setTickets(
        Array.from(byId.values())
          .filter((t) => canTechnicianAccessTicket(t, user.id))
          .sort((a, b) => {
            const aMs = typeof a.createdAt === "object" && a.createdAt && "toDate" in a.createdAt
              ? (a.createdAt as { toDate: () => Date }).toDate().getTime()
              : 0
            const bMs = typeof b.createdAt === "object" && b.createdAt && "toDate" in b.createdAt
              ? (b.createdAt as { toDate: () => Date }).toDate().getTime()
              : 0
            return bMs - aMs
          }),
      )
      setLoading(false)
    }

    const assignedQ = query(collection(db, COLLECTIONS.supportTickets), where("assignedToId", "==", user.id))
    const unassignedQ = query(collection(db, COLLECTIONS.supportTickets), where("assignedToId", "==", null))
    const unsubAssigned = onSnapshot(assignedQ, (snap) => {
      assignedRows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as FirestoreSupportTicket) }))
      assignedLoaded = true
      sync()
    })
    const unsubUnassigned = onSnapshot(unassignedQ, (snap) => {
      unassignedRows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as FirestoreSupportTicket) }))
      unassignedLoaded = true
      sync()
    })
    return () => {
      unsubAssigned()
      unsubUnassigned()
    }
  }, [user?.id])

  const filtered = tickets.filter((t) => {
    const q = search.toLowerCase()
    const matchSearch =
      t.subject.toLowerCase().includes(q) ||
      (t.organizationId ?? "").toLowerCase().includes(q)
    const matchStatus   = statusFilter === "Tous" || t.status === statusFilter
    const matchPriority = priorityFilter === "Toutes" || t.priority === priorityFilter
    return matchSearch && matchStatus && matchPriority
  })

  async function handleTakeOver(e: React.MouseEvent, ticket: TicketDoc) {
    e.stopPropagation()
    if (!db || !user) return
    await updateDoc(doc(db, COLLECTIONS.supportTickets, ticket.id), {
      status: "En cours",
      assignedToId: user.id,
      updatedAt: serverTimestamp(),
    })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!db || !user || !form.subject.trim()) return
    setSaving(true)
    try {
      await addDoc(collection(db, COLLECTIONS.supportTickets), {
        subject: form.subject.trim(),
        description: form.description.trim(),
        priority: form.priority,
        status: "Ouvert",
        createdByUserId: user.id,
        assignedToId: null,
        organizationId: form.organizationId.trim() || undefined,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as Omit<FirestoreSupportTicket, "id">)
      setForm(EMPTY_FORM)
      setShowModal(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout role="technician" navItems={technicianNav} pageTitle="Interventions">
      <div className="p-6 space-y-5">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
              placeholder="Rechercher un ticket…"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
          >
            {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
          >
            {PRIORITY_OPTIONS.map((p) => <option key={p}>{p}</option>)}
          </select>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 h-10 rounded-lg text-white text-sm font-semibold transition-colors"
            style={{ backgroundColor: "#db143c" }}
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nouveau ticket
          </button>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {loading ? (
            <div className="p-8 flex justify-center">
              <span className="material-symbols-outlined animate-spin text-slate-400 text-[32px]">progress_activity</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    {["Réf.", "Sujet", "Priorité", "Statut", "Client/Org", "Date", "Actions"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                        <span className="material-symbols-outlined text-[32px] block mb-2 opacity-40">search_off</span>
                        Aucun ticket trouvé
                      </td>
                    </tr>
                  ) : (
                    filtered.map((t) => (
                      <tr
                        key={t.id}
                        onClick={() => navigate(`/technician/tickets/${t.id}`)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-slate-400 whitespace-nowrap">
                          {t.id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white max-w-[200px]">
                          <span className="truncate block">{t.subject}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_COLORS[t.priority] ?? ""}`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[t.status] ?? ""}`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 max-w-[140px]">
                          <span className="truncate block">{t.organizationId ?? "—"}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {formatFirestoreDate(t.createdAt)}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            {t.status === "Ouvert" && (
                              <button
                                onClick={(e) => handleTakeOver(e, t)}
                                className="text-xs px-2.5 py-1 rounded-lg font-semibold bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors whitespace-nowrap"
                              >
                                Accepter
                              </button>
                            )}
                            <Link
                              to={`/technician/tickets/${t.id}`}
                              className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-0.5 whitespace-nowrap"
                            >
                              Voir <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <p className="text-xs text-slate-400 text-right">{filtered.length} résultat{filtered.length !== 1 ? "s" : ""}</p>
      </div>

      {/* New ticket modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Nouveau ticket</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Sujet *</label>
                <input
                  required
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
                  placeholder="Ex: Panne réseau bureau 3"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none dark:text-white"
                  placeholder="Décrivez le problème…"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Priorité</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as FirestoreSupportTicket["priority"] }))}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
                  >
                    <option>Basse</option>
                    <option>Normale</option>
                    <option>Haute</option>
                    <option>Urgente</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Organisation</label>
                  <input
                    value={form.organizationId}
                    onChange={(e) => setForm((f) => ({ ...f, organizationId: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
                    placeholder="ID ou nom"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.subject.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-white text-sm font-bold rounded-lg disabled:opacity-60 transition-colors"
                  style={{ backgroundColor: "#db143c" }}
                >
                  {saving ? (
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  )}
                  {saving ? "Création…" : "Créer le ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
