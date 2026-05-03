import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { clientNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import { addDoc, collection, onSnapshot, serverTimestamp } from "@/lib/firebase-firestore"
import { parseCatalogProductDoc, type CatalogProduct } from "@/lib/catalog-products"
import { COLLECTIONS, ORDER_KIND, type FirestoreOrder } from "@/data/schema"
import { notifyAdminsOfOrderCreated } from "@/lib/notifications"

export default function ClientSoftwareStore() {
  const { user } = useAuth()
  const [apps, setApps] = useState<CatalogProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [orderingId, setOrderingId] = useState<string | null>(null)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<"relevance" | "name_asc" | "name_desc">("relevance")

  useEffect(() => {
    if (!db) {
      setLoading(false)
      return
    }
    const unsub = onSnapshot(collection(db, COLLECTIONS.catalogProducts), (snap) => {
      const rows = snap.docs
        .map((d) => parseCatalogProductDoc(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => a.name.localeCompare(b.name, "fr"))
      setApps(rows)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  async function orderApp(app: CatalogProduct) {
    if (!db || !user?.organizationId) return
    setOrderingId(app.id)
    setError("")
    setSuccess("")
    try {
      const payload = {
        organizationId: user.organizationId,
        kind: ORDER_KIND.clientRequest,
        status: "En attente",
        createdByUserId: user.id,
        requestType: `Commande app: ${app.name}`,
        description: `Commande app depuis le catalogue client (${app.slug}).`,
        priority: "Normale",
        features: app.features.map((f) => f.title).filter(Boolean),
        budgetLabel: app.price || "Sur devis",
        timelineLabel: "À planifier",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as FirestoreOrder
      const ref = await addDoc(collection(db, COLLECTIONS.orders), payload)
      await notifyAdminsOfOrderCreated(ref.id, payload)
      setSuccess(`Commande envoyée pour ${app.name}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer la commande.")
    } finally {
      setOrderingId(null)
    }
  }

  const filteredApps = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = [...apps]
    if (q) {
      rows = rows.filter((app) =>
        app.name.toLowerCase().includes(q) ||
        app.tagline.toLowerCase().includes(q) ||
        app.category.toLowerCase().includes(q) ||
        app.slug.toLowerCase().includes(q),
      )
    }
    if (sortBy === "name_asc") rows.sort((a, b) => a.name.localeCompare(b.name, "fr"))
    if (sortBy === "name_desc") rows.sort((a, b) => b.name.localeCompare(a.name, "fr"))
    return rows
  }, [apps, search, sortBy])

  return (
    <DashboardLayout role="client" navItems={clientNav} pageTitle="Produits Software">
      <div className="p-6 space-y-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Nos Applications</h2>
            <p className="text-slate-500 mt-1">Catalogue showroom dynamique depuis Firestore.</p>
          </div>
          <Link to="/client/requests" className="text-sm text-[#2463eb] font-semibold hover:opacity-80">
            Voir mes demandes
          </Link>
        </div>

        <div className="space-y-4">
          <div className="relative group">
            <div className="flex w-full items-center rounded-xl h-14 bg-white shadow-sm border border-slate-200 focus-within:border-[#2463eb] focus-within:ring-2 focus-within:ring-[#2463eb]/20 transition-all overflow-hidden">
              <div className="text-slate-400 group-focus-within:text-[#2463eb] transition-colors flex items-center justify-center pl-5">
                <span className="material-symbols-outlined text-2xl">search</span>
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-full bg-transparent border-none focus:ring-0 text-slate-900 placeholder:text-slate-400 px-4 text-base"
                placeholder="Rechercher par nom, mot-clé ou ID..."
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="mr-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 font-medium text-sm transition-colors"
                >
                  Effacer
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-slate-600 font-medium">
              <span className="text-slate-900 font-bold">{filteredApps.length}</span> applications trouvées
            </p>
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-500 font-medium">Trier par:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "relevance" | "name_asc" | "name_desc")}
                className="bg-white border border-slate-200 text-slate-900 text-sm rounded-lg py-2 pl-3 pr-8 cursor-pointer"
              >
                <option value="relevance">Pertinence</option>
                <option value="name_asc">Nom (A-Z)</option>
                <option value="name_desc">Nom (Z-A)</option>
              </select>
            </div>
          </div>
        </div>

        {success ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-80 rounded-2xl bg-slate-100 animate-pulse" />
            ))
          ) : filteredApps.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center text-slate-500">
              Aucune application trouvée.
            </div>
          ) : (
            filteredApps.map((app) => (
              <div key={app.id} className="group flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300">
                <div className={`relative h-44 w-full overflow-hidden ${app.cardBg}`}>
                  {app.image ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                      style={{ backgroundImage: `url('${app.image}')` }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white/70 text-[40px]">deployed_code</span>
                    </div>
                  )}
                  {app.badge && (
                    <div className={`absolute top-4 right-4 backdrop-blur px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${app.badge.className}`}>
                      {app.badge.label}
                    </div>
                  )}
                </div>
                <div className="p-5 flex flex-col flex-grow">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`size-10 rounded-lg ${app.iconBg} ${app.iconColor} flex items-center justify-center`}>
                      <span className="material-symbols-outlined">{app.icon}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{app.category}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#2463eb] transition-colors">{app.name}</h3>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2 flex-grow">{app.tagline}</p>
                  <p className="text-xs text-slate-400 mt-3">Prix: {app.price}</p>
                  <div className="mt-4 flex items-center gap-2">
                  <Link
                    to={`/apps/${app.slug}`}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    Détails
                  </Link>
                  <button
                    onClick={() => void orderApp(app)}
                    disabled={orderingId === app.id}
                    className="ml-auto px-3 py-1.5 text-xs font-semibold rounded-md bg-[#2463eb] text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {orderingId === app.id ? "Commande…" : "Commander"}
                  </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
