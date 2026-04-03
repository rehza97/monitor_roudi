import DashboardLayout from "@/components/layouts/DashboardLayout"
import { clientNav } from "@/lib/nav"
import { useParams, Link } from "react-router-dom"

/* MOCK étapes — désactivées */
const steps: { label: string; done: boolean; date: string }[] = []

export default function ClientRequestDetail() {
  const { id } = useParams()
  return (
    <DashboardLayout role="client" navItems={clientNav} pageTitle="Détails de la demande">
      <div className="p-6 space-y-6 max-w-5xl">
        <Link to="/client/requests" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Retour aux demandes
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Demande {id}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Données mock désactivées.</p>
          </div>
          <span className="text-sm font-semibold px-3 py-1.5 rounded-full text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">En cours</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Description</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Aucune description chargée. {/* MOCK: ancienne description e-commerce retirée */}
              </p>
            </div>

            {/* Progress */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Progression</h3>
              <div className="space-y-3">
                {steps.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`size-6 rounded-full flex items-center justify-center shrink-0 ${s.done ? "bg-cyan-600" : "bg-slate-200 dark:bg-slate-700"}`}>
                      {s.done
                        ? <span className="material-symbols-outlined text-white text-[14px]">check</span>
                        : <span className="size-2 rounded-full bg-slate-400 dark:bg-slate-500" />
                      }
                    </div>
                    <span className={`flex-1 text-sm ${s.done ? "text-slate-900 dark:text-white font-medium" : "text-slate-400 dark:text-slate-500"}`}>{s.label}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">{s.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar info */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Informations</h3>
              {[
                { label: "Budget", value: "15 000 DA" },
                { label: "Délai", value: "3 mois" },
                { label: "Type", value: "Application web" },
                { label: "Priorité", value: "Haute" },
              ].map((i) => (
                <div key={i.label} className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">{i.label}</span>
                  <span className="font-medium text-slate-900 dark:text-white">{i.value}</span>
                </div>
              ))}
            </div>
            <Link to="/client/messages" className="flex items-center gap-2 w-full px-4 py-2.5 bg-cyan-600 text-white text-sm font-semibold rounded-lg hover:bg-cyan-700 transition-colors justify-center">
              <span className="material-symbols-outlined text-[18px]">chat</span>
              Contacter l'équipe
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
