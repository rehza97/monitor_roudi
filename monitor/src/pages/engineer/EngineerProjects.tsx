import DashboardLayout from "@/components/layouts/DashboardLayout"
import { engineerNav } from "@/lib/nav"
import { Link } from "react-router-dom"

/* MOCK projects — disabled */
const projects: {
  id: string
  name: string
  client: string
  status: string
  progress: number
  deadline: string
  priority: string
  priorityColor: string
}[] = []

const statusColors: Record<string, string> = {
  "En cours":    "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
  "En révision": "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
  "Planifié":    "text-slate-600 bg-slate-100 dark:bg-slate-800",
  "Terminé":     "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
}

export default function EngineerProjects() {
  return (
    <DashboardLayout role="engineer" navItems={engineerNav} pageTitle="Mes Projets">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Mes Projets</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{projects.length} projets assignés</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(
            [
              { label: "En cours", value: projects.filter(p => p.status === "En cours").length, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
              { label: "En révision", value: projects.filter(p => p.status === "En révision").length, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
              { label: "Planifiés", value: projects.filter(p => p.status === "Planifié").length, color: "text-slate-600", bg: "bg-slate-100 dark:bg-slate-800" },
              { label: "Terminés", value: projects.filter(p => p.status === "Terminé").length, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
            ] as const
          ).map(s => (
            <div key={s.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <p className={`text-2xl font-black ${s.color}`}>{String(s.value)}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  {["Projet", "Client", "Statut", "Priorité", "Progression", "Échéance", ""].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {projects.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900 dark:text-white">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.id}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-400">{p.client}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[p.status]}`}>{p.status}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.priorityColor}`}>{p.priority}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden" style={{ minWidth: 80 }}>
                          <div
                            className="h-full rounded-full bg-blue-600"
                            style={{ width: `${p.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 w-8 text-right">{p.progress}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{p.deadline}</td>
                    <td className="px-5 py-4">
                      <Link
                        to={`/engineer/projects/${p.id}/progress`}
                        className="text-blue-600 hover:text-blue-700 font-medium text-xs flex items-center gap-1"
                      >
                        Voir <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
