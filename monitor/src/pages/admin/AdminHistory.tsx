import { useEffect, useMemo, useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import { db, isFirebaseConfigured } from "@/config/firebase"
import { COLLECTIONS } from "@/data/schema"
import { addDoc, collection, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp } from "@/lib/firebase-firestore"
import { formatFirestoreDateTime } from "@/lib/utils"

const FILTER_CATEGORIES = ["Tous", "Demandes", "Utilisateurs", "Matériels", "Applications", "Finance", "Autre"] as const
type FilterCategory = (typeof FILTER_CATEGORIES)[number]
type Tab = "Demandes" | "Paiements" | "Maintenances"

type ActivityRow = {
  id: string
  icon: string
  color: string
  title: string
  actor: string
  time: string
  category: FilterCategory
  sortMs: number
}

function normalizeCategory(raw: unknown): FilterCategory {
  const c = typeof raw === "string" ? raw.trim().toLowerCase() : ""
  if (!c) return "Autre"
  const map: Record<string, FilterCategory> = {
    demandes: "Demandes", demande: "Demandes", requests: "Demandes", order: "Demandes", orders: "Demandes",
    utilisateurs: "Utilisateurs", utilisateur: "Utilisateurs", users: "Utilisateurs", user: "Utilisateurs",
    matériels: "Matériels", materiels: "Matériels", material: "Matériels", materials: "Matériels", inventory: "Matériels",
    applications: "Applications", application: "Applications", apps: "Applications", deployment: "Applications", deployments: "Applications",
    finance: "Finance", invoice: "Finance", invoices: "Finance", billing: "Finance", paiement: "Finance",
  }
  const rawStr = typeof raw === "string" ? raw.trim() : ""
  if (rawStr && (FILTER_CATEGORIES as readonly string[]).includes(rawStr) && rawStr !== "Tous") return rawStr as FilterCategory
  return map[c] ?? "Autre"
}

function categoryStyle(cat: FilterCategory): { icon: string; color: string } {
  switch (cat) {
    case "Demandes": return { icon: "apps", color: "text-purple-600" }
    case "Utilisateurs": return { icon: "person", color: "text-violet-600" }
    case "Matériels": return { icon: "inventory_2", color: "text-orange-600" }
    case "Applications": return { icon: "apps", color: "text-cyan-600" }
    case "Finance": return { icon: "payments", color: "text-emerald-600" }
    default: return { icon: "history", color: "text-slate-600" }
  }
}

function docToRow(id: string, data: Record<string, unknown>, actorNames: Map<string, string>): ActivityRow | null {
  const title =
    (typeof data.title === "string" && data.title.trim()) ||
    (typeof data.summary === "string" && data.summary.trim()) ||
    (typeof data.message === "string" && data.message.trim()) ||
    (typeof data.action === "string" && data.action.trim()) ||
    "Événement"

  const actorId = typeof data.actorUserId === "string" ? data.actorUserId : ""
  const actorName = typeof data.actorName === "string" ? data.actorName.trim() : ""
  const actor = actorName || (actorId && actorNames.get(actorId)) || (actorId ? `Utilisateur ${actorId.slice(0, 8)}…` : "Système")

  const cat = normalizeCategory(data.category)
  const { icon, color } = categoryStyle(cat)

  const sortMs = (() => {
    const m = (typeof data.createdAt === "object" && data.createdAt !== null && "toMillis" in data.createdAt
      ? (data.createdAt as { toMillis: () => number }).toMillis()
      : null) ?? null
    return typeof m === "number" && Number.isFinite(m) ? m : 0
  })()

  return { id, icon, color, title, actor, time: formatFirestoreDateTime(data.createdAt), category: cat, sortMs }
}

const EVENT_CATEGORIES = ["Demandes", "Utilisateurs", "Matériels", "Applications", "Finance", "Autre"] as const

function AddEventModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: "", actorName: "", category: "Autre" as typeof EVENT_CATEGORIES[number] })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !db) return
    setSaving(true)
    setError("")
    try {
      await addDoc(collection(db, COLLECTIONS.activityEvents), {
        title: form.title.trim(),
        actorName: form.actorName.trim() || "Admin",
        category: form.category,
        createdAt: serverTimestamp(),
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <form className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4" onClick={e => e.stopPropagation()} onSubmit={e => void handleSubmit(e)}>
        <div className="flex items-center justify-between"><h3 className="font-bold text-slate-900">Ajouter un événement</h3><button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button></div>
        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p> : null}
        <div className="space-y-1.5"><label className="text-sm font-medium text-slate-700">Titre *</label><input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm" /></div>
        <div className="space-y-1.5"><label className="text-sm font-medium text-slate-700">Auteur</label><input value={form.actorName} onChange={e => setForm(p => ({ ...p, actorName: e.target.value }))} className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm" /></div>
        <div className="space-y-1.5"><label className="text-sm font-medium text-slate-700">Catégorie</label><select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as typeof EVENT_CATEGORIES[number] }))} className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm">{EVENT_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
        <div className="flex gap-2 pt-2"><button type="button" onClick={onClose} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium">Annuler</button><button type="submit" disabled={saving} className="flex-1 rounded-lg bg-[#0891b2] py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving ? "Enregistrement…" : "Ajouter"}</button></div>
      </form>
    </div>
  )
}

export default function AdminHistory() {
  const [rows, setRows] = useState<ActivityRow[]>([])
  const [actorNames, setActorNames] = useState<Map<string, string>>(new Map())
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<FilterCategory>("Tous")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [tab, setTab] = useState<Tab>("Demandes")

  useEffect(() => {
    if (!db || !isFirebaseConfigured) {
      setError("Firebase n’est pas configuré.")
      setLoading(false)
      return
    }

    let cancelled = false
    getDocs(collection(db, COLLECTIONS.users)).then(snap => {
      if (cancelled) return
      const m = new Map<string, string>()
      snap.forEach(d => {
        const data = d.data() as Record<string, unknown>
        const email = typeof data.email === "string" ? data.email : ""
        const name = typeof data.name === "string" && data.name.trim() ? data.name.trim() : email || d.id
        m.set(d.id, name)
      })
      setActorNames(m)
    }).catch(() => {})

    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!db || !isFirebaseConfigured) return
    const q = query(collection(db, COLLECTIONS.activityEvents), orderBy("createdAt", "desc"), limit(250))
    const unsub = onSnapshot(q, snap => {
      setError(null)
      setLoading(false)
      const list: ActivityRow[] = []
      snap.forEach(d => {
        const row = docToRow(d.id, d.data() as Record<string, unknown>, actorNames)
        if (row) list.push(row)
      })
      list.sort((a, b) => b.sortMs - a.sortMs)
      setRows(list)
    }, err => {
      setLoading(false)
      setError(err.message)
    })
    return () => unsub()
  }, [actorNames])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const tabFiltered = rows.filter((r) => {
      if (tab === "Demandes") return r.category === "Demandes" || r.category === "Applications" || r.category === "Autre"
      if (tab === "Paiements") return r.category === "Finance"
      return r.category === "Matériels" || r.category === "Utilisateurs"
    })

    return tabFiltered.filter(e => {
      const matchSearch = !q || e.title.toLowerCase().includes(q) || e.actor.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)
      const matchCat = category === "Tous" || e.category === category
      return matchSearch && matchCat
    })
  }, [rows, search, category, tab])

  function typeBadge(categoryName: FilterCategory) {
    const map: Record<FilterCategory, string> = {
      "Demandes": "bg-purple-50 text-purple-700",
      "Utilisateurs": "bg-cyan-50 text-cyan-700",
      "Matériels": "bg-orange-50 text-orange-700",
      "Applications": "bg-cyan-50 text-cyan-700",
      "Finance": "bg-emerald-50 text-emerald-700",
      "Autre": "bg-slate-100 text-slate-600",
      "Tous": "bg-slate-100 text-slate-600",
    }
    return map[categoryName]
  }

  function statusBadge(categoryName: FilterCategory) {
    if (categoryName === "Finance") return { label: "Terminé", cls: "bg-emerald-50 text-emerald-700" }
    if (categoryName === "Demandes" || categoryName === "Applications") return { label: "En cours", cls: "bg-blue-50 text-blue-700" }
    if (categoryName === "Matériels") return { label: "En attente", cls: "bg-amber-50 text-amber-700" }
    return { label: "Archivé", cls: "bg-slate-100 text-slate-600" }
  }

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Historique des Activités">
      <div className="w-full bg-[#f8fafc] p-8">
        <div className="mx-auto max-w-6xl space-y-8">
          {error ? <p className="rounded-lg border border-amber-200 px-3 py-2 text-sm text-amber-700">{error}</p> : null}

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Historique des Activités</h1>
              <p className="mt-2 text-slate-500">Consultez l'historique complet de vos interactions, paiements et maintenances.</p>
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                <span className="material-symbols-outlined text-[18px]">download</span>Exporter (CSV/PDF)
              </button>
              <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 rounded-lg bg-[#0891b2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#155e75]">
                <span className="material-symbols-outlined text-[18px]">add</span>Nouvelle Demande
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1"><span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">search</span><input value={search} onChange={e => setSearch(e.target.value)} className="h-10 w-full rounded-lg border-0 bg-slate-100 pl-10 pr-4 text-sm" placeholder="Rechercher..." /></div>
            <select value={category} onChange={e => setCategory(e.target.value as FilterCategory)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm">{FILTER_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
          </div>

          <div className="border-b border-slate-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {([
                { key: "Demandes", icon: "apps" },
                { key: "Paiements", icon: "payments" },
                { key: "Maintenances", icon: "build" },
              ] as const).map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium ${tab === t.key ? "border-[#0891b2] text-[#0891b2]" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
                  <span className="material-symbols-outlined text-[18px]">{t.icon}</span>{t.key}
                </button>
              ))}
            </nav>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="w-32 px-6 py-4 font-semibold">ID</th>
                    <th className="px-6 py-4 font-semibold">Nom du Projet</th>
                    <th className="w-40 px-6 py-4 font-semibold">Date</th>
                    <th className="w-32 px-6 py-4 font-semibold">Type</th>
                    <th className="w-32 px-6 py-4 font-semibold">Statut</th>
                    <th className="w-24 px-6 py-4 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filtered.map((e) => {
                    const st = statusBadge(e.category)
                    return (
                      <tr key={e.id} className="group transition-colors hover:bg-slate-50">
                        <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-slate-500">{e.id.slice(0, 12).toUpperCase()}</td>
                        <td className="px-6 py-4"><div className="font-medium text-slate-900">{e.title}</div><div className="text-xs text-slate-500">{e.actor}</div></td>
                        <td className="whitespace-nowrap px-6 py-4">{e.time}</td>
                        <td className="whitespace-nowrap px-6 py-4"><span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${typeBadge(e.category)}`}>{e.category}</span></td>
                        <td className="whitespace-nowrap px-6 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${st.cls}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{st.label}</span></td>
                        <td className="whitespace-nowrap px-6 py-4 text-right"><button className="text-sm font-medium text-[#0891b2] hover:text-[#155e75]">Détails</button></td>
                      </tr>
                    )
                  })}
                  {!loading && filtered.length === 0 ? <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-400">Aucun événement ne correspond au filtre.</td></tr> : null}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
              <p className="text-sm text-slate-700">Affichage de <span className="font-medium">1</span> à <span className="font-medium">{filtered.length}</span> sur <span className="font-medium">{rows.length}</span> résultats</p>
              <div className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                <button className="inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300"><span className="material-symbols-outlined text-[20px]">chevron_left</span></button>
                <button className="z-10 inline-flex items-center bg-[#0891b2] px-4 py-2 text-sm font-semibold text-white">1</button>
                <button className="inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-300">2</button>
                <button className="inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300"><span className="material-symbols-outlined text-[20px]">chevron_right</span></button>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <div className="flex flex-col items-center justify-between text-sm text-slate-500 md:flex-row"><p>© 2026 Technova. Tous droits réservés.</p><div className="mt-4 flex gap-4 md:mt-0"><span>Support</span><span>Confidentialité</span><span>Conditions</span></div></div>
          </div>
        </div>
      </div>

      {showAddModal ? <AddEventModal onClose={() => setShowAddModal(false)} onSaved={() => {}} /> : null}
    </DashboardLayout>
  )
}
