import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import { db, firebaseApp } from "@/config/firebase"
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
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage"

type Item = FirestoreInventoryItem & { id: string; status: string; imageUrl?: string }

const statusStyle: Record<string, string> = {
  "En stock": "bg-green-100 text-green-700",
  "Stock bas": "bg-orange-100 text-orange-700",
  Rupture: "bg-red-100 text-red-700",
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
    imageUrl: data.imageUrl ?? "",
    status: deriveStatus(stock, threshold),
  }
}

function parsePrice(value: string): number {
  const n = Number(value.replace(/\s/g, "").replace(/,/g, ".").replace(/[^\d.]/g, ""))
  return Number.isFinite(n) ? n : 0
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
  onSave: (payload: Omit<Item, "id" | "status">, imageFile: File | null, id: string | null) => Promise<void>
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
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setImageFile(file)
    setImagePreview(file ? URL.createObjectURL(file) : null)
  }

  const displayImage = imagePreview || init?.imageUrl || null

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
          imageUrl: init?.imageUrl ?? "",
        },
        imageFile,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <form className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4" onClick={(e) => e.stopPropagation()} onSubmit={(e) => void handleSubmit(e)}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[#181112]">{isEdit ? "Modifier le matériel" : "Nouveau matériel"}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
        </div>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        {[
          { label: "Réf. SKU", value: sku, set: setSku },
          { label: "Nom", value: name, set: setName },
          { label: "Catégorie", value: category, set: setCategory },
          { label: "Emplacement", value: location, set: setLocation },
          { label: "Prix (DZD)", value: priceDisplay, set: setPriceDisplay },
        ].map(({ label, value, set }) => (
          <div key={label} className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">{label}</label>
            <input value={value} onChange={(e) => set(e.target.value)} required={label === "Réf. SKU" || label === "Nom"} className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm" />
          </div>
        ))}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Photo</label>
          <label className="flex h-28 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white hover:border-[#db143c]/40">
            {displayImage ? <img src={displayImage} alt="preview" className="h-full w-full rounded-xl object-contain p-1" /> : <span className="material-symbols-outlined text-slate-300">cloud_upload</span>}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange} className="hidden" />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><label className="text-sm font-medium text-slate-700">Stock</label><input type="number" min={0} value={stock} onChange={(e) => setStock(Number(e.target.value) || 0)} className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm" /></div>
          <div className="space-y-1.5"><label className="text-sm font-medium text-slate-700">Seuil alerte</label><input type="number" min={0} value={threshold} onChange={(e) => setThreshold(Number(e.target.value) || 0)} className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm" /></div>
        </div>

        <div className="flex gap-2 pt-2">
          {isEdit && onDelete ? <button type="button" onClick={() => void handleDelete()} disabled={deleting || saving} className="px-3 py-2.5 rounded-lg border border-rose-200 text-rose-600 text-sm font-medium">{deleting ? "…" : "Supprimer"}</button> : null}
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium">Annuler</button>
          <button type="submit" disabled={saving || deleting} className="flex-1 py-2.5 rounded-lg bg-[#db143c] text-sm font-bold text-white disabled:opacity-60">{saving ? "…" : isEdit ? "Enregistrer" : "Ajouter"}</button>
        </div>
      </form>
    </div>
  )
}

export default function AdminMaterials() {
  const pageSize = 6
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState("")
  const [modal, setModal] = useState<ModalMode>(null)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [sortBy, setSortBy] = useState("recent")
  const [page, setPage] = useState(1)

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

  async function uploadMaterialImage(file: File, sku: string) {
    if (!firebaseApp) throw new Error("Firebase non configuré pour l'upload.")
    const storage = getStorage(firebaseApp)
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const storagePath = `inventory_items/${sku || "item"}/${Date.now()}-${safeName}`
    const imageRef = ref(storage, storagePath)
    await uploadBytes(imageRef, file)
    return getDownloadURL(imageRef)
  }

  async function persistItem(payload: Omit<Item, "id" | "status">, imageFile: File | null, id: string | null) {
    if (!db) throw new Error("Firestore indisponible.")
    const imageUrl = imageFile ? await uploadMaterialImage(imageFile, payload.sku) : (payload.imageUrl ?? "")
    const data: Record<string, unknown> = { ...payload, imageUrl, updatedAt: serverTimestamp() }
    if (id) {
      await updateDoc(doc(db, COLLECTIONS.inventoryItems, id), data)
    } else {
      await addDoc(collection(db, COLLECTIONS.inventoryItems), { ...data, createdAt: serverTimestamp() })
    }
  }

  async function removeItem(id: string) {
    if (!db) throw new Error("Firestore indisponible.")
    await deleteDoc(doc(db, COLLECTIONS.inventoryItems, id))
  }

  const counts = useMemo(() => {
    const total = items.length
    const stockValue = items.reduce((acc, i) => acc + parsePrice(i.priceDisplay) * Math.max(0, i.stock), 0)
    const low = items.filter((i) => i.status === "Stock bas" || i.status === "Rupture").length
    return { total, stockValue, low }
  }, [items])

  const categories = useMemo(() => ["", ...Array.from(new Set(items.map((i) => i.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, "fr"))], [items])

  const filtered = useMemo(() => {
    let list = items.filter((i) => {
      const q = search.trim().toLowerCase()
      const matchSearch = !q || `${i.name} ${i.sku} ${i.category}`.toLowerCase().includes(q)
      const matchCat = !categoryFilter || i.category === categoryFilter
      return matchSearch && matchCat
    })
    if (sortBy === "price_asc") list = [...list].sort((a, b) => parsePrice(a.priceDisplay) - parsePrice(b.priceDisplay))
    if (sortBy === "price_desc") list = [...list].sort((a, b) => parsePrice(b.priceDisplay) - parsePrice(a.priceDisplay))
    if (sortBy === "stock") list = [...list].sort((a, b) => a.stock - b.stock)
    return list
  }, [items, search, categoryFilter, sortBy])

  useEffect(() => {
    setPage(1)
  }, [search, categoryFilter, sortBy])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pagedItems = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage],
  )

  const pageNumbers = useMemo(() => {
    const start = Math.max(1, Math.min(currentPage - 1, totalPages - 2))
    const end = Math.min(totalPages, start + 2)
    return Array.from({ length: end - start + 1 }, (_, idx) => start + idx)
  }, [currentPage, totalPages])

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Gestion des Matériels">
      <div className="w-full bg-[#f8f6f6] p-8">
        <div className="mx-auto max-w-[1200px]">
          {listError ? <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{listError}</div> : null}

          <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-black tracking-tight text-[#181112]">Gestion des Matériels</h1>
              <p className="text-[#896169]">Gérez l'inventaire matériel, mettez à jour les prix et l'état des stocks.</p>
            </div>
            <button onClick={() => setModal({ type: "add" })} className="flex items-center gap-2 rounded-lg bg-[#db143c] px-5 py-2.5 font-medium text-white shadow-sm transition-all hover:bg-red-700 active:scale-95"><span className="material-symbols-outlined text-[20px]">add</span>Ajouter un matériel</button>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex items-center gap-4 rounded-xl border border-[#e6dbdd] bg-white p-5 shadow-sm"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600"><span className="material-symbols-outlined">inventory</span></div><div><p className="text-sm font-medium text-[#896169]">Total produits</p><p className="text-2xl font-bold text-[#181112]">{loading ? "…" : counts.total.toLocaleString("fr-FR")}</p></div></div>
            <div className="flex items-center gap-4 rounded-xl border border-[#e6dbdd] bg-white p-5 shadow-sm"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600"><span className="material-symbols-outlined">payments</span></div><div><p className="text-sm font-medium text-[#896169]">Valeur du stock</p><p className="text-2xl font-bold text-[#181112]">{loading ? "…" : `${counts.stockValue.toLocaleString("fr-DZ")} DZD`}</p></div></div>
            <div className="flex items-center gap-4 rounded-xl border border-[#e6dbdd] bg-white p-5 shadow-sm"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-orange-600"><span className="material-symbols-outlined">warning</span></div><div><p className="text-sm font-medium text-[#896169]">Stock faible</p><p className="text-2xl font-bold text-[#181112]">{loading ? "…" : counts.low}</p></div></div>
          </div>

          <div className="sticky top-0 z-10 mb-6 rounded-xl border border-[#e6dbdd] bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1"><span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#896169]">search</span><input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border border-[#e6dbdd] bg-[#f8f6f6] py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#db143c] focus:bg-white" placeholder="Rechercher par nom, SKU ou marque..." /></div>
              <div className="relative w-full md:w-48"><span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#896169]">filter_list</span><select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full appearance-none rounded-lg border border-[#e6dbdd] bg-[#f8f6f6] py-2.5 pl-10 pr-8 text-sm"><option value="">Toutes catégories</option>{categories.slice(1).map((c) => <option key={c} value={c}>{c}</option>)}</select><span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#896169]">expand_more</span></div>
              <div className="relative w-full md:w-48"><span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#896169]">sort</span><select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full appearance-none rounded-lg border border-[#e6dbdd] bg-[#f8f6f6] py-2.5 pl-10 pr-8 text-sm"><option value="recent">Plus récents</option><option value="price_asc">Prix croissant</option><option value="price_desc">Prix décroissant</option><option value="stock">Stock faible</option></select><span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#896169]">expand_more</span></div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 pb-12 md:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              Array.from({ length: pageSize }).map((_, idx) => (
                <div key={idx} className="h-[420px] animate-pulse rounded-xl border border-[#e6dbdd] bg-white" />
              ))
            ) : pagedItems.length === 0 ? (
              <div className="col-span-full rounded-xl border border-[#e6dbdd] bg-white px-6 py-16 text-center text-[#896169]">
                Aucun matériel trouvé.
              </div>
            ) : pagedItems.map((item) => (
              <button key={item.id} type="button" onClick={() => setModal({ type: "edit", item })} className="group overflow-hidden rounded-xl border border-[#e6dbdd] bg-white text-left transition-all duration-300 hover:border-[#db143c]/30 hover:shadow-md">
                <div className="relative h-48 overflow-hidden bg-gray-100">
                  <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `url(${item.imageUrl || "https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=1200&q=80"})` }} />
                  <div className="absolute left-3 top-3"><span className={`px-2.5 py-1 rounded-md text-xs font-bold shadow-sm ${statusStyle[item.status] || "bg-slate-100 text-slate-600"}`}>{item.status}</span></div>
                </div>
                <div className="p-5">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#db143c]">{item.category || "Général"}</p>
                  <h3 className="text-lg font-bold leading-tight text-[#181112]">{item.name}</h3>
                  <p className="mb-4 text-xs text-[#896169] font-mono">{item.sku}</p>
                  <div className="flex items-center justify-between border-t border-[#e6dbdd]/50 pt-4"><div><p className="mb-0.5 text-xs text-[#896169]">Prix unitaire</p><p className="text-lg font-bold text-[#181112]">{item.priceDisplay}</p></div><div className="text-right"><p className="mb-0.5 text-xs text-[#896169]">Stock</p><p className="text-sm font-semibold text-[#181112]">{item.stock} unités</p></div></div>
                  <div className="mt-4 flex gap-2"><span className="flex-1 rounded-lg bg-[#f8f6f6] py-2 text-center text-sm font-medium text-[#181112]">Détails</span><span className="flex-1 rounded-lg bg-[#db143c]/10 py-2 text-center text-sm font-medium text-[#db143c]">Modifier</span></div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-[#896169]">
              Affichage {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} à {Math.min(currentPage * pageSize, filtered.length)} sur {filtered.length} matériels
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e6dbdd] text-[#896169] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Page précédente"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              {pageNumbers[0] > 1 ? (
                <>
                  <button type="button" onClick={() => setPage(1)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e6dbdd] font-medium text-[#181112]">1</button>
                  <span className="px-1 text-[#896169]">...</span>
                </>
              ) : null}
              {pageNumbers.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg font-bold ${
                    n === currentPage ? "bg-[#db143c] text-white shadow-sm" : "border border-[#e6dbdd] text-[#181112]"
                  }`}
                >
                  {n}
                </button>
              ))}
              {pageNumbers[pageNumbers.length - 1] < totalPages ? (
                <>
                  <span className="px-1 text-[#896169]">...</span>
                  <button type="button" onClick={() => setPage(totalPages)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e6dbdd] font-medium text-[#181112]">{totalPages}</button>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e6dbdd] text-[#896169] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Page suivante"
              >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>

          <div className="mt-4 flex justify-end"><Link to="/client/materials/order" className="rounded-lg bg-[#db143c] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Voir le catalogue client</Link></div>
        </div>
      </div>

      {modal ? (
        <MaterialModal
          key={modal.type === "edit" ? modal.item.id : "add"}
          mode={modal}
          onClose={() => setModal(null)}
          onSave={(payload, imageFile, id) => persistItem(payload, imageFile, id)}
          onDelete={removeItem}
        />
      ) : null}
    </DashboardLayout>
  )
}
