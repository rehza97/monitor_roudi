import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { clientNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import { addDoc, collection, onSnapshot, serverTimestamp } from "@/lib/firebase-firestore"
import { parseCatalogProductDoc, type CatalogProduct } from "@/lib/catalog-products"
import { COLLECTIONS, ORDER_KIND, type FirestoreOrder } from "@/data/schema"

export default function ClientSoftwareStore() {
  const { user } = useAuth()
  const [apps, setApps] = useState<CatalogProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [orderingId, setOrderingId] = useState<string | null>(null)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

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
      await addDoc(collection(db, COLLECTIONS.orders), {
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
      } as FirestoreOrder)
      setSuccess(`Commande envoyée pour ${app.name}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer la commande.")
    } finally {
      setOrderingId(null)
    }
  }

  return (
    <DashboardLayout role="client" navItems={clientNav} pageTitle="Produits Software">
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Catalogue Software</h2>
          <Link to="/client/requests" className="text-sm text-[#db143c] font-medium hover:opacity-80">
            Voir mes demandes
          </Link>
        </div>

        {success ? (
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2.5 text-sm text-emerald-700 dark:text-emerald-300">
            {success}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 px-4 py-2.5 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))
          ) : apps.length === 0 ? (
            <div className="col-span-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-14 text-center text-slate-500">
              Aucune application disponible.
            </div>
          ) : (
            apps.map((app) => (
              <div key={app.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={`size-10 rounded-lg ${app.iconBg} ${app.iconColor} flex items-center justify-center`}>
                    <span className="material-symbols-outlined">{app.icon}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{app.category}</span>
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white">{app.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{app.tagline}</p>
                <p className="text-xs text-slate-400 mt-3">Prix: {app.price}</p>
                <div className="mt-4 flex items-center gap-2">
                  <Link
                    to={`/apps/${app.slug}`}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Détails
                  </Link>
                  <button
                    onClick={() => void orderApp(app)}
                    disabled={orderingId === app.id}
                    className="ml-auto px-3 py-1.5 text-xs font-semibold rounded-md bg-[#db143c] text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {orderingId === app.id ? "Commande…" : "Commander"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
