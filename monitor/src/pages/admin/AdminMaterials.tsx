import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import { db } from "@/config/firebase"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "@/lib/firebase-firestore"
import { COLLECTIONS, type FirestoreInventoryItem } from "@/data/schema"

type Item = FirestoreInventoryItem & { id: string; status: string }

const statusStyle: Record<string, string> = {
  "En stock": "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Stock bas": "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
  Rupture: "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400",
}

function deriveStatus(stock: number, threshold: number): string {
  if (stock <= 0) return "Rupture"
  if (stock <= threshold) return "Stock bas"
  return "En stock"
}

function docToItem(id: string, data: FirestoreInventoryItem): Item {
  const stock = typeof data.stock === "number" ? data.stock : 0
  const threshold = typeof data.threshold === "number" ? data.threshold : 0
  return {
    id,
    sku: data.sku ?? "",
    name: data.name ?? "",
    category: data.category ?? "",
    stock,
    threshold,
    location: data.location ?? "",
    priceDisplay: data.priceDisplay ?? "—",
    status: deriveStatus(stock, threshold),
  }
}

type ModalMode = { type: "add" } | { type: "edit"; item: Item } | null

function MaterialModal({
  mode,
  onClose,
  onSave,
  onDelete,
}: {
  mode: ModalMode
  onClose: () => void
  onSave: (payload: Omit<Item, "id" | "status">, id: string | null) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}) {
  const isEdit = mode?.type === "edit"
  const init = mode?.type === "edit" ? mode.item : null

  const [sku, setSku] = useState(init?.sku ?? "")
  const [name, setName] = useState(init?.name ?? "")
  const [category, setCategory] = useState(init?.category ?? "")
  const [stock, setStock] = useState(init?.stock ?? 0)
  const [threshold, setThreshold] = useState(init?.threshold ?? 5)
  const [location, setLocation] = useState(init?.location ?? "")
  const [priceDisplay, setPriceDisplay] = useState(init?.priceDisplay ?? "")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")
  const isDev = import.meta.env.DEV

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sku.trim() || !name.trim()) return
    setError("")
    setSaving(true)
    try {
      await onSave(
        {
          sku: sku.trim(),
          name: name.trim(),
          category: category.trim() || "Général",
          stock: Math.max(0, Math.floor(stock)),
          threshold: Math.max(0, Math.floor(threshold)),
          location: location.trim() || "—",
          priceDisplay: priceDisplay.trim() || "—",
        },
        isEdit && mode ? mode.item.id : null,
      )
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (mode?.type !== "edit" || !onDelete) return
    if (!window.confirm("Supprimer ce matériel ?")) return
    setDeleting(true)
    setError("")
    try {
      await onDelete(mode.item.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.")
    } finally {
      setDeleting(false)
    }
  }

  function autofillForDev() {
    setSku("MAT-DEV-001")
    setName("Routeur Pro X")
    setCategory("Réseau")
    setStock(24)
    setThreshold(8)
    setLocation("Entrepôt A")
    setPriceDisplay("42 000 DA")
    setError("")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <form
        className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => void handleSubmit(e)}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-slate-900 dark:text-white">
            {isEdit ? "Modifier le matériel" : "Nouveau matériel"}
          </h3>
          <div className="flex items-center gap-2">
            {isDev ? (
              <button
                type="button"
                onClick={autofillForDev}
                className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Remplir (dev)
              </button>
            ) : null}
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {[
          ["Réf. SKU", sku, setSku, "text"],
          ["Nom", name, setName, "text"],
          ["Catégorie", category, setCategory, "text"],
          ["Emplacement", location, setLocation, "text"],
          ["Prix (affichage)", priceDisplay, setPriceDisplay, "text"],
        ].map(([label, val, set, typ]) => (
          <div key={label as string} className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
            <input
              value={val as string}
              onChange={(e) => (set as (s: string) => void)(e.target.value)}
              type={typ as string}
              required={label === "Réf. SKU" || label === "Nom"}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#db143c]"
            />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Stock</label>
            <input
              type="number"
              min={0}
              value={stock}
              onChange={(e) => setStock(Number(e.target.value) || 0)}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Seuil alerte</label>
            <input
              type="number"
              min={0}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value) || 0)}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
            />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          {isEdit && onDelete ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting || saving}
              className="py-2.5 px-3 border border-rose-200 text-rose-600 rounded-lg text-sm font-medium disabled:opacity-60"
            >
              {deleting ? "…" : "Supprimer"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving || deleting}
            className="flex-1 py-2.5 bg-[#db143c] text-white text-sm font-bold rounded-lg disabled:opacity-60"
          >
            {saving ? "…" : isEdit ? "Enregistrer" : "Ajouter"}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function AdminMaterials() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState("")
  const [modal, setModal] = useState<ModalMode>(null)

  useEffect(() => {
    if (!db) {
      setLoading(false)
      setListError("Firestore indisponible.")
      return
    }
    const q = query(collection(db, COLLECTIONS.inventoryItems), orderBy("name"))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setListError("")
        setItems(snap.docs.map((d) => docToItem(d.id, d.data() as FirestoreInventoryItem)))
        setLoading(false)
      },
      (err) => {
        setListError(err.message)
        setLoading(false)
      },
    )
    return () => unsub()
  }, [])

  async function persistItem(payload: Omit<Item, "id" | "status">, id: string | null) {
    if (!db) throw new Error("Firestore indisponible.")
    const data: Record<string, unknown> = {
      ...payload,
      updatedAt: serverTimestamp(),
    }
    if (id) {
      await updateDoc(doc(db, COLLECTIONS.inventoryItems, id), data)
    } else {
      await addDoc(collection(db, COLLECTIONS.inventoryItems), {
        ...data,
        createdAt: serverTimestamp(),
      })
    }
  }

  async function removeItem(id: string) {
    if (!db) throw new Error("Firestore indisponible.")
    await deleteDoc(doc(db, COLLECTIONS.inventoryItems, id))
  }

  const counts = {
    ok: items.filter((i) => i.status === "En stock").length,
    low: items.filter((i) => i.status === "Stock bas").length,
    out: items.filter((i) => i.status === "Rupture").length,
  }

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Gestion des Matériels">
      <div className="p-6 space-y-5">
        {listError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-900/20 px-4 py-3 text-sm text-rose-700">
            {listError}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-4 flex-wrap">
            {[
              { label: "En stock", value: counts.ok, color: "text-emerald-600" },
              { label: "Stock bas", value: counts.low, color: "text-amber-600" },
              { label: "Rupture", value: counts.out, color: "text-rose-600" },
            ].map((s) => (
              <div key={s.label} className="text-sm">
                <span className={`font-bold ${s.color}`}>{loading ? "…" : s.value}</span>{" "}
                <span className="text-slate-500">{s.label}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!db}
              onClick={() => setModal({ type: "add" })}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Ajouter
            </button>
            <Link
              to="/admin/materials/order"
              className="flex items-center gap-2 px-4 py-2 bg-[#db143c] text-white text-sm font-semibold rounded-lg hover:opacity-90"
            >
              <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
              Commander
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setModal({ type: "edit", item })}
              className="text-left bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:border-[#db143c]/40 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {item.category}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusStyle[item.status]}`}>
                  {item.status}
                </span>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">{item.name}</h3>
              <p className="text-xs text-slate-400 mb-3 font-mono">{item.sku}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">
                  Stock :{" "}
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{item.stock} unités</span>
                </span>
                <span className="font-bold text-slate-900 dark:text-white">{item.priceDisplay}</span>
              </div>
            </button>
          ))}
        </div>

        {!loading && items.length === 0 && !listError ? (
          <p className="text-center text-slate-400 text-sm py-8">
            Aucun matériel. Cliquez sur « Ajouter » ou importez via la console Firebase.
          </p>
        ) : null}
      </div>

      {modal ? (
        <MaterialModal
          key={modal.type === "edit" ? modal.item.id : "add"}
          mode={modal}
          onClose={() => setModal(null)}
          onSave={persistItem}
          onDelete={removeItem}
        />
      ) : null}
    </DashboardLayout>
  )
}
