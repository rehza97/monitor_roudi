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
import ProjectProgressPanel from "@/components/ProjectProgressPanel"

interface Order extends FirestoreOrder { id: string }
interface Task  extends FirestoreTask  { id: string }

const priorityColor: Record<string, string> = {
  Haute:   "text-rose-700 bg-rose-50",
  Normale: "text-blue-700 bg-blue-50",
  Basse:   "text-slate-600 bg-slate-100",
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

  async function toggleFeature(feature: string) {
    if (!db || !id || !order) return
    const current = order.completedFeatures ?? []
    const next = current.includes(feature)
      ? current.filter((f) => f !== feature)
      : [...current, feature]
    await updateDoc(doc(db, COLLECTIONS.orders, id), {
      completedFeatures: next,
      updatedAt: serverTimestamp(),
    })
    setOrder((prev) => (prev ? { ...prev, completedFeatures: next } : prev))
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
      <div className="p-6 max-w-6xl mx-auto space-y-8 bg-[#f6f6f8] min-h-[calc(100vh-64px)]">
        <Link to="/engineer/projects" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 transition-colors">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Retour aux projets
        </Link>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Suivi du Projet</h2>
          <p className="text-slate-500 text-sm mt-1">
            {order.clientLabel ?? "Client inconnu"} · {order.requestType ?? "Demande client"} · {formatFirestoreDate(order.createdAt)}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <ProjectProgressPanel
              variant="engineer"
              status={order.status}
              features={order.features}
              completedFeatures={order.completedFeatures}
              assignedEngineerName={order.assignedEngineerName}
              onToggleFeature={toggleFeature}
              footer={
                <p className="text-xs text-slate-400">
                  {doneTasks}/{totalTasks} tâches complètes
                </p>
              }
            />

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">Mes tâches</h3>
              </div>
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                  <span className="material-symbols-outlined text-[36px]">task_alt</span>
                  <p className="text-sm">Aucune tâche pour le moment.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {tasks.map(t => (
                    <div key={t.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                      <input type="checkbox" checked={t.done} onChange={() => toggleTask(t)}
                        className="size-4 rounded accent-blue-600 cursor-pointer shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${t.done ? "line-through text-slate-400" : "text-slate-900"}`}>{t.label}</p>
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
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Notes / Commentaires</h3>
              <form onSubmit={handleSaveNotes} className="space-y-3">
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={6}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Notes techniques, blocages, informations de livraison…" />
                <div className="flex items-center gap-3 flex-wrap">
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
        </div>
      </div>
    </DashboardLayout>
  )
}
