import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import PublicLayout from "@/components/layouts/PublicLayout"
import { db } from "@/config/firebase"
import { COLLECTIONS, type FirestoreInventoryItem } from "@/data/schema"
import { collection, getDocs } from "@/lib/firebase-firestore"
import { parseCatalogProductDoc, type CatalogProduct } from "@/lib/catalog-products"

type PublicMaterial = FirestoreInventoryItem & { id: string }

function parseMaterialDoc(id: string, data: FirestoreInventoryItem): PublicMaterial {
  return {
    id,
    sku: data.sku ?? "",
    name: data.name ?? "Matériel",
    category: data.category ?? "Général",
    stock: typeof data.stock === "number" ? data.stock : 0,
    threshold: typeof data.threshold === "number" ? data.threshold : 0,
    location: data.location ?? "",
    priceDisplay: data.priceDisplay ?? "Sur devis",
    imageUrl: data.imageUrl ?? "",
  }
}

export default function LandingPage() {
  const [apps, setApps] = useState<CatalogProduct[]>([])
  const [materials, setMaterials] = useState<PublicMaterial[]>([])
  const [appsLoading, setAppsLoading] = useState(true)
  const [materialsLoading, setMaterialsLoading] = useState(true)

  useEffect(() => {
    if (!db) {
      setAppsLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const snap = await getDocs(collection(db, COLLECTIONS.catalogProducts))
        if (cancelled) return
        const rows = snap.docs
          .map((d) => parseCatalogProductDoc(d.id, d.data() as Record<string, unknown>))
          .sort((a, b) => a.name.localeCompare(b.name, "fr"))
        setApps(rows)
      } catch {
        if (!cancelled) setApps([])
      } finally {
        if (!cancelled) setAppsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!db) {
      setMaterialsLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const snap = await getDocs(collection(db, COLLECTIONS.inventoryItems))
        if (cancelled) return
        const rows = snap.docs
          .map((d) => parseMaterialDoc(d.id, d.data() as FirestoreInventoryItem))
          .sort((a, b) => a.name.localeCompare(b.name, "fr"))
          .slice(0, 4)
        setMaterials(rows)
      } catch {
        if (!cancelled) setMaterials([])
      } finally {
        if (!cancelled) setMaterialsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const featuredApp = useMemo(() => apps[0] ?? null, [apps])

  return (
    <PublicLayout>
      <section className="relative pt-16 pb-20 lg:pt-24 lg:pb-28 bg-white overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-8">
          {featuredApp && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 mb-4">
              <span className="material-symbols-outlined text-[14px]">bolt</span>
              À la une: {featuredApp.name}
            </div>
          )}
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 mb-6 max-w-4xl mx-auto leading-tight">
            Tout votre <span className="text-blue-600">écosystème IT</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            La plateforme intelligente qui connecte vos besoins en logiciel, matériel et maintenance aux meilleurs experts du domaine.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#applications" className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2">
              Voir les applications
              <span className="material-symbols-outlined text-[20px]">arrow_downward</span>
            </a>
            <Link to="/about" className="w-full sm:w-auto px-8 py-3.5 bg-white text-slate-700 font-bold border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
              En savoir plus
            </Link>
          </div>
        </div>
      </section>

      <section id="applications" className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 xl:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="max-w-xl">
                  <h2 className="text-3xl font-bold text-slate-900 mb-4">Nos Applications</h2>
                  <p className="text-slate-500">
                    Explorez notre catalogue d'outils conçus pour les développeurs exigeants. De la surveillance serveur à l'analyse de données.
                  </p>
                </div>
                <Link to="/catalogue" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-600">
                  Voir tout
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>

              {appsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="h-72 rounded-2xl border border-slate-200 bg-white animate-pulse" />
                  ))}
                </div>
              ) : apps.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
                  <p className="text-slate-500">Aucune application publiée dans `catalog_products`.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {apps.slice(0, 4).map((app) => (
                    <Link
                      key={app.id}
                      to={`/apps/${app.slug}`}
                      className="group flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300"
                    >
                      <div className={`relative h-48 w-full overflow-hidden ${app.cardBg}`}>
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
                      <div className="flex flex-col flex-grow p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`size-10 rounded-lg flex items-center justify-center ${app.iconBg} ${app.iconColor}`}>
                            <span className="material-symbols-outlined">{app.icon}</span>
                          </div>
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{app.category}</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                          {app.name}
                        </h3>
                        <p className="text-sm text-slate-500 line-clamp-2 mb-6 flex-grow">{app.tagline}</p>
                        <div className="w-full mt-auto py-2.5 px-4 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 group-hover:border-blue-300 group-hover:text-blue-600 transition-all flex items-center justify-center gap-2">
                          Voir détails
                          <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="max-w-xl">
                  <h2 className="text-3xl font-bold text-slate-900 mb-4">Galerie Matériels</h2>
                  <p className="text-slate-500">
                    Parcourez les équipements disponibles pour vos déploiements, postes réseau et besoins terrain.
                  </p>
                </div>
                <Link to="/catalogue" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-cyan-300 hover:text-cyan-700">
                  Voir tout
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>

              {materialsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-6">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="h-56 rounded-2xl border border-slate-200 bg-white animate-pulse" />
                  ))}
                </div>
              ) : materials.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
                  <p className="text-slate-500">Aucun matériel publié dans `inventory_items`.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-6">
                  {materials.map((item) => (
                    <article key={item.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50">
                      <div className="grid grid-cols-[9rem_1fr] min-h-44">
                        <div className="relative overflow-hidden bg-slate-100">
                          <div
                            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                            style={{ backgroundImage: `url('${item.imageUrl || "https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=900&q=80"}')` }}
                          />
                        </div>
                        <div className="flex min-w-0 flex-col p-5">
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{item.category}</p>
                              <h3 className="mt-1 truncate text-lg font-bold text-slate-900">{item.name}</h3>
                            </div>
                            <div className="size-9 shrink-0 rounded-lg bg-rose-50 text-[#db143c] flex items-center justify-center">
                              <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                            </div>
                          </div>
                          <p className="line-clamp-1 text-xs text-slate-500 font-mono">{item.sku || item.id}</p>
                          <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
                            <div>
                              <p className="text-xs text-slate-400">Prix</p>
                              <p className="text-sm font-bold text-slate-900">{item.priceDisplay}</p>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.stock > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                              {item.stock > 0 ? "Disponible" : "Rupture"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Pourquoi choisir Technova ?</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Nous combinons performance, sécurité et simplicité pour vous offrir la meilleure expérience développeur possible.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { icon: "rocket_launch", title: "Performance Optimale", desc: "Nos outils sont conçus pour être légers et rapides, minimisant l'impact sur vos systèmes tout en maximisant la productivité." },
              { icon: "sync_lock", title: "Sécurité Intégrée", desc: "La sécurité n'est pas une option. Toutes nos applications intègrent les derniers standards de protection des données par défaut." },
              { icon: "support_agent", title: "Support 24/7", desc: "Une équipe dédiée est toujours disponible pour vous aider à intégrer nos solutions et résoudre vos problèmes techniques." },
            ].map((feature) => (
              <div key={feature.title} className="flex flex-col items-center text-center">
                <div className="size-16 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-600 mb-6">
                  <span className="material-symbols-outlined text-4xl">{feature.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-blue-600 rounded-3xl p-8 md:p-12 text-center text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
            <h2 className="text-3xl md:text-4xl font-bold mb-6 relative z-10">Prêt à accélérer vos projets ?</h2>
            <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto relative z-10">
              Rejoignez les équipes qui utilisent Technova pour construire leurs services métiers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
              <Link to="/register" className="px-8 py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition-colors">
                Commencer gratuitement
              </Link>
              <Link to="/contact" className="px-8 py-3 bg-blue-700 text-white font-bold rounded-lg border border-blue-400 hover:bg-blue-800 transition-colors">
                Contacter les ventes
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
