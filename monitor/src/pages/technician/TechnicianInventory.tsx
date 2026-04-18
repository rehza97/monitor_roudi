import { useEffect, useMemo, useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { technicianNav } from "@/lib/nav"
import { db } from "@/config/firebase"
import { useAuth } from "@/contexts/AuthContext"
import { COLLECTIONS, ORDER_KIND, PLATFORM_ORGANIZATION_ID, type FirestoreInventoryItem } from "@/data/schema"
import { addDoc, collection, onSnapshot, serverTimestamp } from "@/lib/firebase-firestore"

type Item = {
  id: string
  ref: string
  name: string
  category: string
  stock: number
  threshold: number
  location: string
  status: "OK" | "Bas" | "Rupture"
}

const statusColors: Record<Item["status"], string> = {
  OK: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
  Bas: "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
  Rupture: "text-rose-600 bg-rose-50 dark:bg-rose-900/20",
}

function toStatus(stock: number, threshold: number): Item["status"] {
  if (stock <= 0) return "Rupture"
  if (stock <= threshold) return "Bas"
  return "OK"
}

function mapItem(id: string, data: FirestoreInventoryItem): Item {
  const stock = typeof data.stock === "number" ? data.stock : 0
  const threshold = typeof data.threshold === "number" ? data.threshold : 0
  return {
    id,
    ref: data.sku || id,
    name: data.name || "Matériel",
    category: data.category || "Général",
    stock,
    threshold,
    location: data.location || "—",
    status: toStatus(stock, threshold),
  }
}

function OrderModal({
  item,
  onClose,
  onOrder,
}: {
  item: Item
  onClose: () => void
  onOrder: (qty: number) => Promise<void>
}) {
  const [qty, setQty] = useState(Math.max(1, item.threshold * 2))
  const [ordering, setOrdering] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  async function handleOrder() {
    setOrdering(true)
    setError("")
    try {
      await onOrder(qty)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la commande")
    } finally {
      setOrdering(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div className="flex flex-col items-center py-4 text-center gap-3">
            <div className="size-14 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-emerald-600 text-[32px]">check_circle</span>
            </div>
            <p className="font-bold text-slate-900 dark:text-white">Commande envoyée</p>
            <p className="text-sm text-slate-500">{qty}× {item.name}</p>
            <button onClick={onClose} className="mt-2 px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-lg transition-colors">
              Fermer
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-900 dark:text-white">Commander du stock</h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{item.name} · {item.ref}</p>
            <div className="space-y-1.5 mb-5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Quantité à commander</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="size-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800">
                  <span className="material-symbols-outlined text-[18px]">remove</span>
                </button>
                <input
                  type="number"
                  value={qty}
                  min={1}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                  className="flex-1 h-10 px-3 text-center text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button onClick={() => setQty((q) => q + 1)} className="size-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800">
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
              </div>
            </div>
            {error && <p className="text-xs text-rose-600 mb-3">{error}</p>}
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                Annuler
              </button>
              <button
                onClick={() => void handleOrder()}
                disabled={ordering}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-bold rounded-lg transition-colors"
              >
                {ordering ? "Envoi…" : "Commander"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function TechnicianInventory() {
  const { user } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [orderItem, setOrderItem] = useState<Item | null>(null)

  useEffect(() => {
    if (!db) {
      setLoading(false)
      return
    }
    const unsub = onSnapshot(collection(db, COLLECTIONS.inventoryItems), (snap) => {
      const rows = snap.docs
        .map((d) => mapItem(d.id, d.data() as FirestoreInventoryItem))
        .sort((a, b) => a.name.localeCompare(b.name, "fr"))
      setItems(rows)
      setLoading(false)
    })
    return unsub
  }, [])

  async function createMaterialOrder(item: Item, qty: number) {
    if (!db || !user?.id) throw new Error("Utilisateur non connecté")
    await addDoc(collection(db, COLLECTIONS.orders), {
      organizationId: PLATFORM_ORGANIZATION_ID,
      kind: ORDER_KIND.materialSupply,
      createdByUserId: user.id,
      status: "En attente",
      materialName: item.name,
      quantity: qty,
      supplier: "À définir",
      notes: `Commande depuis l'inventaire technicien (${item.ref})`,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  const alerts = useMemo(() => items.filter((i) => i.status !== "OK"), [items])

  return (
    <DashboardLayout role="technician" navItems={technicianNav} pageTitle="Inventaire">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Inventaire matériel</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{items.length} références en stock</p>
          </div>
        </div>

        {!loading && alerts.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0 mt-0.5">warning</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                {alerts.filter((i) => i.status === "Rupture").length} rupture(s) · {alerts.filter((i) => i.status === "Bas").length} stock(s) bas
              </p>
            </div>
            <button onClick={() => setOrderItem(alerts[0])} className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline shrink-0">
              Commander →
            </button>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  {["Référence", "Désignation", "Catégorie", "Stock", "Seuil", "Localisation", "État", ""].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-slate-400">Chargement…</td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-slate-400">Aucun matériel en base.</td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-4 font-mono text-xs text-slate-500">{item.ref}</td>
                      <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">{item.name}</td>
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{item.category}</td>
                      <td className="px-5 py-4">
                        <span className={`font-bold text-base ${item.stock === 0 ? "text-rose-600" : item.stock <= item.threshold ? "text-amber-600" : "text-slate-900 dark:text-white"}`}>
                          {item.stock}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{item.threshold}</td>
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{item.location}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[item.status]}`}>{item.status}</span>
                      </td>
                      <td className="px-5 py-4">
                        {item.status !== "OK" && (
                          <button onClick={() => setOrderItem(item)} className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">shopping_cart</span>Commander
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {orderItem && (
        <OrderModal
          item={orderItem}
          onClose={() => setOrderItem(null)}
          onOrder={async (qty) => {
            await createMaterialOrder(orderItem, qty)
          }}
        />
      )}
    </DashboardLayout>
  )
}
