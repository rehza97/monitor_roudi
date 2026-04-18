import { useState, useEffect } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { engineerNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import {
  collection, query, where, orderBy, limit,
  onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp,
} from "@/lib/firebase-firestore"
import { COLLECTIONS } from "@/data/schema"
import type { FirestoreOrder, FirestoreTask } from "@/data/schema"
import { canEngineerAccessOrder } from "@/lib/access-control"

interface Task extends FirestoreTask { id: string }

const priorityColor: Record<string, string> = {
  Haute:   "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400",
  Normale: "text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400",
  Basse:   "text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-400",
}

interface TaskModalProps {
  initial?: Task
  onClose: () => void
  onSave: (data: Omit<FirestoreTask, "createdAt" | "updatedAt">) => Promise<void>
  onDelete?: () => Promise<void>
}

function TaskModal({ initial, onClose, onSave, onDelete }: TaskModalProps) {
  const [label, setLabel]       = useState(initial?.label    ?? "")
  const [project, setProject]   = useState(initial?.project  ?? "")
  const [priority, setPriority] = useState(initial?.priority ?? "Normale")
  const [dueDate, setDueDate]   = useState(initial?.dueDate  ?? "")
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim()) return
    setSaving(true)
    try {
      await onSave({ label: label.trim(), project: project.trim(), priority, dueDate, done: initial?.done ?? false })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!onDelete) return
    setDeleting(true)
    try { await onDelete(); onClose() } finally { setDeleting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-900 dark:text-white">{initial ? "Modifier la tâche" : "Nouvelle tâche"}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Libellé *</label>
            <input value={label} onChange={e => setLabel(e.target.value)} required
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Libellé de la tâche" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Projet</label>
            <input value={project} onChange={e => setProject(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nom du projet" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Priorité</label>
            <select value={priority} onChange={e => setPriority(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Haute</option>
              <option>Normale</option>
              <option>Basse</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Échéance</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-2 pt-1">
            {onDelete && (
              <button type="button" onClick={handleDelete} disabled={deleting}
                className="px-4 py-2.5 rounded-lg border border-rose-200 text-rose-600 text-sm font-medium hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-900/20 disabled:opacity-50">
                {deleting ? "Suppression…" : "Supprimer"}
              </button>
            )}
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

export default function EngineerDashboard() {
  const { user } = useAuth()
  const [tasks, setTasks]               = useState<Task[]>([])
  const [recentOrders, setRecentOrders] = useState(0)
  const [deployOk, setDeployOk]         = useState(0)
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [modal, setModal]               = useState<"new" | Task | null>(null)

  const firstName = user?.name?.trim().split(/\s+/)[0] ?? ""

  useEffect(() => {
    if (!db || !user?.id) return
    const q = query(
      collection(db, COLLECTIONS.tasks),
      where("assignedToId", "==", user.id),
    )
    const unsub = onSnapshot(q, snap => {
      const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as FirestoreTask) }))
      const sorted = rows
        .sort((a, b) => {
          const am =
            a.createdAt &&
            typeof a.createdAt === "object" &&
            "toMillis" in a.createdAt &&
            typeof (a.createdAt as { toMillis: () => number }).toMillis === "function"
              ? (a.createdAt as { toMillis: () => number }).toMillis()
              : 0
          const bm =
            b.createdAt &&
            typeof b.createdAt === "object" &&
            "toMillis" in b.createdAt &&
            typeof (b.createdAt as { toMillis: () => number }).toMillis === "function"
              ? (b.createdAt as { toMillis: () => number }).toMillis()
              : 0
          return bm - am
        })
        .slice(0, 20)
      setTasks(sorted)
      setLoadingTasks(false)
    })
    return unsub
  }, [user?.id])

  useEffect(() => {
    if (!db || !user?.id) return
    const q = query(
      collection(db, COLLECTIONS.orders),
      where("kind", "==", "client_request"),
      orderBy("createdAt", "desc"),
      limit(100),
    )
    const unsub = onSnapshot(q, snap => {
      const visible = snap.docs
        .map((d) => d.data() as FirestoreOrder)
        .filter((d) => canEngineerAccessOrder(d, user.id))
      setRecentOrders(visible.length)
    })
    return unsub
  }, [user?.id])

  useEffect(() => {
    if (!db) return
    const q = query(collection(db, COLLECTIONS.deployments), where("health", "==", "ok"))
    const unsub = onSnapshot(q, snap => setDeployOk(snap.size))
    return unsub
  }, [])

  async function handleSave(data: Omit<FirestoreTask, "createdAt" | "updatedAt">) {
    if (!db || !user?.id) return
    if (modal === "new") {
      await addDoc(collection(db, COLLECTIONS.tasks), {
        ...data,
        assignedToId: user.id,
        done: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    } else if (modal && typeof modal === "object") {
      await updateDoc(doc(db, COLLECTIONS.tasks, (modal as Task).id), {
        ...data,
        updatedAt: serverTimestamp(),
      })
    }
  }

  async function handleDelete() {
    if (!db || !modal || modal === "new") return
    await deleteDoc(doc(db, COLLECTIONS.tasks, (modal as Task).id))
  }

  async function toggleTask(task: Task) {
    if (!db) return
    await updateDoc(doc(db, COLLECTIONS.tasks, task.id), {
      done: !task.done,
      updatedAt: serverTimestamp(),
    })
  }

  const activeCount = tasks.filter(t => !t.done).length
  const doneCount   = tasks.filter(t => t.done).length

  const kpis = [
    { label: "Tâches actives",     value: activeCount,  icon: "task_alt",     bg: "bg-blue-50 dark:bg-blue-900/20",       color: "text-blue-600 dark:text-blue-400" },
    { label: "Tâches terminées",   value: doneCount,    icon: "check_circle", bg: "bg-emerald-50 dark:bg-emerald-900/20", color: "text-emerald-600 dark:text-emerald-400" },
    { label: "Demandes récentes",  value: recentOrders, icon: "assignment",   bg: "bg-amber-50 dark:bg-amber-900/20",     color: "text-amber-600 dark:text-amber-400" },
    { label: "Déploiements sains", value: deployOk,     icon: "monitoring",   bg: "bg-rose-50 dark:bg-rose-900/20",       color: "text-[#db143c]" },
  ]

  return (
    <DashboardLayout role="engineer" navItems={engineerNav} pageTitle="Tableau de bord">
      <div className="p-6 space-y-6">
        {/* Welcome banner */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
          <h2 className="text-2xl font-bold">{firstName ? `Bonjour, ${firstName}` : "Bonjour"} 👨‍💻</h2>
          <p className="text-blue-100 text-sm mt-1">
            {activeCount > 0
              ? `Vous avez ${activeCount} tâche${activeCount > 1 ? "s" : ""} active${activeCount > 1 ? "s" : ""} aujourd'hui.`
              : "Toutes les tâches sont complètes. Excellent travail !"}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(k => (
            <div key={k.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className={`size-10 rounded-lg ${k.bg} ${k.color} flex items-center justify-center mb-3`}>
                <span className="material-symbols-outlined text-[20px]">{k.icon}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{k.value}</p>
              <p className="text-sm text-slate-500 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Task list */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-white">Mes tâches</h3>
              {tasks.length > 0 && (
                <span className="text-xs text-slate-400">{doneCount}/{tasks.length}</span>
              )}
            </div>
            <button onClick={() => setModal("new")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
              <span className="material-symbols-outlined text-[16px]">add</span>
              Nouvelle tâche
            </button>
          </div>

          {loadingTasks ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <span className="material-symbols-outlined animate-spin text-[28px]">progress_activity</span>
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <span className="material-symbols-outlined text-[40px]">task_alt</span>
              <p className="text-sm">Aucune tâche assignée pour le moment.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {tasks.map(t => (
                <div key={t.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <input type="checkbox" checked={t.done} onChange={() => toggleTask(t)}
                    className="size-4 rounded accent-blue-600 cursor-pointer shrink-0" />
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setModal(t)}>
                    <p className={`text-sm font-medium truncate ${t.done ? "line-through text-slate-400" : "text-slate-900 dark:text-white"}`}>{t.label}</p>
                    {t.project && <p className="text-xs text-slate-400 truncate">{t.project}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {t.priority && (
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${priorityColor[t.priority] ?? priorityColor["Normale"]}`}>
                        {t.priority}
                      </span>
                    )}
                    {t.dueDate && <span className="text-xs text-slate-400">{t.dueDate}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modal !== null && (
        <TaskModal
          initial={modal === "new" ? undefined : (modal as Task)}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={modal !== "new" ? handleDelete : undefined}
        />
      )}
    </DashboardLayout>
  )
}
