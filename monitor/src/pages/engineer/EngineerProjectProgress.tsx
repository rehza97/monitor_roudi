import { useState, useEffect } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { engineerNav } from "@/lib/nav"
import { useParams, Link } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import {
  doc, getDoc, updateDoc, serverTimestamp,
  collection, query, where, onSnapshot,
} from "@/lib/firebase-firestore"
import { COLLECTIONS } from "@/data/schema"
import type { FirestoreOrder, FirestoreTask } from "@/data/schema"
import { canEngineerAccessOrder } from "@/lib/access-control"
import { formatFirestoreDate } from "@/lib/utils"

interface Order extends FirestoreOrder { id: string }
interface Task  extends FirestoreTask  { id: string }

const STATUS_PROGRESS: Record<string, number> = {
  "En attente": 10,
  "Validée":    25,
  "En cours":   60,
  "Livré":      100,
}

const MILESTONES = [
  { status: "En attente", label: "Demande reçue",      icon: "inbox" },
  { status: "Validée",    label: "Demande validée",     icon: "task_alt" },
  { status: "En cours",   label: "Développement actif", icon: "code" },
  { status: "Livré",      label: "Livraison effectuée", icon: "rocket_launch" },
]

const priorityColor: Record<string, string> = {
  Haute:   "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400",
  Normale: "text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400",
  Basse:   "text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-400",
}

export default function EngineerProjectProgress() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [order, setOrder]     = useState<Order | null>(null)
  const [tasks, setTasks]     = useState<Task[]>([])
  const [notes, setNotes]     = useState("")
  const [loading, setLoading] = useState(true)
  const [notFound, setNF]     = useState(false)
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
        setNotes(data.adminComment ?? "")
      }
      setLoading(false)
    })
  }, [id, user?.id])

  useEffect(() => {
    if (!db || !user?.id) return
    const q = query(
      collection(db, COLLECTIONS.tasks),
      where("assignedToId", "==", user.id),
    )
    const unsub = onSnapshot(q, snap => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...(d.data() as FirestoreTask) })))
    })
    return unsub
  }, [user?.id])

  async function toggleTask(task: Task) {
    if (!db) return
    await updateDoc(doc(db, COLLECTIONS.tasks, task.id), {
      done: !task.done,
      updatedAt: serverTimestamp(),
    })
  }

  async function handleSaveNotes(e: React.FormEvent) {
    e.preventDefault()
    if (!db || !id || !user?.id) return
    setSaving(true)
    try {
      await updateDoc(doc(db, COLLECTIONS.orders, id), {
        adminComment: notes,
        assignedToId: user.id,
        updatedAt: serverTimestamp(),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const progress  = STATUS_PROGRESS[order?.status ?? "En attente"] ?? 10
  const stepIndex = MILESTONES.findIndex(m => m.status === order?.status)

  if (loading) {
    return (
      <DashboardLayout role="engineer" navItems={engineerNav} pageTitle="Progression">
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
          <p className="text-sm">Projet introuvable.</p>
          <Link to="/engineer/projects" className="text-blue-600 text-sm hover:underline">← Retour aux projets</Link>
        </div>
      </DashboardLayout>
    )
  }

  const doneTasks  = tasks.filter(t => t.done).length
  const totalTasks = tasks.length

  return (
    <DashboardLayout role="engineer" navItems={engineerNav} pageTitle="Progression du projet">
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Back */}
        <Link to="/engineer/projects" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 transition-colors">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Retour aux projets
        </Link>

        {/* Header */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{order.clientLabel ?? "Client inconnu"}</h2>
              <p className="text-slate-500 text-sm">{order.requestType ?? "Demande client"} · {formatFirestoreDate(order.createdAt)}</p>
            </div>
            <span className="text-sm font-bold text-blue-600">{progress}%</span>
          </div>
          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">{doneTasks}/{totalTasks} tâches complètes</p>
        </div>

        {/* Milestones */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Jalons</h3>
          <div className="space-y-3">
            {MILESTONES.map((m, i) => {
              const reached = i <= stepIndex
              const current = i === stepIndex
              return (
                <div key={m.status} className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                  current ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800" : ""
                }`}>
                  <div className={`size-9 rounded-full flex items-center justify-center shrink-0 ${
                    reached ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  }`}>
                    <span className="material-symbols-outlined text-[18px]">{m.icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${reached ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>
                      {m.label}
                    </p>
                    <p className="text-xs text-slate-400">{m.status}</p>
                  </div>
                  {reached && (
                    <span className="material-symbols-outlined text-emerald-500 text-[20px]">check_circle</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Tasks */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Mes tâches</h3>
          </div>
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <span className="material-symbols-outlined text-[36px]">task_alt</span>
              <p className="text-sm">Aucune tâche pour le moment.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {tasks.map(t => (
                <div key={t.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <input type="checkbox" checked={t.done} onChange={() => toggleTask(t)}
                    className="size-4 rounded accent-blue-600 cursor-pointer shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${t.done ? "line-through text-slate-400" : "text-slate-900 dark:text-white"}`}>{t.label}</p>
                    {t.project && <p className="text-xs text-slate-400">{t.project}</p>}
                  </div>
                  {t.priority && (
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${priorityColor[t.priority] ?? priorityColor["Normale"]}`}>
                      {t.priority}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Notes / Commentaires</h3>
          <form onSubmit={handleSaveNotes} className="space-y-3">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Notes techniques, blocages, informations de livraison…" />
            <div className="flex items-center gap-3">
              <button type="submit" disabled={saving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold disabled:opacity-60 transition-colors">
                {saving ? "Enregistrement…" : "Sauvegarder"}
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
