import { useParams, Link, Navigate } from "react-router-dom"
import PublicLayout from "@/components/layouts/PublicLayout"
import { appsData, appsList } from "@/data/seed"

export default function AppDetailsPage() {
  const { slug } = useParams<{ slug: string }>()
  const app = slug ? appsData[slug] : null

  if (!app) return <Navigate to="/" replace />

  return (
    <PublicLayout>
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm mb-6">
            <Link to="/" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              <span className="material-symbols-outlined text-[20px]">home</span>
            </Link>
            <span className="material-symbols-outlined text-slate-300 text-[16px]">chevron_right</span>
            <Link to="/#applications" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors">Applications</Link>
            <span className="material-symbols-outlined text-slate-300 text-[16px]">chevron_right</span>
            <span className="text-blue-600 dark:text-blue-400 font-medium">{app.name}</span>
          </nav>

          {/* Hero */}
          <div className={`relative w-full rounded-2xl overflow-hidden bg-gradient-to-br ${app.heroBg} mb-10 shadow-xl`}>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px]" />
            <div className="relative p-8 sm:p-12 min-h-[280px] flex flex-col justify-end">
              <div className="flex items-start justify-between flex-wrap gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`size-12 rounded-xl ${app.iconBg} ${app.iconColor} flex items-center justify-center`}>
                      <span className="material-symbols-outlined text-[28px]">{app.icon}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${app.categoryColor}`}>{app.category}</span>
                      <span className="text-xs font-medium text-white/60 bg-white/10 px-2.5 py-1 rounded-full">{app.version}</span>
                    </div>
                  </div>
                  <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-3">{app.name}</h1>
                  <p className="text-slate-300 text-lg max-w-2xl">{app.tagline}</p>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 shrink-0">
                  <span className="material-symbols-outlined text-white/70 text-[18px]">group</span>
                  <span className="text-white text-sm font-medium">{app.users}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-10">

              {/* About */}
              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-[24px]">info</span>
                  À propos de cette application
                </h2>
                <div className="space-y-4">
                  {app.description.map((p, i) => (
                    <p key={i} className="text-slate-600 dark:text-slate-400 leading-relaxed">{p}</p>
                  ))}
                </div>
              </section>

              {/* Features */}
              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-[24px]">featured_play_list</span>
                  Fonctionnalités clés
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {app.features.map((f) => (
                    <div key={f.title} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-4">
                        <div className={`${f.iconBg} ${f.iconColor} p-2.5 rounded-lg shrink-0`}>
                          <span className="material-symbols-outlined text-[22px]">{f.icon}</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white mb-1">{f.title}</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Gallery placeholder */}
              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-[24px]">photo_library</span>
                  Aperçus
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {["Dashboard", "Rapports", "Configuration"].map((label) => (
                    <div key={label} className="rounded-xl overflow-hidden h-36 bg-slate-200 dark:bg-slate-800 flex items-center justify-center group cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                      <div className="text-center">
                        <span className="material-symbols-outlined text-slate-400 text-[32px] block mb-1">image</span>
                        <p className="text-xs text-slate-500">{label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* CTA card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-800 sticky top-24">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Licence</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {app.license}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{app.price}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">Accès complet + support dédié</p>
                <Link
                  to="/client/requests/new"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 transition-all shadow-md hover:shadow-lg"
                >
                  Demander cette application
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </Link>
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  Déploiement assisté inclus
                </div>
              </div>

              {/* Compatible hardware */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white mb-4">Matériels Compatibles</h3>
                <div className="space-y-3">
                  {app.hardware.map((h) => (
                    <div key={h.name} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                      <div className="size-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm text-slate-600 dark:text-slate-300 shrink-0">
                        <span className="material-symbols-outlined text-[20px]">{h.icon}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{h.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{h.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tech info */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Informations techniques</h4>
                <div className="space-y-3">
                  {[
                    { label: "Uptime",       value: app.uptime   },
                    { label: "Dernière MàJ", value: app.updated  },
                    { label: "Taille",       value: app.size     },
                    { label: "Développeur",  value: "Rodaina Dev Team" },
                    { label: "Langues",      value: "AR, FR"     },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">{label}</span>
                      <span className="font-medium text-slate-900 dark:text-white">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Other apps */}
          <div className="mt-16 pt-10 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Autres applications</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {appsList.filter(a => a.slug !== slug).map((a) => (
                <Link key={a.slug} to={`/apps/${a.slug}`} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <div className={`size-10 rounded-lg ${a.iconBg} ${a.iconColor} flex items-center justify-center shrink-0`}>
                    <span className="material-symbols-outlined text-[20px]">{a.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">{a.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{a.category}</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-400 text-[18px] ml-auto shrink-0">arrow_forward</span>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </PublicLayout>
  )
}
