import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import PublicLayout from "@/components/layouts/PublicLayout"
import { db } from "@/config/firebase"
import { useAuth } from "@/contexts/AuthContext"
import {
  COLLECTIONS,
  ORDER_KIND,
  PLATFORM_ORGANIZATION_ID,
  type FirestoreInventoryItem,
  type FirestoreOrder,
} from "@/data/schema"
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "@/lib/firebase-firestore"
import { notifyAdminsOfOrderCreated } from "@/lib/notifications"
import { parseCatalogProductDoc, type CatalogProduct } from "@/lib/catalog-products"

type ProductDoc = FirestoreInventoryItem & { id: string }
type CartKind = "material" | "app" | "custom_app"
type CartItem = {
  key: string
  kind: CartKind
  id?: string
  name: string
  category: string
  price: string
  image?: string
  qty: number
  description?: string
}

const DZD = new Intl.NumberFormat("fr-DZ", {
  style: "currency",
  currency: "DZD",
  maximumFractionDigits: 0,
})

function parseDzd(value?: string) {
  if (!value) return 0
  const cleaned = value.replace(/\s/g, "").replace(/,/g, ".").replace(/[^\d.]/g, "")
  const amount = Number(cleaned)
  return Number.isFinite(amount) ? amount : 0
}

function itemImage(item: ProductDoc) {
  return (
    item.imageUrl ||
    "https://images.unsplash.com/photo-1553406830-ef2513450d76?auto=format&fit=crop&w=1200&q=80"
  )
}

function appImage(app: CatalogProduct) {
  return (
    app.image ||
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80"
  )
}

export default function AdminMaterialsOrder() {
  const pageSize = 6
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [products, setProducts] = useState<ProductDoc[]>([])
  const [apps, setApps] = useState<CatalogProduct[]>([])
  const [loadingMaterials, setLoadingMaterials] = useState(true)
  const [loadingApps, setLoadingApps] = useState(true)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<"materials" | "apps" | "custom">("materials")
  const [activeCategory, setActiveCategory] = useState("Tous")
  const [page, setPage] = useState(1)
  const [cart, setCart] = useState<Record<string, CartItem>>({})
  const [customName, setCustomName] = useState("")
  const [customBudget, setCustomBudget] = useState("")
  const [customDescription, setCustomDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    if (!user) setSuccess("")
  }, [user])

  useEffect(() => {
    if (!db) {
      setLoadingMaterials(false)
      return
    }
    const q = query(collection(db, COLLECTIONS.inventoryItems), orderBy("name"))
    return onSnapshot(q, (snap) => {
      const rows = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as FirestoreInventoryItem) }))
        .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "fr"))
      setProducts(rows)
      setLoadingMaterials(false)
    })
  }, [])

  useEffect(() => {
    if (!db) {
      setLoadingApps(false)
      return
    }
    return onSnapshot(collection(db, COLLECTIONS.catalogProducts), (snap) => {
      const rows = snap.docs
        .map((d) => parseCatalogProductDoc(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => a.name.localeCompare(b.name, "fr"))
      setApps(rows)
      setLoadingApps(false)
    })
  }, [])

  const categories = useMemo(() => {
    const source = activeTab === "apps" ? apps.map((p) => p.category) : products.map((p) => p.category)
    return ["Tous", ...Array.from(new Set(source.filter(Boolean)))]
  }, [activeTab, apps, products])

  useEffect(() => {
    setActiveCategory("Tous")
    setPage(1)
  }, [activeTab])

  useEffect(() => {
    setPage(1)
  }, [search, activeCategory])

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      const matchesCategory = activeCategory === "Tous" || p.category === activeCategory
      const matchesSearch =
        !q || `${p.name ?? ""} ${p.category ?? ""} ${p.sku ?? ""}`.toLowerCase().includes(q)
      return matchesCategory && matchesSearch
    })
  }, [products, activeCategory, search])

  const visibleApps = useMemo(() => {
    const q = search.trim().toLowerCase()
    return apps.filter((app) => {
      const matchesCategory = activeCategory === "Tous" || app.category === activeCategory
      const matchesSearch = !q || `${app.name} ${app.category} ${app.tagline}`.toLowerCase().includes(q)
      return matchesCategory && matchesSearch
    })
  }, [apps, activeCategory, search])

  const activeTotal = activeTab === "apps" ? visibleApps.length : visibleProducts.length
  const totalPages = Math.max(1, Math.ceil(activeTotal / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pagedProducts = useMemo(
    () => visibleProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [visibleProducts, currentPage],
  )
  const pagedApps = useMemo(
    () => visibleApps.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [visibleApps, currentPage],
  )
  const pageNumbers = useMemo(() => {
    const start = Math.max(1, Math.min(currentPage - 1, totalPages - 2))
    const end = Math.min(totalPages, start + 2)
    return Array.from({ length: end - start + 1 }, (_, idx) => start + idx)
  }, [currentPage, totalPages])

  const cartItems = useMemo(() => Object.values(cart).filter((item) => item.qty > 0), [cart])
  const total = useMemo(() => cartItems.reduce((acc, row) => acc + parseDzd(row.price) * row.qty, 0), [cartItems])

  function setQty(key: string, qty: number) {
    setCart((prev) => {
      const next = { ...prev }
      if (qty <= 0) {
        delete next[key]
      } else if (next[key]) {
        next[key] = { ...next[key], qty: Math.max(1, Math.floor(qty)) }
      }
      return next
    })
  }

  function addMaterial(item: ProductDoc, qty = 1) {
    const key = `material:${item.id}`
    setCart((prev) => ({
      ...prev,
      [key]: {
        key,
        kind: "material",
        id: item.id,
        name: item.name || "Matériel",
        category: item.category || "Général",
        price: item.priceDisplay || DZD.format(0),
        image: itemImage(item),
        qty: (prev[key]?.qty ?? 0) + qty,
      },
    }))
  }

  function addApp(app: CatalogProduct) {
    const key = `app:${app.id}`
    setCart((prev) => ({
      ...prev,
      [key]: {
        key,
        kind: "app",
        id: app.id,
        name: app.name,
        category: app.category,
        price: app.price,
        image: appImage(app),
        qty: 1,
        description: app.tagline,
      },
    }))
  }

  function addCustomApp() {
    if (!customName.trim() || !customDescription.trim()) {
      setError("Décrivez votre application custom avant de l'ajouter.")
      return
    }
    const key = `custom:${Date.now()}`
    setCart((prev) => ({
      ...prev,
      [key]: {
        key,
        kind: "custom_app",
        name: customName.trim(),
        category: "Application custom",
        price: customBudget.trim() || "Sur devis",
        qty: 1,
        description: customDescription.trim(),
      },
    }))
    setCustomName("")
    setCustomBudget("")
    setCustomDescription("")
    setError("")
  }

  async function placeOrder() {
    if (!db || cartItems.length === 0) return
    if (!user) {
      setError("Vous devez vous connecter pour envoyer une commande.")
      navigate("/login", { state: { from: { pathname: location.pathname } } })
      return
    }
    const name = user.name.trim()
    const email = user.email.trim()

    setSubmitting(true)
    setError("")
    setSuccess("")
    try {
      const ids: string[] = []
      for (const row of cartItems) {
        const common = {
          organizationId: user?.organizationId ?? PLATFORM_ORGANIZATION_ID,
          createdByUserId: user?.id ?? "guest",
          clientLabel: name,
          clientEmail: email,
          status: "En attente",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }

        const payload: FirestoreOrder =
          row.kind === "material"
            ? {
                ...common,
                kind: ORDER_KIND.materialSupply,
                materialName: row.name,
                quantity: row.qty,
                supplier: "Catalogue client",
                notes: `Commande matériel publique (${row.id ?? row.key})`,
              }
            : {
                ...common,
                kind: ORDER_KIND.clientRequest,
                requestType: row.kind === "custom_app" ? `Application custom: ${row.name}` : `Commande app: ${row.name}`,
                budgetLabel: row.price,
                description: row.description || `Demande depuis le catalogue public (${row.id ?? row.key}).`,
                timelineLabel: "À planifier",
                priority: "Normale",
              }

        const ref = await addDoc(collection(db, COLLECTIONS.orders), payload)
        await notifyAdminsOfOrderCreated(ref.id, payload)
        ids.push(ref.id)
      }
      setSuccess(`${cartItems.length} demande(s) envoyée(s). Réf: ${ids[0]?.slice(0, 10) ?? "ok"}...`)
      setCart({})
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la commande.")
    } finally {
      setSubmitting(false)
    }
  }

  const tabConfig = [
    { id: "materials", label: "Matériels", icon: "inventory_2" },
    { id: "apps", label: "Applications", icon: "deployed_code" },
    { id: "custom", label: "App custom", icon: "add_box" },
  ] as const

  function renderPagination() {
    if (activeTab === "custom" || activeTotal <= pageSize) return null
    return (
      <div className="mt-8 flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm text-slate-500">
          Affichage {(currentPage - 1) * pageSize + 1} à {Math.min(currentPage * pageSize, activeTotal)} sur {activeTotal}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Page précédente"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          {pageNumbers[0] > 1 ? (
            <>
              <button type="button" onClick={() => setPage(1)} className="flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700">1</button>
              <span className="px-1 text-slate-400">...</span>
            </>
          ) : null}
          {pageNumbers.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              className={`flex size-10 items-center justify-center rounded-lg text-sm font-bold ${
                n === currentPage ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700"
              }`}
            >
              {n}
            </button>
          ))}
          {pageNumbers[pageNumbers.length - 1] < totalPages ? (
            <>
              <span className="px-1 text-slate-400">...</span>
              <button type="button" onClick={() => setPage(totalPages)} className="flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700">{totalPages}</button>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Page suivante"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <PublicLayout>
      <div className="min-h-screen bg-[#f6f8f8] text-slate-900">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-700">Catalogue client</p>
            <div className="mt-3 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div>
                <h1 className="text-4xl font-black tracking-tight text-slate-950">Commander apps, apps custom et matériels</h1>
                <p className="mt-3 max-w-2xl text-slate-500">
                  Accessible aux clients et visiteurs. Choisissez des équipements, commandez une application publiée ou décrivez une app sur mesure.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Total panier: <span className="font-bold text-slate-950">{DZD.format(total)}</span>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_22rem] lg:px-8">
          <main className="min-w-0">
            <div className="sticky top-16 z-20 mb-6 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex gap-2 overflow-x-auto">
                  {tabConfig.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ${
                        activeTab === tab.id ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative min-w-0 sm:w-80">
                    <span className="material-symbols-outlined pointer-events-none absolute left-3 top-2.5 text-slate-400">search</span>
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Rechercher..."
                      className="block h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-cyan-600"
                    />
                  </div>
                  {activeTab !== "custom" ? (
                    <select
                      value={activeCategory}
                      onChange={(e) => setActiveCategory(e.target.value)}
                      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-600"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  ) : null}
                </div>
              </div>
            </div>

            {error ? <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</div> : null}
            {success ? <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">{success}</div> : null}

            {activeTab === "materials" ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {loadingMaterials ? (
                  Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white" />)
                ) : visibleProducts.length === 0 ? (
                  <div className="col-span-full rounded-xl border border-slate-200 bg-white py-16 text-center text-slate-500">Aucun matériel trouvé.</div>
                ) : pagedProducts.map((item) => {
                  const stock = Number(item.stock ?? 0)
                  const isOut = stock <= 0
                  const cartKey = `material:${item.id}`
                  const inCart = cart[cartKey]?.qty ?? 0
                  return (
                    <article key={item.id} className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:shadow-lg">
                      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                        <img src={itemImage(item)} alt={item.name ?? "Matériel"} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <div className="absolute right-3 top-3 rounded border border-slate-200 bg-white/95 px-2 py-1 text-xs font-bold text-slate-900">
                          {isOut ? "Rupture" : "En stock"}
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-cyan-700">{item.category || "Général"}</p>
                        <h3 className="text-lg font-bold leading-tight text-slate-900">{item.name || "Matériel"}</h3>
                        <p className="mb-4 text-sm text-slate-500">SKU: {item.sku || item.id} - Stock: {stock}</p>
                        <div className="mt-auto flex items-center justify-between gap-3">
                          <span className="text-lg font-bold text-slate-900">{item.priceDisplay || DZD.format(0)}</span>
                          <button
                            type="button"
                            disabled={isOut}
                            onClick={() => addMaterial(item)}
                            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
                          >
                            {inCart > 0 ? `Ajouté (${inCart})` : "Ajouter"}
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : null}
            {activeTab === "materials" ? renderPagination() : null}

            {activeTab === "apps" ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {loadingApps ? (
                  Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white" />)
                ) : visibleApps.length === 0 ? (
                  <div className="col-span-full rounded-xl border border-slate-200 bg-white py-16 text-center text-slate-500">Aucune application trouvée.</div>
                ) : pagedApps.map((app) => (
                  <article key={app.id} className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:shadow-lg">
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                      <img src={appImage(app)} alt={app.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-blue-700">{app.category}</p>
                      <h3 className="text-lg font-bold leading-tight text-slate-900">{app.name}</h3>
                      <p className="mb-4 line-clamp-2 text-sm text-slate-500">{app.tagline}</p>
                      <div className="mt-auto flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-slate-900">{app.price}</span>
                        <button type="button" onClick={() => addApp(app)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                          Commander
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
            {activeTab === "apps" ? renderPagination() : null}

            {activeTab === "custom" ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-slate-950">Demande d'application custom</h2>
                <p className="mt-2 text-sm text-slate-500">Décrivez votre besoin et ajoutez-le au panier de demandes.</p>
                <div className="mt-6 grid gap-4">
                  <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Nom ou domaine de l'application" className="h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-cyan-600" />
                  <input value={customBudget} onChange={(e) => setCustomBudget(e.target.value)} placeholder="Budget indicatif (ex: 250 000 DA)" className="h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-cyan-600" />
                  <textarea value={customDescription} onChange={(e) => setCustomDescription(e.target.value)} placeholder="Fonctionnalités, utilisateurs, délais, intégrations..." rows={8} className="rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none focus:border-cyan-600" />
                  <button type="button" onClick={addCustomApp} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800">
                    <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                    Ajouter la demande custom
                  </button>
                </div>
              </div>
            ) : null}
          </main>

          <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
            <h2 className="text-xl font-bold text-slate-950">Panier</h2>
            <p className="mt-1 text-sm text-slate-500">Récapitulatif de vos demandes</p>

            <div className="mt-5 space-y-4">
              {cartItems.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Votre panier est vide.</div>
              ) : cartItems.map((item) => (
                <div key={item.key} className="flex items-start gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                    {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : <span className="material-symbols-outlined text-slate-400">add_box</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.category}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-cyan-700">{item.price}</span>
                      <div className="inline-flex items-center rounded-md bg-slate-100 p-1">
                        <button type="button" onClick={() => setQty(item.key, item.qty - 1)} className="inline-flex size-5 items-center justify-center rounded bg-white text-slate-600 shadow-sm">
                          <span className="material-symbols-outlined text-[14px]">remove</span>
                        </button>
                        <span className="w-5 text-center text-xs font-semibold">{item.qty}</span>
                        <button type="button" onClick={() => setQty(item.key, item.qty + 1)} disabled={item.kind !== "material"} className="inline-flex size-5 items-center justify-center rounded bg-white text-slate-600 shadow-sm disabled:opacity-40">
                          <span className="material-symbols-outlined text-[14px]">add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!user ? (
              <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Vous devez vous connecter pour envoyer une commande. Votre panier reste visible pendant la navigation.
              </div>
            ) : null}

            <div className="mt-6 border-t border-slate-200 pt-5">
              <div className="mb-4 flex items-center justify-between text-base font-bold text-slate-900">
                <span>Total</span>
                <span>{DZD.format(total)}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    navigate("/login", { state: { from: { pathname: location.pathname } } })
                    return
                  }
                  void placeOrder()
                }}
                disabled={submitting || cartItems.length === 0}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">shopping_cart_checkout</span>
                {!user ? "Connectez-vous pour commander" : submitting ? "Validation..." : "Envoyer la demande"}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </PublicLayout>
  )
}
