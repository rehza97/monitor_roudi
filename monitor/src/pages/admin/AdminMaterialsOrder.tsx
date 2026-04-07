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
  type FirestoreInventoryItem,
} from "@/data/schema"
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from "@/lib/firebase-firestore"

const SUPPLIERS = [
  "Afrique Équipements",
  "TechSupply DZ",
  "Global Parts SA",
  "Maghreb Hardware",
  "Autre (préciser dans les notes)",
]

export default function AdminMaterialsOrder() {
  const { user } = useAuth()
  const [materialOptions, setMaterialOptions] = useState<string[]>([])
  const [material, setMaterial] = useState("")
  const [qty, setQty] = useState("1")
  const [supplier, setSupplier] = useState("")
  const [notes, setNotes] = useState("")
  const [state, setState] = useState<"idle" | "submitting" | "done">("idle")
  const [lastOrderId, setLastOrderId] = useState<string | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!db) return
    const q = query(collection(db, COLLECTIONS.inventoryItems), orderBy("name"))
    return onSnapshot(q, (snap) => {
      setMaterialOptions(snap.docs.map((d) => (d.data() as FirestoreInventoryItem).name || d.id))
    })
  }, [])

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
      </div>
    </DashboardLayout>
  )
}
