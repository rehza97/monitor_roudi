import PublicLayout from "@/components/layouts/PublicLayout"

const sections = [
  {
    title: "1. Collecte des données",
    content: "Nous collectons uniquement les données nécessaires au fonctionnement de nos services : informations d'identification (nom, email), données d'utilisation (logs, métriques), et données de facturation. Aucune donnée n'est collectée à votre insu.",
  },
  {
    title: "2. Utilisation des données",
    content: "Vos données sont utilisées exclusivement pour fournir et améliorer nos services, vous envoyer des communications liées à votre compte, et respecter nos obligations légales. Nous ne vendons jamais vos données à des tiers.",
  },
  {
    title: "3. Hébergement et transfert",
    content: "Toutes les données sont hébergées sur des serveurs situés en Algérie (Alger et Oran). Aucun transfert hors Algérie n'est effectué sans garanties appropriées conformément à la LPD.",
  },
  {
    title: "4. Durée de conservation",
    content: "Les données de compte sont conservées pendant toute la durée de votre abonnement et 3 ans après résiliation. Les logs techniques sont conservés 90 jours. Les données de facturation sont conservées 10 ans conformément à la loi.",
  },
  {
    title: "5. Vos droits",
    content: "Conformément à la LPD, vous disposez d'un droit d'accès, de rectification, de suppression, de portabilité et d'opposition au traitement de vos données. Pour exercer ces droits, contactez notre DPO à privacy@rodaina.fr.",
  },
  {
    title: "6. Sécurité",
    content: "Nous mettons en œuvre des mesures techniques et organisationnelles appropriées : chiffrement TLS en transit, AES-256 au repos, accès restreint par rôle, audits de sécurité réguliers et programme de bug bounty.",
  },
  {
    title: "7. Cookies",
    content: "Nous utilisons des cookies fonctionnels (nécessaires au service) et des cookies analytiques (avec votre consentement). Pour plus de détails, consultez notre Politique de cookies.",
  },
  {
    title: "8. Contact",
    content: "Pour toute question relative à la protection de vos données, contactez notre Délégué à la Protection des Données (DPO) : privacy@rodaina.fr — Rodaina SAS, 12 Rue Didouche Mourad, 16000 Alger.",
  },
]

export default function Privacy() {
  return (
    <PublicLayout>
      <section className="bg-white dark:bg-slate-900 py-16 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-4">Politique de confidentialité</h1>
          <p className="text-slate-500 dark:text-slate-400">Dernière mise à jour : 1er mars 2025</p>
        </div>
      </section>

      <section className="py-16 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 md:p-12 space-y-8">
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Chez Rodaina, la protection de vos données personnelles est une priorité. Cette politique décrit comment nous collectons, utilisons et protégeons vos informations conformément à la Loi sur la Protection des Données Personnelles (LPD 18-07).
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
