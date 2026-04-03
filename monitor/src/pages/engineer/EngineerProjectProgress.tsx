import DashboardLayout from "@/components/layouts/DashboardLayout"
import { engineerNav } from "@/lib/nav"
import { useParams, Link } from "react-router-dom"

/* MOCK milestones — disabled */
const milestones: { label: string; pct: number; done: boolean; date: string }[] = []
/* MOCK activity — disabled */
const activities: { icon: string; color: string; text: string; time: string }[] = []

export default function EngineerProjectProgress() {
  const { id } = useParams()
  return (
    <DashboardLayout role="engineer" navItems={engineerNav} pageTitle="Suivi du Projet">
      <div className="p-6 max-w-5xl space-y-6">
        <Link to="/engineer/projects" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Retour aux projets
        </Link>

        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Projet {id}</h2>
            <p className="text-slate-500 text-sm mt-1">Données mock désactivées — brancher Firestore ou l&apos;API.</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          {([] as { label: string; value: string }[]).map(k => (
            <div key={k.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{k.value}</p>
              <p className="text-sm text-slate-500 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Global progress */}
        {/* MOCK: progression globale 53% — désactivée */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-slate-900 dark:text-white">Progression globale</h3>
            <span className="text-blue-600 font-bold text-lg">—</span>
          </div>
          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full w-0" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Milestones */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">Jalons</h3>
            {milestones.map((m) => (
              <div key={m.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className={`font-medium ${m.pct === 100 ? "text-emerald-600" : "text-slate-700 dark:text-slate-300"}`}>{m.label}</span>
                  <span className="text-slate-400 text-xs">{m.date}</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${m.pct === 100 ? "bg-emerald-500" : "bg-blue-600"}`} style={{ width: `${m.pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Activity */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Activité récente</h3>
            <div className="space-y-4">
              {activities.map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center ${a.color} shrink-0`}>
                    <span className="material-symbols-outlined text-[16px]">{a.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-300">{a.text}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
