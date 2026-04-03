import DashboardLayout from "@/components/layouts/DashboardLayout"
import { technicianNav } from "@/lib/nav"
import { Link } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"

/* MOCK tickets — disabled */
const tickets: { id: string; site: string; type: string; priority: string; time: string }[] = []
const priorityColor: Record<string,string> = {
  "Urgente": "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400",
  "Haute":   "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
  "Normale": "text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-400",
}

/* MOCK KPI values — disabled */
const techKpis: {
  label: string
  value: string
  icon: string
  color: string
  bg: string
}[] = []

export default function TechnicianDashboard() {
  const { user } = useAuth()
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? ""

  return (
    <DashboardLayout role="technician" navItems={technicianNav} pageTitle="Tableau de bord">
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {firstName ? `Bonjour, ${firstName}` : "Bonjour"} 🔧
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {tickets.length > 0
              ? `${tickets.length} intervention${tickets.length > 1 ? "s" : ""} planifiée${tickets.length > 1 ? "s" : ""} aujourd'hui.`
              : "Aucune intervention mock — données à brancher."}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {techKpis.map(k => (
            <div key={k.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className={`size-10 rounded-lg ${k.bg} ${k.color} flex items-center justify-center mb-3`}>
                <span className="material-symbols-outlined text-[20px]">{k.icon}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{k.value}</p>
              <p className="text-sm text-slate-500 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Today's interventions */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-white">Interventions du jour</h3>
            <Link to="/technician/tickets" className="text-sm text-amber-600 hover:text-amber-700 font-medium">Voir tout</Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {tickets.map(t => (
              <div key={t.id} className="flex items-center gap-4 px-6 py-4">
                <div className="size-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">home_repair_service</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{t.site}</p>
                  <p className="text-xs text-slate-400">{t.id} · {t.type} · {t.time}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${priorityColor[t.priority]}`}>{t.priority}</span>
                <Link to={`/technician/tickets/${t.id}`} className="text-xs text-amber-600 font-medium hover:text-amber-700">Voir →</Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
