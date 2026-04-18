import { useState, useEffect } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { engineerNav } from "@/lib/nav"
import { useParams, Link } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import { doc, getDoc, updateDoc, serverTimestamp } from "@/lib/firebase-firestore"
import { COLLECTIONS } from "@/data/schema"
import type { FirestoreOrder } from "@/data/schema"
import { canEngineerAccessOrder } from "@/lib/access-control"
import { formatFirestoreDate } from "@/lib/utils"

interface Order extends FirestoreOrder { id: string }

const STATUS_STEPS = ["En attente", "Validée", "En cours", "Livré"]
const ENGINEER_STATUSES = ["En cours", "Livré"]

const statusColors: Record<string, string> = {
  "En attente": "text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400",
  "Validée":    "text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400",
  "En cours":   "text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400",
  "Rejetée":    "text-rose-700 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400",
  "Livré":      "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400",
}

export default function EngineerRequestDetail() {
  const { user } = useAuth()
  const { id } = useParams<{ id: string }>()
  const [order, setOrder]     = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNF]     = useState(false)
  const [status, setStatus]   = useState("")
  const [comment, setComment] = useState("")
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  useEffect(() => {
    if (!db || !id) return
    getDoc(doc(db, COLLECTIONS.orders, id)).then(snap => {
      if (!snap.exists()) { setNF(true); setLoading(false); return }
      const data = { id: snap.id, ...(snap.data() as FirestoreOrder) }
      if (!canEngineerAccessOrder(data, user?.id)) {
        setNF(true)
      } else {
        setOrder(data)
        setStatus(data.status)
        setComment(data.adminComment ?? "")
      }
      setLoading(false)
    })
  }, [id, user?.id])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!db || !id || !order || !user?.id) return
    setSaving(true)
    try {
      await updateDoc(doc(db, COLLECTIONS.orders, id), {
        status,
        adminComment: comment,
        assignedToId: user.id,
        updatedAt: serverTimestamp(),
      })
      setOrder(prev => prev ? { ...prev, status, adminComment: comment } : prev)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const stepIndex = STATUS_STEPS.indexOf(order?.status ?? "")

  if (loading) {
    return (
      <DashboardLayout role="engineer" navItems={engineerNav} pageTitle="Détail">
        <div className="flex items-center justify-center h-64 text-slate-400">
          <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
        </div>
      </DashboardLayout>
    )
  }

  if (notFound || !order) {
    return (
      <DashboardLayout role="engineer" navItems={engineerNav} pageTitle="Introuvable">
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-400">
          <span className="material-symbols-outlined text-[48px]">search_off</span>
          <p className="text-sm">Demande introuvable.</p>
          <Link to="/engineer/requests" className="text-blue-600 text-sm hover:underline">← Retour aux demandes</Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="engineer" navItems={engineerNav} pageTitle="Détail de la demande">
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Back + header */}
        <div>
          <Link to="/engineer/requests" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 mb-4 transition-colors">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Retour aux demandes
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{order.clientLabel ?? "Client inconnu"}</h2>
              <p className="text-slate-500 text-sm mt-0.5">Réf. {order.id.slice(0, 8).toUpperCase()} · {formatFirestoreDate(order.createdAt)}</p>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 ${statusColors[order.status] ?? statusColors["En attente"]}`}>
              {order.status}
            </span>
          </div>
        </div>

        {/* Status timeline */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Progression</h3>
          <div className="flex items-start">
            {STATUS_STEPS.map((step, i) => {
              const done    = i <= stepIndex
              const current = i === stepIndex
              return (
                <div key={step} className="flex-1 flex items-center">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                      done
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 dark:border-slate-600 text-slate-400"
                    } ${current ? "ring-2 ring-blue-300 ring-offset-2 dark:ring-offset-slate-900" : ""}`}>
                      {done && !current ? (
                        <span className="material-symbols-outlined text-[14px]">check</span>
                      ) : (
                        <span>{i + 1}</span>
                      )}
                    </div>
                    <span className={`text-[11px] mt-1 font-medium text-center ${current ? "text-blue-600 dark:text-blue-400" : done ? "text-slate-700 dark:text-slate-300" : "text-slate-400"}`}>
                      {step}
                    </span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 mb-5 ${i < stepIndex ? "bg-blue-500" : "bg-slate-200 dark:bg-slate-700"}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Details */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Informations</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: "Type",      value: order.requestType   },
              { label: "Priorité",  value: order.priority      },
              { label: "Budget",    value: order.budgetLabel   },
              { label: "Délai",     value: order.timelineLabel },
              { label: "Email",     value: order.clientEmail   },
            ].map(({ label, value }) => value ? (
              <div key={label}>
                <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                <p className="font-medium text-slate-900 dark:text-white">{value}</p>
              </div>
            ) : null)}
          </div>
          {order.description && (
            <div className="mt-4">
              <p className="text-xs text-slate-500 mb-1">Description</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{order.description}</p>
            </div>
          )}
          {order.features && order.features.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-slate-500 mb-2">Fonctionnalités</p>
              <div className="flex flex-wrap gap-2">
                {order.features.map(f => (
                  <span key={f} className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs rounded-full font-medium">{f}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Engineer action */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Action ingénieur</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Mettre à jour le statut</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {ENGINEER_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Commentaire technique</label>
              <textarea value={comment} onChange={e => setComment(e.target.value)} rows={4}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Ajouter un commentaire technique ou des notes de livraison…" />
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={saving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold disabled:opacity-60 transition-colors">
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
              {saved && (
                <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Sauvegardé
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}
