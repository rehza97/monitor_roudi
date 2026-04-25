import { useEffect, useMemo, useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { engineerNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import {
  addDoc, collection, deleteDoc, doc, onSnapshot,
  orderBy, query, serverTimestamp, updateDoc, where,
} from "@/lib/firebase-firestore"
import { COLLECTIONS, type FirestoreTimeEntry } from "@/data/schema"

type EntryRow = FirestoreTimeEntry & { id: string; dateMs: number }

type Modal = { mode: "add" } | { mode: "edit"; entry: EntryRow }

function weekOf(dateStr: string): string {
  const d = new Date(dateStr)
  const mon = new Date(d)
  mon.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return mon.toISOString().slice(0, 10)
}

const today = new Date().toISOString().slice(0, 10)

function EntryModal({
  modal,
  onClose,
  onSave,
  onDelete,
}: {
  modal: Modal
  onClose: () => void
  onSave: (data: Omit<FirestoreTimeEntry, "assignedToId" | "createdAt" | "updatedAt">) => Promise<void>
  onDelete?: () => Promise<void>
}) {
  const isEdit = modal.mode === "edit"
  const initial = isEdit ? modal.entry : null

  const [projectTitle, setProjectTitle] = useState(initial?.projectTitle ?? "")
  const [date, setDate]                 = useState(initial?.date ?? today)
  const [hours, setHours]               = useState(String(initial?.hours ?? ""))
  const [description, setDescription]  = useState(initial?.description ?? "")
  const [billable, setBillable]         = useState(initial?.billable ?? true)
  const [saving, setSaving]             = useState(false)
  const [deleting, setDeleting]         = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const h = parseFloat(hours)
    if (!projectTitle.trim() || isNaN(h) || h <= 0) return
    setSaving(true)
    try {
      await onSave({ projectTitle: projectTitle.trim(), date, hours: h, description: description.trim(), billable })
      onClose()
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!onDelete) return
    setDeleting(true)
    try { await onDelete(); onClose() } finally { setDeleting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-900 dark:text-white">
            {isEdit ? "Modifier l'entrée" : "Nouvelle entrée"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Projet *</label>
            <input
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              required
              placeholder="Nom du projet ou de la tâche"
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Heures *</label>
              <input
                type="number"
                min="0.25"
                max="24"
                step="0.25"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                required
                placeholder="Ex: 2.5"
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Ce qui a été fait…"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-between py-2 rounded-lg bg-slate-50 dark:bg-slate-800 px-3">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Facturable</p>
              <p className="text-xs text-slate-500">Inclure dans la facturation client</p>
            </div>
            <button type="button" onClick={() => setBillable((b) => !b)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${billable ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"}`}>
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${billable ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          <div className="flex gap-2 pt-2">
            {isEdit && onDelete && (
              <button type="button" onClick={() => void handleDelete()} disabled={deleting}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-60 transition-colors">
                {deleting ? "Suppression…" : "Supprimer"}
              </button>
            )}
            <div className="flex-1" />
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white">
              {saving ? "Sauvegarde…" : isEdit ? "Mettre à jour" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function EngineerTimeTracking() {
  const { user } = useAuth()
  const [entries, setEntries]         = useState<EntryRow[]>([])
  const [loading, setLoading]         = useState(true)
  const [modal, setModal]             = useState<Modal | null>(null)
  const [weekFilter, setWeekFilter]   = useState<string>("all")
  const [search, setSearch]           = useState("")

  useEffect(() => {
    if (!db || !user?.id) { setLoading(false); return }
    const q = query(
      collection(db, COLLECTIONS.timeEntries),
      where("assignedToId", "==", user.id),
      orderBy("date", "desc"),
    )
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as FirestoreTimeEntry),
        dateMs: new Date((d.data() as FirestoreTimeEntry).date).getTime(),
      }))
      setEntries(rows)
      setLoading(false)
    })
    return unsub
  }, [user?.id])

  async function handleSave(data: Omit<FirestoreTimeEntry, "assignedToId" | "createdAt" | "updatedAt">, editId?: string) {
    if (!db || !user?.id) return
    if (editId) {
      await updateDoc(doc(db, COLLECTIONS.timeEntries, editId), { ...data, updatedAt: serverTimestamp() })
    } else {
      await addDoc(collection(db, COLLECTIONS.timeEntries), {
        ...data,
        assignedToId: user.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }
  }

  async function handleDelete(id: string) {
    if (!db) return
    await deleteDoc(doc(db, COLLECTIONS.timeEntries, id))
  }

  const weeks = useMemo(() => {
    const seen = new Set<string>()
    entries.forEach((e) => seen.add(weekOf(e.date)))
    return Array.from(seen).sort().reverse()
  }, [entries])

  const filtered = entries.filter((e) => {
    const matchWeek = weekFilter === "all" || weekOf(e.date) === weekFilter
    const matchSearch = !search || e.projectTitle.toLowerCase().includes(search.toLowerCase()) || e.description.toLowerCase().includes(search.toLowerCase())
    return matchWeek && matchSearch
  })

  const kpis = useMemo(() => {
    const now = new Date()
    const currentWeek = weekOf(now.toISOString().slice(0, 10))
    const currentMonth = now.toISOString().slice(0, 7)
    const weekHours  = entries.filter((e) => weekOf(e.date) === currentWeek).reduce((s, e) => s + e.hours, 0)
    const monthHours = entries.filter((e) => e.date.startsWith(currentMonth)).reduce((s, e) => s + e.hours, 0)
    const billable   = entries.filter((e) => e.billable).reduce((s, e) => s + e.hours, 0)
    const byProject  = entries.reduce<Record<string, number>>((acc, e) => {
      acc[e.projectTitle] = (acc[e.projectTitle] ?? 0) + e.hours
      return acc
    }, {})
    const topProject = Object.entries(byProject).sort((a, b) => b[1] - a[1])[0]
    return { weekHours, monthHours, billable, topProject }
  }, [entries])

  const byProject = useMemo(() => {
    const map: Record<string, number> = {}
    filtered.forEach((e) => { map[e.projectTitle] = (map[e.projectTitle] ?? 0) + e.hours })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [filtered])

  return (
    <DashboardLayout role="engineer" navItems={engineerNav} pageTitle="Suivi du temps">
      <div className="p-6 space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Suivi du temps</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Loggez vos heures par projet pour la facturation.</p>
          </div>
          <button
            onClick={() => setModal({ mode: "add" })}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nouvelle entrée
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Cette semaine", value: `${kpis.weekHours.toFixed(1)}h`,  icon: "calendar_today",  color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-900/20" },
            { label: "Ce mois",       value: `${kpis.monthHours.toFixed(1)}h`, icon: "calendar_month",  color: "text-indigo-600",  bg: "bg-indigo-50 dark:bg-indigo-900/20" },
            { label: "Facturables",   value: `${kpis.billable.toFixed(1)}h`,   icon: "receipt_long",    color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
            { label: "Top projet",    value: kpis.topProject ? kpis.topProject[0].slice(0, 16) : "—", icon: "star", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
          ].map((k) => (
            <div key={k.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
              <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${k.bg}`}>
                <span className={`material-symbols-outlined text-[20px] ${k.color}`}>{k.icon}</span>
              </div>
              <div className="min-w-0">
                <p className={`text-xl font-black truncate ${k.color}`}>{loading ? "—" : k.value}</p>
                <p className="text-xs text-slate-500">{k.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Project breakdown */}
        {byProject.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Répartition par projet</h3>
            <div className="space-y-3">
              {byProject.map(([proj, h]) => {
                const total = byProject.reduce((s, [, x]) => s + x, 0)
                const pct = total > 0 ? (h / total) * 100 : 0
                return (
                  <div key={proj} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-900 dark:text-white truncate max-w-[60%]">{proj}</span>
                      <span className="text-slate-500 tabular-nums">{h.toFixed(1)}h · {pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 flex-wrap">
            <button
              onClick={() => setWeekFilter("all")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                weekFilter === "all" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              Tout
            </button>
            {weeks.slice(0, 4).map((w) => (
              <button
                key={w}
                onClick={() => setWeekFilter(w)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  weekFilter === w ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                Sem. {new Date(w).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
              </button>
            ))}
          </div>
          <div className="relative ml-auto w-full sm:w-60">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Rechercher…" />
          </div>
        </div>

        {/* Entries list */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">Entrées de temps</h3>
            <span className="text-sm text-slate-500">{filtered.reduce((s, e) => s + e.hours, 0).toFixed(1)}h total</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <span className="material-symbols-outlined text-[48px]">timer_off</span>
              <p className="text-sm">Aucune entrée. Commencez à enregistrer vos heures.</p>
              <button onClick={() => setModal({ mode: "add" })}
                className="mt-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">
                Nouvelle entrée
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((entry) => (
                <div key={entry.id} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 group">
                  <div className="size-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-black text-blue-600">{entry.hours.toFixed(1)}h</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 dark:text-white text-sm truncate max-w-[280px]">
                        {entry.projectTitle}
                      </p>
                      {entry.billable && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600">
                          FACT.
                        </span>
                      )}
                    </div>
                    {entry.description && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{entry.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {new Date(entry.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <button
                    onClick={() => setModal({ mode: "edit", entry })}
                    className="opacity-0 group-hover:opacity-100 size-8 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modal && (
        <EntryModal
          modal={modal}
          onClose={() => setModal(null)}
          onSave={(data) => handleSave(data, modal.mode === "edit" ? modal.entry.id : undefined)}
          onDelete={modal.mode === "edit" ? () => handleDelete(modal.entry.id) : undefined}
        />
      )}
    </DashboardLayout>
  )
}
