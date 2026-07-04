import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { db, isFirebaseConfigured } from "@/config/firebase"
import {
  collection, query, where, orderBy, limit,
  onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp,
} from "@/lib/firebase-firestore"
import { COLLECTIONS } from "@/data/schema"
import type { FirestoreOrder, FirestoreProject, FirestoreServiceLog, FirestoreTask } from "@/data/schema"
import { canEngineerAccessOrder } from "@/lib/access-control"
import { formatFirestoreDateTime, firestoreToMillis } from "@/lib/utils"
import { engineerNav } from "@/lib/nav"
import { resolveOrderStatusForProject } from "@/lib/project-progress"
import ProjectProgressPanel from "@/components/ProjectProgressPanel"

interface Task extends FirestoreTask { id: string }

interface ProjectRow extends FirestoreProject { id: string }

interface LogRow extends FirestoreServiceLog { id: string }

const priorityColor: Record<string, string> = {
  Haute: "bg-red-500/10 text-red-500",
  Normale: "bg-amber-500/10 text-amber-500",
  Basse: "bg-blue-500/10 text-blue-500",
}

const LEVEL_BADGE: Record<string, string> = {
  error: "text-rose-600",
  warning: "text-amber-600",
  info: "text-emerald-600",
  debug: "text-slate-500",
}

function progressStyle(i: number) {
  return i === 0
    ? { icon: "bg-blue-500/10 text-blue-500", percent: "text-blue-500", bar: "bg-blue-500" }
    : i === 1
      ? { icon: "bg-purple-500/10 text-purple-500", percent: "text-purple-500", bar: "bg-purple-500" }
      : { icon: "bg-emerald-500/10 text-emerald-500", percent: "text-emerald-500", bar: "bg-emerald-500" }
}

interface TaskModalProps {
  initial?: Task
  onClose: () => void
  onSave: (data: Omit<FirestoreTask, "createdAt" | "updatedAt">) => Promise<void>
  onDelete?: () => Promise<void>
}

function TaskModal({ initial, onClose, onSave, onDelete }: TaskModalProps) {
  const [label, setLabel] = useState(initial?.label ?? "")
  const [project, setProject] = useState(initial?.project ?? "")
  const [priority, setPriority] = useState(initial?.priority ?? "Normale")
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim()) return
    setSaving(true)
    try {
      await onSave({
        label: label.trim(),
        project: project.trim(),
        priority,
        dueDate,
        done: initial?.done ?? false,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!onDelete) return
    setDeleting(true)
    try {
      await onDelete()
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-900">{initial ? "Modifier la tâche" : "Nouvelle tâche"}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-900"><span className="material-symbols-outlined text-[20px]">close</span></button>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <input value={label} onChange={(e) => setLabel(e.target.value)} required className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2463eb]/30" placeholder="Libellé" />
          <input value={project} onChange={(e) => setProject(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2463eb]/30" placeholder="Projet" />
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2463eb]/30">
            <option>Haute</option><option>Normale</option><option>Basse</option>
          </select>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2463eb]/30" />
          <div className="flex gap-2 pt-1">
            {onDelete && <button type="button" onClick={handleDelete} disabled={deleting} className="px-4 py-2 rounded-lg border border-rose-400/40 text-rose-400 text-sm">{deleting ? "Suppression…" : "Supprimer"}</button>}
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50">Annuler</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-[#2463eb] hover:bg-[#1d4ed8] text-white rounded-lg text-sm font-bold">{saving ? "Enregistrement…" : "Enregistrer"}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function EngineerDashboard() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [ordersById, setOrdersById] = useState<Map<string, FirestoreOrder>>(new Map())
  const [recentOrders, setRecentOrders] = useState(0)
  const [deployIssues, setDeployIssues] = useState(0)
  const [serviceLogs, setServiceLogs] = useState<LogRow[]>([])
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [modal, setModal] = useState<"new" | Task | null>(null)

  useEffect(() => {
    if (!db || !user?.id || !isFirebaseConfigured) return
    const q = query(collection(db, COLLECTIONS.tasks), where("assignedToId", "==", user.id))
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as FirestoreTask) }))
      setTasks(rows.sort((a, b) => (b.label ?? "").localeCompare(a.label ?? "")).slice(0, 20))
      setLoadingTasks(false)
    })
    return unsub
  }, [user?.id])

  useEffect(() => {
    if (!db || !user?.id || !isFirebaseConfigured) return
    const q = query(collection(db, COLLECTIONS.projects), where("assignedEngineerId", "==", user.id), limit(120))
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as FirestoreProject) }))
      const rank = (s: FirestoreProject["status"]) => (s === "active" ? 0 : s === "pending" ? 1 : 2)
      rows.sort((a, b) => {
        const ra = rank(a.status)
        const rb = rank(b.status)
        if (ra !== rb) return ra - rb
        return (firestoreToMillis(b.updatedAt) ?? 0) - (firestoreToMillis(a.updatedAt) ?? 0)
      })
      setProjects(rows)
      setLoadingProjects(false)
    })
    return unsub
  }, [user?.id])

  useEffect(() => {
    if (!db || !user?.id || !isFirebaseConfigured) return
    const q = query(collection(db, COLLECTIONS.orders), where("kind", "==", "client_request"), orderBy("createdAt", "desc"), limit(100))
    const unsub = onSnapshot(q, (snap) => {
      const visible = snap.docs.map((d) => d.data() as FirestoreOrder).filter((d) => canEngineerAccessOrder(d, user.id))
      setRecentOrders(visible.length)
    })
    return unsub
  }, [user?.id])

  useEffect(() => {
    if (!db || !user?.id || !isFirebaseConfigured) return
    const q = query(
      collection(db, COLLECTIONS.orders),
      where("assignedToId", "==", user.id),
      where("kind", "==", "client_request"),
    )
    const unsub = onSnapshot(q, (snap) => {
      const map = new Map<string, FirestoreOrder>()
      snap.docs.forEach((d) => map.set(d.id, d.data() as FirestoreOrder))
      setOrdersById(map)
    })
    return unsub
  }, [user?.id])

  useEffect(() => {
    if (!db || !isFirebaseConfigured) return
    const unsub = onSnapshot(collection(db, COLLECTIONS.deployments), (snap) => {
      let n = 0
      snap.docs.forEach((d) => {
        const h = String((d.data() as { health?: string }).health ?? "").toLowerCase()
        if (h === "degraded" || h === "down" || h === "stopped") n += 1
      })
      setDeployIssues(n)
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!db || !isFirebaseConfigured) return
    const q = query(collection(db, COLLECTIONS.serviceLogs), orderBy("createdAt", "desc"), limit(8))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setServiceLogs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as FirestoreServiceLog) })))
      },
      () => {},
    )
    return unsub
  }, [])

  async function handleSave(data: Omit<FirestoreTask, "createdAt" | "updatedAt">) {
    if (!db || !user?.id) return
    if (modal === "new") {
      await addDoc(collection(db, COLLECTIONS.tasks), { ...data, assignedToId: user.id, done: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    } else if (modal && typeof modal === "object") {
      await updateDoc(doc(db, COLLECTIONS.tasks, modal.id), { ...data, updatedAt: serverTimestamp() })
    }
  }

  async function handleDelete() {
    if (!db || !modal || modal === "new") return
    await deleteDoc(doc(db, COLLECTIONS.tasks, modal.id))
  }

  async function toggleTask(task: Task) {
    if (!db) return
    await updateDoc(doc(db, COLLECTIONS.tasks, task.id), { done: !task.done, updatedAt: serverTimestamp() })
  }

  const activeProjects = useMemo(() => projects.filter((p) => p.status === "active").length, [projects])
  const topProjects = useMemo(() => projects.slice(0, 3), [projects])

  return (
    <DashboardLayout role="engineer" navItems={engineerNav} pageTitle="Tableau de bord">
      <div className="bg-[#f6f6f8] text-slate-900 min-h-[calc(100vh-64px)] font-[Inter,sans-serif]">
        <div className="max-w-[1200px] mx-auto p-8 flex flex-col gap-8">
          <header className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-black tracking-tight">Tableau de bord</h2>
              <p className="text-slate-500 mt-1">Aperçu technique et état d&apos;avancement — données temps réel Firestore.</p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/engineer/notifications" className="flex items-center justify-center h-10 w-10 rounded-full bg-white border border-slate-200 text-slate-500"><span className="material-symbols-outlined text-[20px]">notifications</span></Link>
              <button type="button" onClick={() => setModal("new")} className="bg-[#2463eb] hover:bg-[#1d4ed8] text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">add</span>Nouvelle tâche</button>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <p className="text-slate-500 text-sm">Projets actifs</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-bold">{loadingProjects ? "…" : activeProjects}</span>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">assignés</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4">
                <div className="bg-[#2463eb] h-full rounded-full transition-all" style={{ width: `${Math.min(100, activeProjects * 20)}%` }} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <p className="text-slate-500 text-sm">Demandes visibles</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-bold">{recentOrders}</span>
                <span className="text-xs font-medium text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">file ingénieur</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4">
                <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, recentOrders * 5)}%` }} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <p className="text-slate-500 text-sm">Alertes déploiements</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-bold">{deployIssues}</span>
                <span className="text-xs font-medium text-slate-600 bg-slate-500/10 px-2 py-0.5 rounded-full">{deployIssues === 0 ? "Stable" : "À surveiller"}</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4">
                <div className="bg-purple-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, deployIssues * 25 + 5)}%` }} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Progression des projets</h3>
                <Link to="/engineer/projects" className="text-sm text-[#2463eb] font-medium">Voir tout</Link>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-6">
                {!loadingProjects && topProjects.length === 0 ? (
                  <p className="text-sm text-slate-500">Aucun projet assigné pour le moment.</p>
                ) : (
                  topProjects.map((t, i) => {
                    const order = t.orderId ? ordersById.get(t.orderId) : undefined
                    const st = progressStyle(i)
                    return (
                      <div key={t.id} className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg ${st.icon} flex items-center justify-center`}><span className="material-symbols-outlined">api</span></div>
                          <div>
                            <h4 className="text-sm font-semibold">{t.title || t.clientLabel || "Projet"}</h4>
                            <p className="text-xs text-slate-500">{t.requestType ?? t.status}</p>
                          </div>
                        </div>
                        <ProjectProgressPanel
                          variant="engineer"
                          compact
                          status={resolveOrderStatusForProject(t, order)}
                          features={order?.features}
                          completedFeatures={order?.completedFeatures}
                        />
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between"><h3 className="text-lg font-bold">Tâches prioritaires</h3></div>
              <div className="flex flex-col gap-3">
                {(loadingTasks ? [] : tasks.slice(0, 3)).map((t) => (
                  <button type="button" key={t.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3 cursor-pointer text-left w-full" onClick={() => setModal(t)}>
                    <div className="mt-1 min-w-[20px]"><input type="checkbox" checked={!!t.done} onChange={() => void toggleTask(t)} className="w-5 h-5" /></div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="text-sm font-semibold">{t.label}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${priorityColor[t.priority] ?? priorityColor.Normale}`}>{t.priority || "Normal"}</span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2">{t.project || "Projet interne"}</p>
                    </div>
                  </button>
                ))}
                {!loadingTasks && tasks.length === 0 ? <div className="text-sm text-slate-500">Aucune tâche</div> : null}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 pb-8">
            <h3 className="text-lg font-bold">Logs système récents</h3>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Horodatage</th>
                      <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Service</th>
                      <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Niveau</th>
                      <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {serviceLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 px-4 text-slate-500 text-center">Aucun log dans Firestore (`service_logs`). Les saisies apparaîtront ici.</td>
                      </tr>
                    ) : (
                      serviceLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="py-3 px-4 whitespace-nowrap">{formatFirestoreDateTime(log.createdAt)}</td>
                          <td className="py-3 px-4">{log.serviceName ?? log.serviceId ?? "—"}</td>
                          <td className={`py-3 px-4 ${LEVEL_BADGE[log.level ?? "info"] ?? "text-slate-600"}`}>{(log.level ?? "info").toUpperCase()}</td>
                          <td className="py-3 px-4 max-w-md truncate">{log.message}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {modal !== null && <TaskModal initial={modal === "new" ? undefined : modal} onClose={() => setModal(null)} onSave={handleSave} onDelete={modal !== "new" ? handleDelete : undefined} />}
    </DashboardLayout>
  )
}
