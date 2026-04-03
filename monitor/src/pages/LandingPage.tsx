import { Link } from "react-router-dom"
import PublicLayout from "@/components/layouts/PublicLayout"

type LandingAppCard = {
  slug: string
  name: string
  category: string
  description: string
  icon: string
  iconBg: string
  iconColor: string
  cardBg: string
  badge: { label: string; className: string } | null
  image: string
}

/* MOCK: landing product cards (images + copy) — disabled
const apps: LandingAppCard[] = [ ... ]
*/
const apps: LandingAppCard[] = []

export default function LandingPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative pt-16 pb-20 lg:pt-24 lg:pb-28 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white dark:to-slate-900" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-8">
          {/* MOCK: hero promo pill — was product-specific copy
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full ...">
            <span>Nouveauté : EcoTrack Pro v2.0 disponible</span>
          </div>
          */}
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white mb-6 max-w-4xl mx-auto leading-tight">
            Découvrez nos <span className="text-blue-600">solutions logicielles</span> intelligentes
          </h1>
          <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Une suite complète d'outils pour surveiller, gérer et optimiser vos projets de développement avec efficacité et simplicité.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#applications" className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2">
              Voir les applications
              <span className="material-symbols-outlined text-[20px]">arrow_downward</span>
            </a>
            <Link to="/about" className="w-full sm:w-auto px-8 py-3.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
              En savoir plus
            </Link>
          </div>
        </div>
      </section>

      {/* App Grid */}
      <section id="applications" className="py-20 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="max-w-xl">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Nos Applications</h2>
              <p className="text-slate-500 dark:text-slate-400">
                Explorez notre catalogue d'outils conçus pour les développeurs exigeants. De la surveillance serveur à l'analyse de données.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {apps.map((app) => (
              <Link
                key={app.slug}
                to={`/apps/${app.slug}`}
                className="group flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-black/30 hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`relative h-48 w-full overflow-hidden ${app.cardBg}`}>
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url('${app.image}')` }}
                  />
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
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 transition-colors">
                    {app.name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-6 flex-grow">{app.description}</p>
                  <div className="w-full mt-auto py-2.5 px-4 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:border-blue-300 group-hover:text-blue-600 transition-all flex items-center justify-center gap-2">
                    Voir détails
                    <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Pourquoi choisir Rodaina ?</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
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
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{feature.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-blue-600 rounded-3xl p-8 md:p-12 text-center text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
            <h2 className="text-3xl md:text-4xl font-bold mb-6 relative z-10">Prêt à accélérer vos projets ?</h2>
            <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto relative z-10">
              Rejoignez plus de 5000 développeurs qui utilisent Rodaina pour construire le futur du web.
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
