import PublicLayout from "@/components/layouts/PublicLayout"
import { Link } from "react-router-dom"

const team = [
  { name: "Amina Benali",    role: "CEO & Fondatrice",      initials: "AR", color: "bg-blue-600"    },
  { name: "Marc Lefebvre",    role: "CTO",                   initials: "ML", color: "bg-indigo-600"  },
  { name: "Sara Nguyen",      role: "Lead Designer",         initials: "SN", color: "bg-emerald-600" },
  { name: "Karim Osman",      role: "Head of Engineering",   initials: "KO", color: "bg-amber-600"   },
  { name: "Alice Bernard",    role: "DevOps Lead",           initials: "AB", color: "bg-rose-600"    },
  { name: "Léa Rousseau",     role: "Head of Support",       initials: "LR", color: "bg-purple-600"  },
]

const values = [
  { icon: "rocket_launch",  title: "Innovation",    desc: "Nous construisons des outils qui anticipent les besoins de demain, pas seulement d'aujourd'hui." },
  { icon: "handshake",      title: "Transparence",  desc: "Open-source par défaut. Nos clients savent exactement ce qui tourne dans leur infrastructure." },
  { icon: "diversity_3",    title: "Impact",        desc: "Chaque ligne de code que nous écrivons doit améliorer concrètement la vie de nos utilisateurs." },
]

export default function About() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="bg-white py-20 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold mb-6 border border-blue-100">
            <span className="material-symbols-outlined text-[16px]">info</span>
            Notre histoire
          </span>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-6">
            Construire la plateforme que <span className="text-blue-600">nous voulions utiliser</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Technova est née en 2021 d'un constat simple : les développeurs méritent des outils de monitoring beaux, rapides et qui respectent leur vie privée.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-5">
              <h2 className="text-3xl font-bold text-slate-900">Notre parcours</h2>
              <p className="text-slate-600 leading-relaxed">
                Fondée à Alger en 2021 par Amina Benali, une ingénieure passionnée par les problèmes d'observabilité, la startup a levé 2,5M DA en seed round en 2023 pour accélérer son développement.
              </p>
              <p className="text-slate-600 leading-relaxed">
                Aujourd'hui, Technova compte 35 collaborateurs répartis entre Alger et Oran, et accompagne plus de 5 000 développeurs au quotidien dans 12 pays.
              </p>
              <div className="grid grid-cols-3 gap-4 pt-4">
                {[{ value: "5 000+", label: "Développeurs" }, { value: "12", label: "Pays" }, { value: "2021", label: "Fondée" }].map(s => (
                  <div key={s.label} className="text-center p-4 bg-white rounded-xl border border-slate-200">
                    <p className="text-2xl font-black text-blue-600">{s.value}</p>
                    <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white">
              <span className="material-symbols-outlined text-[48px] text-white/30 block mb-4">format_quote</span>
              <p className="text-lg font-medium leading-relaxed italic">
                "Nous croyons que l'observabilité ne devrait pas être réservée aux grandes entreprises. Chaque développeur mérite de comprendre ce qui se passe dans son infrastructure."
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="size-10 rounded-full bg-white/20 flex items-center justify-center font-bold">AR</div>
                <div>
                  <p className="font-semibold">Amina Benali</p>
                  <p className="text-blue-200 text-sm">CEO & Fondatrice</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Nos valeurs</h2>
            <p className="text-slate-500">Ce qui guide chacune de nos décisions produit et humaines.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map(v => (
              <div key={v.title} className="text-center p-6">
                <div className="size-16 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-600 mb-5 mx-auto">
                  <span className="material-symbols-outlined text-[36px]">{v.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{v.title}</h3>
                <p className="text-slate-500 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">L'équipe</h2>
            <p className="text-slate-500">35 passionnés qui construisent les outils de demain.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {team.map(m => (
              <div key={m.name} className="text-center">
                <div className={`size-16 rounded-2xl ${m.color} flex items-center justify-center text-white text-lg font-bold mx-auto mb-3`}>
                  {m.initials}
                </div>
                <p className="font-semibold text-slate-900 text-sm">{m.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{m.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-3xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Envie de rejoindre l'aventure ?</h2>
          <p className="text-blue-100 mb-8">Nous recrutons des talents passionnés dans toute l'Algérie.</p>
          <Link to="/careers" className="inline-flex items-center gap-2 px-8 py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition-colors">
            Voir nos offres
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </div>
      </section>
    </PublicLayout>
  )
}
