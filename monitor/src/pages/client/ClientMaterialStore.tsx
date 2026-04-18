import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { clientNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from "@/lib/firebase-firestore"
import { COLLECTIONS, ORDER_KIND, type FirestoreInventoryItem, type FirestoreOrder } from "@/data/schema"

interface ProductDoc extends FirestoreInventoryItem {
  id: string
}

export default function ClientMaterialStore() {
  const { user } = useAuth()
  const [products, setProducts] = useState<ProductDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [orderingId, setOrderingId] = useState<string | null>(null)
  const [qtyById, setQtyById] = useState<Record<string, number>>({})
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (!db) {
      setLoading(false)
      return
    }
    const q = query(collection(db, COLLECTIONS.inventoryItems), orderBy("name"))
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as FirestoreInventoryItem) }))
        .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "fr"))
      setProducts(rows)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  function setQty(id: string, next: number) {
    setQtyById((prev) => ({ ...prev, [id]: Math.max(1, Math.floor(next) || 1) }))
  }

  async function orderProduct(item: ProductDoc) {
    if (!db || !user?.organizationId) return
    const qty = qtyById[item.id] ?? 1
    setOrderingId(item.id)
    setSuccess("")
    setError("")
    try {
      await addDoc(collection(db, COLLECTIONS.orders), {
        organizationId: user.organizationId,
        kind: ORDER_KIND.materialSupply,
        createdByUserId: user.id,
        status: "En attente",
        materialName: item.name ?? "Produit",
        quantity: qty,
        supplier: "Client portal",
        notes: `Commande matériel depuis espace client (${item.sku ?? item.id})`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as FirestoreOrder)
      setSuccess(`Commande envoyée: ${item.name ?? "Produit"} (x${qty})`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer la commande.")
    } finally {
      setOrderingId(null)
    }
  }

  return (
    <DashboardLayout role="client" navItems={clientNav} pageTitle="Produits Matériels">
      <div className="p-6 space-y-5">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Catalogue Matériel</h2>

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

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  {["Produit", "Catégorie", "Stock", "Prix", "Quantité", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400">Chargement…</td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400">Aucun produit matériel disponible.</td>
                  </tr>
                ) : (
                  products.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900 dark:text-white">{item.name ?? "Produit"}</p>
                        <p className="text-xs text-slate-400">{item.sku ?? item.id}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.category ?? "Général"}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.stock ?? 0}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.priceDisplay ?? "—"}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={1}
                          value={qtyById[item.id] ?? 1}
                          onChange={(e) => setQty(item.id, Number(e.target.value))}
                          className="w-20 h-8 px-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => void orderProduct(item)}
                          disabled={orderingId === item.id}
                          className="px-3 py-1.5 text-xs font-semibold rounded-md bg-[#db143c] text-white hover:opacity-90 disabled:opacity-50"
                        >
                          {orderingId === item.id ? "Commande…" : "Commander"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
