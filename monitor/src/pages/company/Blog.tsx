import PublicLayout from "@/components/layouts/PublicLayout"

const posts = [
  {
    category: "Produit",    categoryColor: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    title:    "Lancement d'EcoTrack Pro v2.0 — Ce qui change",
    excerpt:  "Nouvelle interface, support CSRD automatisé et connecteurs IoT renforcés. Découvrez toutes les nouveautés de cette mise à jour majeure.",
    author:   "Amina Rodaina", authorInitials: "AR", authorColor: "bg-blue-600",
    date:     "15 Mar 2025",  readTime: "5 min",
    featured: true,
  },
  {
    category: "Engineering", categoryColor: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20",
    title:    "Comment nous avons réduit la latence de DevMonitor X de 40%",
    excerpt:  "Retour d'expérience sur notre migration vers ClickHouse pour le stockage des séries temporelles et l'optimisation de notre pipeline d'ingestion.",
    author:   "Marc Lefebvre", authorInitials: "ML", authorColor: "bg-indigo-600",
    date:     "08 Mar 2025",  readTime: "8 min",
    featured: false,
  },
  {
    category: "DevOps",     categoryColor: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
    title:    "Guide : Monitorer Kubernetes avec Rodaina en 15 minutes",
    excerpt:  "Installation de l'agent, configuration des alertes et création de votre premier tableau de bord K8s — tutoriel pas-à-pas.",
    author:   "Alice Bernard", authorInitials: "AB", authorColor: "bg-emerald-600",
    date:     "01 Mar 2025",  readTime: "12 min",
    featured: false,
  },
  {
    category: "Sécurité",   categoryColor: "text-rose-600 bg-rose-50 dark:bg-rose-900/20",
    title:    "SecureGate Beta : retours de nos 120 premiers testeurs",
    excerpt:  "Un mois après le lancement de la beta, voici les enseignements tirés, les bugs corrigés et la roadmap pour la v1.0.",
    author:   "Karim Osman", authorInitials: "KO", authorColor: "bg-rose-600",
    date:     "22 Fév 2025", readTime: "6 min",
    featured: false,
  },
  {
    category: "Culture",    categoryColor: "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
    title:    "Remote-first : comment nous travaillons chez Rodaina",
    excerpt:  "Outils, rituels et pratiques qui nous permettent de collaborer efficacement avec une équipe répartie entre Alger, Oran et le reste du monde.",
    author:   "Léa Rousseau", authorInitials: "LR", authorColor: "bg-amber-600",
    date:     "14 Fév 2025", readTime: "4 min",
    featured: false,
  },
]

export default function Blog() {
  const [featured, ...rest] = posts
  return (
    <PublicLayout>
      {/* Header */}
      <section className="bg-white dark:bg-slate-900 py-16 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-4">Blog Rodaina</h1>
          <p className="text-lg text-slate-500 dark:text-slate-400">Actualités produit, engineering et culture de l'équipe.</p>
        </div>
      </section>

      <section className="py-16 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Featured post */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
            <div className="h-56 bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-white/20 text-[80px]">article</span>
            </div>
            <div className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${featured.categoryColor}`}>{featured.category}</span>
                <span className="text-xs text-slate-400">{featured.date} · {featured.readTime} de lecture</span>
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">À la une</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-blue-600 transition-colors">{featured.title}</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-5">{featured.excerpt}</p>
              <div className="flex items-center gap-3">
                <div className={`size-8 rounded-full ${featured.authorColor} flex items-center justify-center text-white text-xs font-bold`}>{featured.authorInitials}</div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{featured.author}</span>
              </div>
            </div>
          </div>

          {/* Post grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rest.map(post => (
              <div key={post.title} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${post.categoryColor}`}>{post.category}</span>
                  <span className="text-xs text-slate-400">{post.readTime}</span>
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 transition-colors leading-snug">{post.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4 line-clamp-2">{post.excerpt}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`size-7 rounded-full ${post.authorColor} flex items-center justify-center text-white text-xs font-bold`}>{post.authorInitials}</div>
                    <span className="text-xs text-slate-500">{post.author}</span>
                  </div>
                  <span className="text-xs text-slate-400">{post.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
