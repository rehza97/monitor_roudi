import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import OnboardingHint from "@/components/shared/OnboardingHint"
import { clientNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import {
  addDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  orderBy,
} from "@/lib/firebase-firestore"
import { parseCatalogProductDoc, type CatalogProduct } from "@/lib/catalog-products"
import {
  COLLECTIONS,
  ORDER_KIND,
  type FirestoreOrder,
  type Deployment,
  type FirestoreInventoryItem,
} from "@/data/schema"
import { formatFirestoreDate } from "@/lib/utils"

const statusColor: Record<string, string> = {
  "En attente": "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
  "Validée":    "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400",
  "En cours":   "text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400",
  "Rejetée":    "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400",
  "Livré":      "text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-300",
}

interface OrderDoc extends FirestoreOrder {
  id: string
}

interface DeploymentDoc extends Deployment {
  id: string
}

interface InventoryItemDoc extends FirestoreInventoryItem {
  id: string
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 animate-pulse">
      <div className="size-10 rounded-lg bg-slate-200 dark:bg-slate-700 mb-3" />
      <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded mb-1.5" />
      <div className="h-3.5 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
    </div>
  )
}

export default function ClientDashboard() {
  const { user } = useAuth()
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? ""

  const [orders, setOrders] = useState<OrderDoc[]>([])
  const [deployments, setDeployments] = useState<DeploymentDoc[]>([])
  const [catalogApps, setCatalogApps] = useState<CatalogProduct[]>([])
  const [products, setProducts] = useState<InventoryItemDoc[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [loadingDeps, setLoadingDeps] = useState(true)
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [orderingAppId, setOrderingAppId] = useState<string | null>(null)
  const [orderingProductId, setOrderingProductId] = useState<string | null>(null)
  const [storeSuccess, setStoreSuccess] = useState("")
  const [storeError, setStoreError] = useState("")

  useEffect(() => {
    if (!db || !user?.organizationId) {
      setLoadingOrders(false)
      return
    }

    const q = query(
      collection(db, COLLECTIONS.orders),
      where("organizationId", "==", user.organizationId),
      where("kind", "==", "client_request"),
      orderBy("createdAt", "desc"),
    )

    const unsub = onSnapshot(q, (snap) => {
      setOrders(
        snap.docs.map((d) => ({ ...(d.data() as FirestoreOrder), id: d.id })),
      )
      setLoadingOrders(false)
    })

    return () => unsub()
  }, [user?.organizationId])

  useEffect(() => {
    if (!db) {
      setLoadingCatalog(false)
      return
    }
    const unsub = onSnapshot(collection(db, COLLECTIONS.catalogProducts), (snap) => {
      const rows = snap.docs
        .map((d) => parseCatalogProductDoc(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => a.name.localeCompare(b.name, "fr"))
      setCatalogApps(rows)
      setLoadingCatalog(false)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!db) {
      setLoadingProducts(false)
      return
    }
    const q = query(collection(db, COLLECTIONS.inventoryItems), orderBy("name"))
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as FirestoreInventoryItem) }))
        .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "fr"))
      setProducts(rows)
      setLoadingProducts(false)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!db || !user?.organizationId) {
      setLoadingDeps(false)
      return
    }

    const q = query(
      collection(db, COLLECTIONS.deployments),
      where("organizationId", "==", user.organizationId),
    )

    const unsub = onSnapshot(q, (snap) => {
      setDeployments(
        snap.docs.map((d) => ({ ...(d.data() as Deployment), id: d.id })),
      )
      setLoadingDeps(false)
    })

    return () => unsub()
  }, [user?.organizationId])

  const loading = loadingOrders || loadingDeps

  const pending  = orders.filter((o) => o.status === "En attente").length
  const validated = orders.filter((o) => o.status === "Validée").length
  const activeApps = deployments.filter(
    (d) => d.health === "ok" || d.health === "degraded",
  ).length
  const alerts = deployments.filter((d) => d.health === "down" || d.health === "degraded").length

  const recentOrders = orders.slice(0, 5)
  const showOnboarding = !loading && orders.length === 0 && deployments.length === 0

  const stats = [
    {
      label: "Demandes en cours",
      value: String(pending),
      icon: "pending_actions",
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      to: "/client/requests",
    },
    {
      label: "Demandes validées",
      value: String(validated),
      icon: "task_alt",
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      to: "/client/requests",
    },
    {
      label: "Applications actives",
      value: String(activeApps),
      icon: "apps",
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      to: "/client/apps",
    },
    {
      label: "Alertes monitoring",
      value: String(alerts),
      icon: "warning",
      color: "text-rose-600",
      bg: "bg-rose-50 dark:bg-rose-900/20",
      to: "/client/monitoring",
    },
  ]

  const quickLinks = [
    { icon: "add_circle", label: "Nouvelle demande", to: "/client/requests/new", color: "text-[#db143c]" },
    { icon: "monitoring", label: "Monitoring",        to: "/client/monitoring",   color: "text-blue-600" },
    { icon: "support_agent", label: "Support",        to: "/client/support",      color: "text-amber-600" },
    { icon: "receipt_long", label: "Factures",        to: "/client/payments",     color: "text-emerald-600" },
  ]

  async function orderApp(app: CatalogProduct) {
    if (!db || !user?.organizationId) return
    setStoreError("")
    setStoreSuccess("")
    setOrderingAppId(app.id)
    try {
      await addDoc(collection(db, COLLECTIONS.orders), {
        organizationId: user.organizationId,
        kind: ORDER_KIND.clientRequest,
        status: "En attente",
        createdByUserId: user.id,
        requestType: `Commande app: ${app.name}`,
        description: `Commande depuis le tableau de bord client pour l'application "${app.name}" (${app.slug}).`,
        priority: "Normale",
        features: app.features.map((f) => f.title).filter(Boolean),
        budgetLabel: app.price || "Sur devis",
        timelineLabel: "À planifier",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as FirestoreOrder)
      setStoreSuccess(`Commande app envoyée: ${app.name}`)
    } catch (err) {
      setStoreError(err instanceof Error ? err.message : "Impossible de commander cette application.")
    } finally {
      setOrderingAppId(null)
    }
  }

  async function orderProduct(item: InventoryItemDoc) {
    if (!db || !user?.organizationId) return
    setStoreError("")
    setStoreSuccess("")
    setOrderingProductId(item.id)
    try {
      await addDoc(collection(db, COLLECTIONS.orders), {
        organizationId: user.organizationId,
        kind: ORDER_KIND.materialSupply,
        createdByUserId: user.id,
        status: "En attente",
        materialName: item.name,
        quantity: 1,
        supplier: "Client portal",
        notes: `Commande client depuis dashboard (${item.sku ?? item.id})`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as FirestoreOrder)
      setStoreSuccess(`Commande produit envoyée: ${item.name ?? "Produit"}`)
    } catch (err) {
      setStoreError(err instanceof Error ? err.message : "Impossible de commander ce produit.")
    } finally {
      setOrderingProductId(null)
    }
  }

  return (
    <DashboardLayout role="client" navItems={clientNav} pageTitle="Tableau de bord">
      <div className="p-6 space-y-6">
        {/* Welcome */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Bonjour{firstName ? `, ${firstName}` : ""} 👋
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Voici un résumé de votre activité en temps réel.
          </p>
        </div>

        {showOnboarding && (
          <OnboardingHint
            title="Premiers pas"
            description="Votre espace est prêt. Créez une première demande, puis suivez son déploiement et vos factures."
            actions={[
              { to: "/client/requests/new", label: "Créer une demande" },
              { to: "/client/support", label: "Contacter le support" },
              { to: "/client/profile", label: "Compléter le profil" },
            ]}
          />
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : stats.map((s) => (
                <Link
                  key={s.label}
                  to={s.to}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:shadow-md transition-shadow"
                >
                  <div
                    className={`size-10 rounded-lg ${s.bg} ${s.color} flex items-center justify-center mb-3`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
                </Link>
              ))}
        </div>

        {/* Recent requests */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-white">Demandes récentes</h3>
            <Link
              to="/client/requests"
              className="text-sm text-[#db143c] hover:opacity-80 font-medium"
            >
              Voir tout
            </Link>
          </div>

          {loadingOrders ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                  <div className="size-9 rounded-lg bg-slate-100 dark:bg-slate-800" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
                  </div>
                  <div className="h-6 w-20 bg-slate-100 dark:bg-slate-800 rounded-full" />
                </div>
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
              <span className="material-symbols-outlined text-[40px]">inbox</span>
              <p className="text-sm">Aucune demande pour le moment</p>
              <Link
                to="/client/requests/new"
                className="px-4 py-2 text-sm font-semibold bg-[#db143c] text-white rounded-lg hover:opacity-90"
              >
                Créer ma première demande
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentOrders.map((o) => (
                <Link
                  key={o.id}
                  to={`/client/requests/${o.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="size-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-slate-500 text-[18px]">
                      description
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {o.requestType ?? "Demande"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {o.id.slice(0, 8).toUpperCase()} · {formatFirestoreDate(o.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[o.status] ?? "text-slate-600 bg-slate-100"}`}
                  >
                    {o.status}
                  </span>
                  <span className="material-symbols-outlined text-[18px] text-slate-400 shrink-0">
                    chevron_right
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Accès rapides</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickLinks.map((q) => (
              <Link
                key={q.label}
                to={q.to}
                className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow"
              >
                <span className={`material-symbols-outlined text-[28px] ${q.color}`}>
                  {q.icon}
                </span>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 text-center">
                  {q.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Storefront */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">Catalogue: apps & produits</h3>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Commandez directement depuis votre espace
            </div>
          </div>

          {storeSuccess ? (
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2.5 text-sm text-emerald-700 dark:text-emerald-300">
              {storeSuccess}
            </div>
          ) : null}
          {storeError ? (
            <div className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 px-4 py-2.5 text-sm text-rose-700 dark:text-rose-300">
              {storeError}
            </div>
          ) : null}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <p className="font-semibold text-slate-900 dark:text-white text-sm">Applications</p>
                <span className="text-xs text-slate-500">{catalogApps.length}</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {loadingCatalog ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="px-4 py-3 animate-pulse">
                      <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                      <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
                    </div>
                  ))
                ) : catalogApps.length === 0 ? (
                  <div className="px-4 py-8 text-sm text-slate-400 text-center">
                    Aucune app disponible dans le catalogue.
                  </div>
                ) : (
                  catalogApps.slice(0, 6).map((app) => (
                    <div key={app.id} className="px-4 py-3 flex items-center gap-3">
                      <div className={`size-9 rounded-lg ${app.iconBg} ${app.iconColor} flex items-center justify-center shrink-0`}>
                        <span className="material-symbols-outlined text-[18px]">{app.icon}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{app.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{app.tagline}</p>
                      </div>
                      <Link
                        to={`/apps/${app.slug}`}
                        className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        Voir
                      </Link>
                      <button
                        onClick={() => void orderApp(app)}
                        disabled={orderingAppId === app.id}
                        className="px-2.5 py-1 text-xs font-semibold rounded-md bg-[#db143c] text-white hover:opacity-90 disabled:opacity-50"
                      >
                        {orderingAppId === app.id ? "..." : "Commander"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <p className="font-semibold text-slate-900 dark:text-white text-sm">Produits matériels</p>
                <span className="text-xs text-slate-500">{products.length}</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {loadingProducts ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="px-4 py-3 animate-pulse">
                      <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                      <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
                    </div>
                  ))
                ) : products.length === 0 ? (
                  <div className="px-4 py-8 text-sm text-slate-400 text-center">
                    Aucun produit matériel disponible.
                  </div>
                ) : (
                  products.slice(0, 6).map((item) => (
                    <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                      <div className="size-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px] text-slate-500">inventory_2</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.name ?? "Produit"}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {item.category ?? "Général"} · Stock {item.stock ?? 0}
                        </p>
                      </div>
                      <button
                        onClick={() => void orderProduct(item)}
                        disabled={orderingProductId === item.id}
                        className="px-2.5 py-1 text-xs font-semibold rounded-md bg-[#db143c] text-white hover:opacity-90 disabled:opacity-50"
                      >
                        {orderingProductId === item.id ? "..." : "Commander"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="bg-[#db143c] rounded-xl p-6 text-white flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-lg">Besoin d'une nouvelle application ?</p>
            <p className="text-white/80 text-sm mt-1">
              Soumettez une demande et notre équipe vous recontacte sous 24h.
            </p>
          </div>
          <Link
            to="/client/requests/new"
            className="shrink-0 px-5 py-2.5 bg-white text-[#db143c] font-bold rounded-lg hover:bg-red-50 transition-colors text-sm"
          >
            Nouvelle demande
          </Link>
        </div>
      </div>
    </DashboardLayout>
  )
}
