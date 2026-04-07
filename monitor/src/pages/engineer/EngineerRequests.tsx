import { useState, useEffect } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { engineerNav } from "@/lib/nav"
import { Link, useNavigate } from "react-router-dom"
import { db } from "@/config/firebase"
import {
  collection, query, where, orderBy, limit,
  onSnapshot, updateDoc, doc, serverTimestamp,
} from "@/lib/firebase-firestore"
import { COLLECTIONS } from "@/data/schema"
import type { FirestoreOrder } from "@/data/schema"
import { formatFirestoreDate } from "@/lib/utils"

interface Order extends FirestoreOrder { id: string }

const statusColors: Record<string, string> = {
  "En attente": "text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400",
  "Validée":    "text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400",
  "En cours":   "text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400",
  "Rejetée":    "text-rose-700 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400",
  "Livré":      "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400",
}

const priorityColors: Record<string, string> = {
  Haute:   "text-rose-600",
  Normale: "text-blue-600",
  Basse:   "text-slate-500",
}

const ENGINEER_STATUSES = ["En cours", "Livré"]
const ALL_STATUSES = ["Tous", "En attente", "Validée", "En cours", "Livré", "Rejetée"]

interface ProcessModalProps {
  order: Order
  onClose: () => void
  onSave: (status: string, comment: string) => Promise<void>
}

function ProcessModal({ order, onClose, onSave }: ProcessModalProps) {
  const [status, setStatus]   = useState(order.status)
  const [comment, setComment] = useState(order.adminComment ?? "")
  const [saving, setSaving]   = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try { await onSave(status, comment); onClose() } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-900 dark:text-white">Traiter la demande</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Details */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Client</span>
            <span className="font-medium text-slate-900 dark:text-white">{order.clientLabel ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Type</span>
            <span className="font-medium text-slate-900 dark:text-white">{order.requestType ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Priorité</span>
            <span className={`font-medium ${priorityColors[order.priority ?? ""] ?? "text-slate-900 dark:text-white"}`}>{order.priority ?? "—"}</span>
          </div>
          {order.description && (
            <div>
              <span className="text-slate-500">Description</span>
              <p className="mt-1 text-slate-700 dark:text-slate-300 text-xs">{order.description}</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Statut</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {ENGINEER_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Commentaire technique</label>
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Ajouter un commentaire technique…" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold disabled:opacity-60">
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function EngineerRequests() {
  const navigate = useNavigate()
  const [orders, setOrders]       = useState<Order[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState("")
  const [statusFilter, setStatus] = useState("Tous")
  const [processing, setProc]     = useState<Order | null>(null)

  useEffect(() => {
    if (!db) return
    const q = query(
      collection(db, COLLECTIONS.orders),
      where("kind", "==", "client_request"),
      orderBy("createdAt", "desc"),
      limit(100),
    )
    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...(d.data() as FirestoreOrder) })))
      setLoading(false)
    })
    return unsub
  }, [])

  async function handleSave(status: string, comment: string) {
    if (!db || !processing) return
    await updateDoc(doc(db, COLLECTIONS.orders, processing.id), {
      status,
      adminComment: comment,
      updatedAt: serverTimestamp(),
    })
  }

  const filtered = orders.filter(o => {
    const matchStatus = statusFilter === "Tous" || o.status === statusFilter
    const term = search.toLowerCase()
    const matchSearch = !term ||
      (o.clientLabel ?? "").toLowerCase().includes(term) ||
      (o.requestType ?? "").toLowerCase().includes(term) ||
      o.id.toLowerCase().includes(term)
    return matchStatus && matchSearch
  })

  return (
    <DashboardLayout role="engineer" navItems={engineerNav} pageTitle="Demandes">
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Demandes clients</h2>
            <p className="text-slate-500 text-sm mt-0.5">{orders.length} demande{orders.length !== 1 ? "s" : ""} au total</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 flex-wrap">
            {ALL_STATUSES.map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}>
                {s}
              </button>
            ))}
          </div>
          <div className="relative ml-auto w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Rechercher…" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <span className="material-symbols-outlined text-[48px]">assignment</span>
              <p className="text-sm">Aucune demande trouvée.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Réf.</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Priorité</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{o.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">{o.clientLabel ?? "—"}</td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">{o.requestType ?? "—"}</td>
                      <td className="px-5 py-3.5">
                        {o.priority ? (
                          <span className={`font-medium ${priorityColors[o.priority] ?? "text-slate-600"}`}>{o.priority}</span>
                        ) : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[o.status] ?? statusColors["En attente"]}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">{formatFirestoreDate(o.createdAt)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setProc(o)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors">
                            Traiter →
                          </button>
                          <Link to={`/engineer/requests/${o.id}`}
                            className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            Détails
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {processing && (
        <ProcessModal
          order={processing}
          onClose={() => setProc(null)}
          onSave={handleSave}
        />
      )}
    </DashboardLayout>
  )
}
