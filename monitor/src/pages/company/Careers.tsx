import PublicLayout from "@/components/layouts/PublicLayout"
import { Link } from "react-router-dom"

const jobs = [
  { title: "Senior Backend Engineer",     team: "Engineering", location: "Alger (hybride)",  type: "CDI",        badge: "Nouveau",  badgeColor: "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400" },
  { title: "Lead Frontend React",         team: "Engineering", location: "Alger / Remote",   type: "CDI",        badge: null,       badgeColor: "" },
  { title: "DevOps / SRE",                team: "Infra",       location: "Oran (full remote)",type: "CDI",       badge: "Urgent",   badgeColor: "text-rose-700 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400" },
  { title: "Product Designer",            team: "Design",      location: "Alger (hybride)",  type: "CDI",        badge: null,       badgeColor: "" },
  { title: "Customer Success Manager",    team: "Support",     location: "Alger",            type: "CDI",        badge: null,       badgeColor: "" },
  { title: "Stage — Développeur FullStack",team: "Engineering",location: "Alger",            type: "Stage 6 mois",badge: "Stage",   badgeColor: "text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400" },
]

const perks = [
  { icon: "computer",       title: "Full Remote possible",    desc: "Travaillez depuis chez vous ou nos bureaux algérois."   },
  { icon: "school",         title: "Budget formation 1 500 DA", desc: "Conférences, certifications, livres — à votre choix."   },
  { icon: "health_and_safety",title:"Mutuelle Alan 100%",     desc: "Couverture santé premium prise en charge intégralement."},
  { icon: "restaurant",     title: "Tickets resto Swile",     desc: "12 DA/jour de tickets-restaurant offerts."              },
  { icon: "directions_bike","title":"Forfait mobilité 50 DA/m", desc: "Vélo, trottinette ou transports en commun."           },
  { icon: "celebration",    title: "Team events trimestriels",desc: "Afterworks, off-sites et hackathons réguliers."         },
]

export default function Careers() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="bg-white dark:bg-slate-900 py-20 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-6 border border-blue-100 dark:border-blue-800">
            <span className="material-symbols-outlined text-[16px]">work</span>
            6 postes ouverts
          </span>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-6">
            Construisez <span className="text-blue-600">l'avenir du DevOps</span> avec nous
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            Chez Rodaina, chaque ingénieur peut contribuer directement au produit. Pas de bureaucratie, pas de silos — juste du code de qualité et de l'impact réel.
          </p>
        </div>
      </section>

      {/* Job listings */}
      <section className="py-16 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">Offres d'emploi</h2>
          <div className="space-y-4">
            {jobs.map(j => (
              <div key={j.title} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{j.title}</h3>
                      {j.badge && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${j.badgeColor}`}>{j.badge}</span>}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">group</span>{j.team}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">location_on</span>{j.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>{j.type}
                      </span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-blue-600 transition-colors shrink-0">arrow_forward</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Perks */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Pourquoi Rodaina ?</h2>
            <p className="text-slate-500 dark:text-slate-400">Ce qui nous distingue en tant qu'employeur.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {perks.map(p => (
              <div key={p.title} className="flex items-start gap-4 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="size-10 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-600 shrink-0">
                  <span className="material-symbols-outlined text-[22px]">{p.icon}</span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">{p.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Spontaneous */}
      <section className="py-16 bg-blue-50 dark:bg-blue-900/10 border-y border-blue-100 dark:border-blue-800/30">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Vous ne trouvez pas votre poste ?</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">Envoyez-nous une candidature spontanée — nous lisons chaque message.</p>
          <Link to="/contact" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors">
            <span className="material-symbols-outlined text-[18px]">send</span>
            Candidature spontanée
          </Link>
        </div>
      </section>
    </PublicLayout>
  )
}
