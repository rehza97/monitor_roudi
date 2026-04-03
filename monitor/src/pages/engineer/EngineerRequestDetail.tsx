import { useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { engineerNav } from "@/lib/nav"
import { useParams, Link } from "react-router-dom"

/* MOCK pièces jointes — désactivées */
const docs: string[] = []

export default function EngineerRequestDetail() {
  const { id } = useParams()
  const [downloading, setDownloading] = useState<string | null>(null)
  const [downloaded, setDownloaded]   = useState<Set<string>>(new Set())

  function handleDownload(doc: string) {
    setDownloading(doc)
    setTimeout(() => {
      setDownloading(null)
      setDownloaded(prev => new Set([...prev, doc]))
    }, 1000)
  }

  return (
    <DashboardLayout role="engineer" navItems={engineerNav} pageTitle="Détails de la demande">
      <div className="p-6 max-w-5xl space-y-6">
        <Link to="/engineer/requests" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Retour aux demandes
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Demande {id}</h2>
            <p className="text-slate-500 text-sm mt-1">Données mock désactivées.</p>
          </div>
          <span className="text-sm font-semibold px-3 py-1.5 rounded-full text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">Assignée</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Description</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">Aucune description chargée.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Stack technique recommandée</h3>
              <div className="flex flex-wrap gap-2">
                {["React", "Node.js", "PostgreSQL", "Redis", "Docker", "Nginx"].map(t => (
                  <span key={t} className="text-xs font-mono px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg">{t}</span>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Documents attachés</h3>
              {docs.map(doc => (
                <div key={doc} className="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <span className={`material-symbols-outlined text-[20px] ${downloaded.has(doc) ? "text-emerald-500" : "text-blue-600"}`}>
                    {downloaded.has(doc) ? "check_circle" : "description"}
                  </span>
                  <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">{doc}</span>
                  <button
                    onClick={() => handleDownload(doc)}
                    disabled={downloading === doc || downloaded.has(doc)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:cursor-not-allowed ${
                      downloaded.has(doc)
                        ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
                        : "text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50"
                    }`}
                  >
                    {downloading === doc ? "Téléchargement…" : downloaded.has(doc) ? "Téléchargé" : "Télécharger"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Détails</h3>
              {[
                { label: "Budget",   value: "15 000 DA" },
                { label: "Délai",    value: "3 mois"    },
                { label: "Priorité", value: "Haute"     },
              ].map(i => (
                <div key={i.label} className="flex justify-between text-sm">
                  <span className="text-slate-500">{i.label}</span>
                  <span className="font-medium text-slate-900 dark:text-white">{i.value}</span>
                </div>
              ))}
            </div>
            <Link
              to={`/engineer/projects/${id}/progress`}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">timeline</span>Voir la progression
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
