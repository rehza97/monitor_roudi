import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import { db } from "@/config/firebase"
import { useAuth } from "@/contexts/AuthContext"
import {
  COLLECTIONS,
  ORDER_KIND,
  PLATFORM_ORGANIZATION_ID,
  type FirestoreOrder,
  type FirestoreInventoryItem,
} from "@/data/schema"
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "@/lib/firebase-firestore"
import { formatFirestoreDate } from "@/lib/utils"

const SUPPLIERS = [
  "Afrique Équipements",
  "TechSupply DZ",
  "Global Parts SA",
  "Maghreb Hardware",
  "Autre (préciser dans les notes)",
]

type MaterialOrderStatus = "En attente" | "En cours" | "Validée" | "Livrée" | "Rejetée"

type MaterialOrderRow = FirestoreOrder & { id: string }

const STATUS_FLOW: MaterialOrderStatus[] = [
  "En attente",
  "En cours",
  "Validée",
  "Livrée",
  "Rejetée",
]

const statusBadge: Record<MaterialOrderStatus, string> = {
  "En attente": "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
  "En cours": "text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400",
  "Validée": "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Livrée": "text-teal-700 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400",
  "Rejetée": "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400",
}

function isMaterialOrderStatus(value: unknown): value is MaterialOrderStatus {
  return typeof value === "string" && STATUS_FLOW.includes(value as MaterialOrderStatus)
}

export default function AdminMaterialsOrder() {
  const { user } = useAuth()
  const [materialOptions, setMaterialOptions] = useState<string[]>([])
  const [orders, setOrders] = useState<MaterialOrderRow[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [material, setMaterial] = useState("")
  const [qty, setQty] = useState("1")
  const [supplier, setSupplier] = useState("")
  const [notes, setNotes] = useState("")
  const [state, setState] = useState<"idle" | "submitting" | "done">("idle")
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<MaterialOrderStatus | "Tous">("Tous")
  const [lastOrderId, setLastOrderId] = useState<string | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!db) return
    const q = query(collection(db, COLLECTIONS.inventoryItems), orderBy("name"))
    return onSnapshot(q, (snap) => {
      setMaterialOptions(snap.docs.map((d) => (d.data() as FirestoreInventoryItem).name || d.id))
    })
  }, [])

  useEffect(() => {
    if (!db) {
      setLoadingOrders(false)
      return
    }
    const q = query(
      collection(db, COLLECTIONS.orders),
      where("kind", "==", ORDER_KIND.materialSupply),
      orderBy("createdAt", "desc"),
    )
    return onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as FirestoreOrder) }))
      setOrders(rows)
      setLoadingOrders(false)
    })
  }, [])

  async function updateOrderStatus(orderId: string, status: MaterialOrderStatus) {
    if (!db) return
    setUpdatingOrderId(orderId)
    try {
      await updateDoc(doc(db, COLLECTIONS.orders, orderId), {
        status,
        updatedAt: serverTimestamp(),
      })
    } finally {
      setUpdatingOrderId(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!material || !supplier || !db || !user) return
    setError("")
    setState("submitting")
    try {
      const q = Math.max(1, Math.floor(Number(qty) || 1))
      const ref = await addDoc(collection(db, COLLECTIONS.orders), {
        organizationId: PLATFORM_ORGANIZATION_ID,
        kind: ORDER_KIND.materialSupply,
        createdByUserId: user.id,
        status: "En attente",
        materialName: material,
        quantity: q,
        supplier,
        notes: notes.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      setLastOrderId(ref.id)
      setState("done")
    } catch (err) {
      setState("idle")
      setError(err instanceof Error ? err.message : "Échec de la commande.")
    }
  }

  if (state === "done") {
    return (
      <DashboardLayout role="admin" navItems={adminNav} pageTitle="Commander des matériels">
        <div className="flex flex-col items-center justify-center py-24 gap-5">
          <div className="size-20 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-emerald-600 text-[40px]">check_circle</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Commande enregistrée</h2>
          <p className="text-slate-500 text-sm text-center max-w-xs">
            Votre commande de <strong>{qty}× {material}</strong> ({supplier}) a été enregistrée dans Firestore
            {lastOrderId ? (
              <>
                {" "}
                (réf. <span className="font-mono text-xs">{lastOrderId.slice(0, 12)}…</span>)
              </>
            ) : null}
            .
          </p>
          <div className="flex gap-3">
            <Link
              to="/admin/materials"
              className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Retour aux matériels
            </Link>
            <button
              type="button"
              onClick={() => {
                setMaterial("")
                setQty("1")
                setSupplier("")
                setNotes("")
                setLastOrderId(null)
                setState("idle")
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#db143c] hover:opacity-90 text-white text-sm font-semibold rounded-lg"
            >
              Nouvelle commande
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const filteredOrders = orders.filter((o) => {
    if (activeFilter === "Tous") return true
    return o.status === activeFilter
  })

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Commander des matériels">
      <div className="p-6 w-full space-y-6">
        <Link to="/admin/materials" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Retour aux matériels
        </Link>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        <form className="space-y-5" onSubmit={(e) => void handleSubmit(e)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">Détails de la commande</h3>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Matériel <span className="text-rose-500">*</span>
              </label>
              <select
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#db143c]"
              >
                <option value="">Sélectionner un matériel…</option>
                {materialOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              {materialOptions.length === 0 && db ? (
                <p className="text-xs text-amber-600">
                  Aucun article en stock — ajoutez des matériels depuis « Gestion des Matériels ».
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Quantité <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#db143c]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Fournisseur <span className="text-rose-500">*</span>
                </label>
                <select
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#db143c]"
                >
                  <option value="">Sélectionner…</option>
                  {SUPPLIERS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Notes <span className="text-slate-400 font-normal">(optionnel)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#db143c] resize-none"
                placeholder="Instructions particulières…"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Link
              to="/admin/materials"
              className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={state === "submitting" || !material || !supplier || !db || !user}
              className="px-5 py-2.5 bg-[#db143c] hover:opacity-90 disabled:opacity-60 text-white text-sm font-bold rounded-lg transition-opacity flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">
                {state === "submitting" ? "hourglass_empty" : "shopping_cart"}
              </span>
              {state === "submitting" ? "Envoi…" : "Passer la commande"}
            </button>
          </div>
        </form>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-white">Suivi des commandes matériel</h3>
          </div>

          <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap">
            {(["Tous", ...STATUS_FLOW] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setActiveFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeFilter === status
                    ? "bg-[#db143c] text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  {["Réf.", "Matériel", "Qté", "Fournisseur", "Statut", "Date", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loadingOrders ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Chargement des commandes…
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Aucune commande pour ce filtre.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => {
                    const status = isMaterialOrderStatus(o.status) ? o.status : "En attente"
                    return (
                      <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">
                          {o.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                          {o.materialName ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{o.quantity ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{o.supplier ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge[status]}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {formatFirestoreDate(o.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            {STATUS_FLOW.filter((s) => s !== status).map((next) => (
                              <button
                                key={next}
                                type="button"
                                disabled={updatingOrderId === o.id}
                                onClick={() => void updateOrderStatus(o.id, next)}
                                className="px-2 py-1 text-[11px] font-semibold rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                              >
                                {next}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
