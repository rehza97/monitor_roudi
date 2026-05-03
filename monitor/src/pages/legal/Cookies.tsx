import PublicLayout from "@/components/layouts/PublicLayout"
import { useState } from "react"

const cookieTypes = [
  {
    name: "Cookies essentiels",
    icon: "lock",
    required: true,
    color: "text-emerald-600 bg-emerald-50",
    desc: "Ces cookies sont indispensables au fonctionnement du site et ne peuvent pas être désactivés. Ils permettent notamment la gestion de votre session d'authentification et de vos préférences de sécurité.",
    examples: [
      { name: "session_id",    purpose: "Maintien de la session utilisateur",    duration: "Session" },
      { name: "csrf_token",   purpose: "Protection contre les attaques CSRF",   duration: "Session" },
    ],
  },
  {
    name: "Cookies analytiques",
    icon: "bar_chart",
    required: false,
    color: "text-blue-600 bg-blue-50",
    desc: "Ces cookies nous aident à comprendre comment vous interagissez avec notre site en collectant des informations de manière anonyme. Ils nous permettent d'améliorer continuellement notre produit.",
    examples: [
      { name: "_ga",          purpose: "Analyse d'audience (Google Analytics)", duration: "2 ans"   },
      { name: "_gid",         purpose: "Distinction des utilisateurs",           duration: "24h"     },
      { name: "ph_*",         purpose: "Analyse comportementale (PostHog)",      duration: "1 an"    },
    ],
  },
  {
    name: "Cookies de performance",
    icon: "speed",
    required: false,
    color: "text-indigo-600 bg-indigo-50",
    desc: "Ces cookies permettent d'optimiser les performances de notre site en mémorisant vos préférences et en accélérant le chargement des pages lors de vos prochaines visites.",
    examples: [
      { name: "pref_lang",    purpose: "Mémorisation de la langue choisie",     duration: "1 an"    },
      { name: "pref_region",  purpose: "Mémorisation de la région",             duration: "1 an"    },
    ],
  },
]

export default function Cookies() {
  const [consent, setConsent] = useState<Record<string, boolean>>({ analytics: false, performance: false })

  return (
    <PublicLayout>
      <section className="bg-white py-16 border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-4">Politique de cookies</h1>
          <p className="text-slate-500">Dernière mise à jour : 1er mars 2025</p>
        </div>
      </section>

      <section className="py-16 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Qu'est-ce qu'un cookie ?</h2>
            <p className="text-slate-600 leading-relaxed">
              Un cookie est un petit fichier texte déposé sur votre appareil lors de la visite d'un site web. Il permet au site de mémoriser vos actions et préférences pendant une durée déterminée, afin que vous n'ayez pas à les reconfigurer à chaque visite.
            </p>
          </div>

          {cookieTypes.map((type, idx) => (
            <div key={type.name} className="bg-white rounded-2xl border border-slate-200 p-8">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${type.color}`}>
                    <span className="material-symbols-outlined text-[22px]">{type.icon}</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{type.name}</h2>
                    {type.required
                      ? <span className="text-xs text-emerald-600 font-medium">Toujours actifs</span>
                      : null
                    }
                  </div>
                </div>
                {!type.required && (
                  <button
                    onClick={() => setConsent(c => ({ ...c, [idx === 1 ? "analytics" : "performance"]: !c[idx === 1 ? "analytics" : "performance"] }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      consent[idx === 1 ? "analytics" : "performance"] ? "bg-blue-600" : "bg-slate-200"
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      consent[idx === 1 ? "analytics" : "performance"] ? "translate-x-6" : "translate-x-1"
                    }`} />
                  </button>
                )}
              </div>
              <p className="text-slate-600 leading-relaxed mb-5 text-sm">{type.desc}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nom</th>
                      <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Finalité</th>
                      <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Durée</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {type.examples.map(ex => (
                      <tr key={ex.name}>
                        <td className="py-2.5 font-mono text-xs text-blue-600">{ex.name}</td>
                        <td className="py-2.5 text-slate-600">{ex.purpose}</td>
                        <td className="py-2.5 text-slate-500 whitespace-nowrap">{ex.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-3">Gérer vos préférences</h2>
            <p className="text-slate-600 leading-relaxed mb-4 text-sm">
              Vous pouvez modifier vos préférences de cookies à tout moment via les interrupteurs ci-dessus. Vous pouvez également configurer votre navigateur pour refuser tous les cookies, mais cela pourrait affecter le bon fonctionnement du site.
            </p>
            <p className="text-slate-500 text-sm">
              Pour toute question, contactez-nous à <span className="text-blue-600">privacy@rodaina.fr</span>
            </p>
          </div>

        </div>
      </section>
    </PublicLayout>
  )
}
