import { useEffect, useMemo, useState } from "react"
import { useParams, Link, Navigate } from "react-router-dom"
import PublicLayout from "@/components/layouts/PublicLayout"
import { db } from "@/config/firebase"
import { COLLECTIONS } from "@/data/schema"
import { collection, onSnapshot } from "@/lib/firebase-firestore"
import { parseCatalogProductDoc, type CatalogProduct } from "@/lib/catalog-products"

export default function AppDetailsPage() {
  const { slug } = useParams<{ slug: string }>()
  const [apps, setApps] = useState<CatalogProduct[]>([])
  const [loading, setLoading] = useState(true)

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
    return unsub
  }, [])

  const app = useMemo(() => {
    if (!slug) return null
    return apps.find((a) => a.slug === slug) ?? null
  }, [apps, slug])

  if (!slug) return <Navigate to="/" replace />
  if (!loading && !app) return <Navigate to="/" replace />

  return (
    <PublicLayout>
      <div className="min-h-screen bg-[#f8fafc] text-[#0f172a]">
        <main className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
          {loading || !app ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-6 w-60 rounded bg-slate-200" />
              <div className="h-72 rounded-2xl bg-slate-200" />
              <div className="h-40 rounded-2xl bg-slate-200" />
            </div>
          ) : (
            <>
              <nav aria-label="Breadcrumb" className="mb-6 flex">
                <ol className="flex items-center space-x-2">
                  <li>
                    <Link to="/" className="text-slate-500 hover:text-slate-700">
                      <span className="material-symbols-outlined text-[20px]">home</span>
                    </Link>
                  </li>
                  <li className="flex items-center">
                    <span className="material-symbols-outlined text-[16px] text-slate-400">chevron_right</span>
                    <Link to="/#applications" className="ml-2 text-sm font-medium text-slate-500 hover:text-slate-700">Applications</Link>
                  </li>
                  <li className="flex items-center">
                    <span className="material-symbols-outlined text-[16px] text-slate-400">chevron_right</span>
                    <span className="ml-2 text-sm font-medium text-slate-600">{app.name}</span>
                  </li>
                </ol>
              </nav>

              <div className="group relative mb-10 w-full overflow-hidden rounded-2xl bg-slate-900 shadow-xl">
                <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80)" }} />
                <div className="relative z-20 flex min-h-[300px] flex-col justify-end p-8 sm:p-12">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="mb-4 inline-flex items-center rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-200 ring-1 ring-inset ring-blue-500/30 backdrop-blur-sm">{app.version}</div>
                      <h1 className="mb-2 text-3xl font-black tracking-tight text-white sm:text-5xl">{app.name}</h1>
                      <p className="max-w-2xl text-lg text-slate-300">{app.tagline}</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-4 py-2 backdrop-blur-md">
                      <span className="material-symbols-outlined text-[18px] text-white/80">group</span>
                      <span className="text-sm font-medium text-white">{app.users}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-12">
                <div className="flex flex-col gap-10 lg:col-span-2">
                  <section>
                    <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-slate-900"><span className="material-symbols-outlined text-slate-600">info</span>À propos de cette application</h2>
                    <div className="space-y-4 text-slate-600">
                      {app.description.map((p, i) => <p key={i} className="leading-relaxed">{p}</p>)}
                    </div>
                  </section>

                  <section>
                    <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-slate-900"><span className="material-symbols-outlined text-slate-600">featured_play_list</span>Fonctionnalités clés</h2>
                    {app.features.length === 0 ? (
                      <p className="text-sm text-slate-500">Aucune fonctionnalité détaillée.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {app.features.map((f) => (
                          <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                            <div className="flex items-start gap-4">
                              <div className={`${f.iconBg} ${f.iconColor} rounded-lg p-2`}><span className="material-symbols-outlined">{f.icon}</span></div>
                              <div>
                                <h3 className="text-lg font-bold text-slate-900">{f.title}</h3>
                                <p className="mt-1 text-sm text-slate-500">{f.desc || "—"}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section>
                    <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-slate-900"><span className="material-symbols-outlined text-slate-600">photo_library</span>Aperçus</h2>
                    {app.gallery.length === 0 ? (
                      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Galerie non renseignée.</div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        {app.gallery.map((src) => (
                          <div key={src} className="relative h-32 cursor-pointer overflow-hidden rounded-lg bg-slate-100">
                            <img src={src} alt={app.name} className="h-full w-full object-cover transition-transform duration-500 hover:scale-110" />
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>

                <div className="lg:col-span-1">
                  <div className="sticky top-8 flex flex-col gap-6">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-500">Licence</span>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">{app.license}</span>
                      </div>
                      <h3 className="mb-2 text-3xl font-bold text-slate-900">{app.price}</h3>
                      <p className="mb-6 text-sm text-slate-500">Accès complet à toutes les fonctionnalités et support prioritaire.</p>
                      <Link to="/client/requests/new" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#64748b] px-4 py-3.5 font-bold text-white transition-all hover:bg-[#475569]">
                        <span>Demander cette application</span>
                        <span className="material-symbols-outlined text-[20px]">send</span>
                      </Link>
                      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400"><span className="material-symbols-outlined text-[14px]">check_circle</span><span>Déploiement assisté inclus</span></div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6">
                      <h3 className="mb-4 text-lg font-bold text-slate-900">Matériels Compatibles</h3>
                      {app.hardware.length === 0 ? (
                        <p className="text-sm text-slate-500">Aucun matériel listé.</p>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {app.hardware.map((h) => (
                            <div key={h.name} className="flex items-center rounded-lg bg-slate-50 p-3 transition-colors hover:bg-slate-100">
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm"><span className="material-symbols-outlined">{h.icon}</span></div>
                              <div className="ml-3">
                                <p className="text-sm font-semibold text-slate-900">{h.name}</p>
                                <p className="text-xs text-slate-500">{h.detail || "—"}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-4 border-t border-slate-100 pt-4"><span className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-800">Voir la liste complète <span className="material-symbols-outlined text-[16px]">arrow_forward</span></span></div>
                    </div>

                    <div className="p-6">
                      <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">Informations techniques</h4>
                      <div className="space-y-3">
                        {[
                          { label: "Dernière MàJ", value: app.updated },
                          { label: "Taille", value: app.size },
                          { label: "Développeur", value: "Rodaina Dev Team" },
                          { label: "Langues", value: "FR, EN" },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between text-sm"><span className="text-slate-500">{label}</span><span className="font-medium text-slate-900">{value}</span></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <footer className="mt-14 border-t border-slate-200 pt-8">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400">© 2026 Projet Rodaina. Tous droits réservés.</p>
                  <div className="flex space-x-6"><span className="text-slate-400">Documentation</span><span className="text-slate-400">Confidentialité</span></div>
                </div>
              </footer>
            </>
          )}
        </main>
      </div>
    </PublicLayout>
  )
}
