import { useEffect, useMemo, useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import { db, isFirebaseConfigured } from "@/config/firebase"
import { COLLECTIONS } from "@/data/schema"
import { collection, getDocs, limit, onSnapshot, orderBy, query } from "@/lib/firebase-firestore"
import { formatFirestoreDateTime } from "@/lib/utils"

const FILTER_CATEGORIES = ["Tous", "Demandes", "Utilisateurs", "Matériels", "Applications", "Finance", "Autre"] as const
type FilterCategory = (typeof FILTER_CATEGORIES)[number]

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
    demandes: "Demandes",
    demande: "Demandes",
    requests: "Demandes",
    order: "Demandes",
    orders: "Demandes",
    utilisateurs: "Utilisateurs",
    utilisateur: "Utilisateurs",
    users: "Utilisateurs",
    user: "Utilisateurs",
    matériels: "Matériels",
    materiels: "Matériels",
    material: "Matériels",
    materials: "Matériels",
    inventory: "Matériels",
    applications: "Applications",
    application: "Applications",
    apps: "Applications",
    deployment: "Applications",
    deployments: "Applications",
    finance: "Finance",
    invoice: "Finance",
    invoices: "Finance",
    billing: "Finance",
    paiement: "Finance",
  }
  const rawStr = typeof raw === "string" ? raw.trim() : ""
  if (rawStr && (FILTER_CATEGORIES as readonly string[]).includes(rawStr) && rawStr !== "Tous") {
    return rawStr as FilterCategory
  }
  return map[c] ?? "Autre"
}

function categoryStyle(cat: FilterCategory): { icon: string; color: string } {
  switch (cat) {
    case "Demandes":
      return { icon: "assignment", color: "text-blue-600" }
    case "Utilisateurs":
      return { icon: "person", color: "text-violet-600" }
    case "Matériels":
      return { icon: "inventory_2", color: "text-amber-600" }
    case "Applications":
      return { icon: "apps", color: "text-emerald-600" }
    case "Finance":
      return { icon: "payments", color: "text-rose-600" }
    default:
      return { icon: "history", color: "text-slate-600" }
  }
}

function docToRow(
  id: string,
  data: Record<string, unknown>,
  actorNames: Map<string, string>
): ActivityRow | null {
  const title =
    (typeof data.title === "string" && data.title.trim()) ||
    (typeof data.summary === "string" && data.summary.trim()) ||
    (typeof data.message === "string" && data.message.trim()) ||
    (typeof data.action === "string" && data.action.trim()) ||
    "Événement"

  const actorId = typeof data.actorUserId === "string" ? data.actorUserId : ""
  const actorName = typeof data.actorName === "string" ? data.actorName.trim() : ""
  const actor =
    actorName ||
    (actorId && actorNames.get(actorId)) ||
    (actorId ? `Utilisateur ${actorId.slice(0, 8)}…` : "Système")

  const cat = normalizeCategory(data.category)
  const { icon, color } =
    typeof data.icon === "string" && data.icon.trim() && typeof data.color === "string"
      ? { icon: data.icon.trim(), color: data.color }
      : { ...categoryStyle(cat) }

  const sortMs = (() => {
    const m =
      (typeof data.createdAt === "object" && data.createdAt !== null && "toMillis" in data.createdAt
        ? (data.createdAt as { toMillis: () => number }).toMillis()
        : null) ?? null
    return typeof m === "number" && Number.isFinite(m) ? m : 0
  })()

  return {
    id,
    icon,
    color,
    title,
    actor,
    time: formatFirestoreDateTime(data.createdAt),
    category: cat,
    sortMs,
  }
}

export default function AdminHistory() {
  const [rows, setRows] = useState<ActivityRow[]>([])
  const [actorNames, setActorNames] = useState<Map<string, string>>(new Map())
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<FilterCategory>("Tous")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db || !isFirebaseConfigured) {
      setError("Firebase n’est pas configuré.")
      setLoading(false)
      return
    }

    let cancelled = false

    getDocs(collection(db, COLLECTIONS.users))
      .then(snap => {
        if (cancelled) return
        const m = new Map<string, string>()
        snap.forEach(d => {
          const data = d.data() as Record<string, unknown>
          const email = typeof data.email === "string" ? data.email : ""
          const name = typeof data.name === "string" && data.name.trim() ? data.name.trim() : email || d.id
          m.set(d.id, name)
        })
        setActorNames(m)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!db || !isFirebaseConfigured) return

    const q = query(
      collection(db, COLLECTIONS.activityEvents),
      orderBy("createdAt", "desc"),
      limit(250)
    )

    const unsub = onSnapshot(
      q,
      snap => {
        setError(null)
        setLoading(false)
        const list: ActivityRow[] = []
        snap.forEach(d => {
          const row = docToRow(d.id, d.data() as Record<string, unknown>, actorNames)
          if (row) list.push(row)
        })
        list.sort((a, b) => b.sortMs - a.sortMs)
        setRows(list)
      },
      err => {
        setLoading(false)
        setError(err.message)
      }
    )

    return () => unsub()
  }, [db, actorNames])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return rows.filter(e => {
      const matchSearch =
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.actor.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      const matchCat = category === "Tous" || e.category === category
      return matchSearch && matchCat
    })
  }, [rows, search, category])

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Historique des Activités">
      <div className="p-6 max-w-3xl space-y-5">
        {error && (
          <p className="text-sm text-amber-700 dark:text-amber-400 rounded-lg border border-amber-200 dark:border-amber-900 px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#db143c]"
              placeholder="Filtrer les événements…"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Effacer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>
          <select
            value={category}
            onChange={e => setCategory(e.target.value as FilterCategory)}
            className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none"
          >
            {FILTER_CATEGORIES.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <p className="text-xs text-slate-400">
          {loading ? "Chargement…" : `${filtered.length} événement${filtered.length !== 1 ? "s" : ""}`}
          {!loading && rows.length === 0 && !error && (
            <span className="block mt-1 text-slate-500">
              Aucune entrée pour l’instant. Les actions administrateur peuvent écrire dans l’historique Firestore
              lorsque vous instrumentez le produit.
            </span>
          )}
        </p>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.map(e => (
            <div
              key={e.id}
              className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
            >
              <div
                className={`size-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center ${e.color} shrink-0`}
              >
                <span className="material-symbols-outlined text-[18px]">{e.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{e.title}</p>
                <p className="text-xs text-slate-400">
                  {e.actor} · {e.category}
                </p>
              </div>
              <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">{e.time}</span>
            </div>
          ))}
          {!loading && filtered.length === 0 && (
            <div className="px-5 py-10 text-center text-slate-400 text-sm">
              {rows.length === 0
                ? "L’historique est vide."
                : "Aucun événement ne correspond au filtre."}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
