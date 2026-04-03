import PublicLayout from "@/components/layouts/PublicLayout"

const infos = [
  {
    title: "Éditeur du site",
    items: [
      { label: "Raison sociale",       value: "Rodaina SAS" },
      { label: "Forme juridique",      value: "Société par actions simplifiée" },
      { label: "Capital social",       value: "50 000 DA" },
      { label: "SIREN",                value: "123 456 789" },
      { label: "RCS",                  value: "RC Alger 23B1234" },
      { label: "N° Identification Fiscale (NIF)", value: "099812345678901" },
      { label: "Siège social",         value: "12 Rue Didouche Mourad, 16000 Alger, Algérie" },
      { label: "Directeur de publication", value: "Amina Rodaina (CEO)" },
    ],
  },
  {
    title: "Contact",
    items: [
      { label: "Email général",        value: "hello@rodaina.fr" },
      { label: "Support technique",    value: "support@rodaina.fr" },
      { label: "Téléphone",            value: "+213 21 23 45 67" },
    ],
  },
  {
    title: "Hébergement",
    items: [
      { label: "Hébergeur",            value: "OVHcloud SAS" },
      { label: "Siège social",         value: "Cité Bouchaoui, Cheraga, 16000 Alger, Algérie" },
      { label: "Site web",             value: "www.ovhcloud.com" },
    ],
  },
]

export default function LegalNotice() {
  return (
    <PublicLayout>
      <section className="bg-white dark:bg-slate-900 py-16 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-4">Mentions légales</h1>
          <p className="text-slate-500 dark:text-slate-400">Conformément à l'article 6 de la loi n°2004-575 du 21 juin 2004</p>
        </div>
      </section>

      <section className="py-16 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {infos.map(block => (
            <div key={block.title} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">{block.title}</h2>
              <dl className="space-y-3">
                {block.items.map(item => (
                  <div key={item.label} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <dt className="text-sm text-slate-500 dark:text-slate-400 sm:w-56 shrink-0">{item.label}</dt>
                    <dd className="text-sm font-medium text-slate-900 dark:text-white">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Propriété intellectuelle</h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              L'ensemble des contenus présents sur ce site (textes, images, graphiques, logos, icônes, sons, logiciels) est la propriété exclusive de Rodaina SAS ou de ses partenaires. Toute reproduction, représentation, modification, publication, transmission ou dénaturation, totale ou partielle, est interdite sans accord préalable écrit de Rodaina SAS.
            </p>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Les marques et logos de Rodaina sont des marques déposées. Toute utilisation sans autorisation écrite préalable est prohibée.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Limitation de responsabilité</h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Rodaina s'efforce d'assurer au mieux l'exactitude et la mise à jour des informations diffusées sur ce site. Cependant, Rodaina ne peut garantir l'exactitude, la précision ou l'exhaustivité des informations mises à disposition sur ce site et décline toute responsabilité pour toute imprécision, inexactitude ou omission portant sur des informations disponibles sur ce site.
            </p>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
