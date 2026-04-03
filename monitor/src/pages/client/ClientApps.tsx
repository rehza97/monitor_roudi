import DashboardLayout from "@/components/layouts/DashboardLayout"
import { clientNav } from "@/lib/nav"
import { Link } from "react-router-dom"
import { clientAppsSummary } from "@/data/seed"

const apps = clientAppsSummary

const statusColor: Record<string, string> = {
  "Actif":   "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Inactif": "text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-400",
  "Beta":    "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
}

export default function ClientApps() {
  return (
    <DashboardLayout role="client" navItems={clientNav} pageTitle="Mes Applications">
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-slate-500 dark:text-slate-400 text-sm">{apps.length} applications</p>
          <Link to="/client/requests/new" className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white text-sm font-semibold rounded-lg hover:bg-cyan-700 transition-colors">
            <span className="material-symbols-outlined text-[18px]">add</span>Demander une app
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {apps.map((app) => (
            <div key={app.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className={`size-12 rounded-xl flex items-center justify-center ${app.iconBg} ${app.iconColor} shrink-0`}>
                  <span className="material-symbols-outlined text-[24px]">{app.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">{app.name}</h3>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusColor[app.status]}`}>{app.status}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{app.category} · {app.version}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className={`size-1.5 rounded-full ${app.status === "Actif" ? "bg-emerald-500" : "bg-slate-400"}`} />
                  Uptime : <span className="font-medium text-slate-700 dark:text-slate-300">{app.uptime}</span>
                </div>
                <Link to={`/apps/${app.slug}`} className="text-xs font-medium text-cyan-600 hover:text-cyan-700">Voir détails →</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
