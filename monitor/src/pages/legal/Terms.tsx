import PublicLayout from "@/components/layouts/PublicLayout"

const sections = [
  {
    title: "1. Objet",
    content: "Les présentes conditions générales d'utilisation (CGU) régissent l'accès et l'utilisation des services proposés par Rodaina SAS, société par actions simplifiée au capital de 50 000 DA, immatriculée au CNAS d'Alger sous le numéro 123 456 789.",
  },
  {
    title: "2. Acceptation des conditions",
    content: "En accédant à nos services, vous acceptez sans réserve les présentes CGU. Si vous n'acceptez pas ces conditions, vous devez cesser d'utiliser nos services immédiatement.",
  },
  {
    title: "3. Description des services",
    content: "Rodaina propose une plateforme de monitoring et d'observabilité pour applications et infrastructures. Les services incluent la collecte de métriques, la visualisation, les alertes temps-réel et les rapports automatisés.",
  },
  {
    title: "4. Compte utilisateur",
    content: "Vous êtes responsable de la confidentialité de vos identifiants de connexion. Toute activité effectuée depuis votre compte est sous votre responsabilité. Signalons immédiatement toute utilisation non autorisée à support@rodaina.fr.",
  },
  {
    title: "5. Abonnements et paiements",
    content: "Les abonnements sont facturés mensuellement ou annuellement selon l'option choisie. Les tarifs sont indiqués HT. En cas de retard de paiement, les services peuvent être suspendus après mise en demeure restée sans effet.",
  },
  {
    title: "6. Propriété intellectuelle",
    content: "L'ensemble des éléments de la plateforme (logiciel, design, marques, contenus) est la propriété exclusive de Rodaina SAS. Toute reproduction, modification ou distribution sans autorisation écrite est strictement interdite.",
  },
  {
    title: "7. Limitation de responsabilité",
    content: "Rodaina s'engage à maintenir une disponibilité de service de 99,9% (SLA). En cas d'interruption, la responsabilité de Rodaina est limitée au remboursement prorata du temps d'indisponibilité constaté.",
  },
  {
    title: "8. Résiliation",
    content: "Vous pouvez résilier votre abonnement à tout moment depuis votre espace client. La résiliation prend effet à la fin de la période de facturation en cours. Rodaina se réserve le droit de suspendre ou résilier un compte en cas de violation des présentes CGU.",
  },
  {
    title: "9. Droit applicable",
    content: "Les présentes CGU sont soumises au droit algérien. En cas de litige, les parties s'engagent à rechercher une solution amiable avant tout recours judiciaire. À défaut, le Tribunal Commercial d'Alger sera seul compétent.",
  },
]

export default function Terms() {
  return (
    <PublicLayout>
      <section className="bg-white dark:bg-slate-900 py-16 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-4">Conditions d'utilisation</h1>
          <p className="text-slate-500 dark:text-slate-400">Dernière mise à jour : 1er mars 2025</p>
        </div>
      </section>

      <section className="py-16 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 md:p-12 space-y-8">
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Bienvenue sur Rodaina. Veuillez lire attentivement les présentes conditions d'utilisation avant d'accéder à nos services. Ces conditions constituent un contrat juridiquement contraignant entre vous et Rodaina SAS.
            </p>
            {sections.map(s => (
              <div key={s.title}>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">{s.title}</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{s.content}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
