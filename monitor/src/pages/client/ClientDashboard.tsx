import DashboardLayout from "@/components/layouts/DashboardLayout"
import { clientNav } from "@/lib/nav"
import { Link } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"

/* MOCK stats — disabled */
const stats: {
  label: string
  value: string
  icon: string
  color: string
  bg: string
  to: string
}[] = []

/* MOCK activity — disabled */
const activity: {
  id: string
  title: string
  status: string
  date: string
  statusColor: string
}[] = []

export default function ClientDashboard() {
  const { user } = useAuth()
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? ""

  return (
    <DashboardLayout role="client" navItems={clientNav} pageTitle="Tableau de bord">
      <div className="p-6 space-y-6">
        {/* Welcome */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {firstName ? `Bonjour, ${firstName}` : "Bonjour"} 👋
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Voici un résumé de votre activité.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Link
              key={s.label}
              to={s.to}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:shadow-md transition-shadow"
            >
              <div className={`size-10 rounded-lg ${s.bg} ${s.color} flex items-center justify-center mb-3`}>
                <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
            </Link>
          ))}
        </div>

        {/* Recent activity */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-white">Activité récente</h3>
            <Link to="/client/requests" className="text-sm text-cyan-600 hover:text-cyan-700 font-medium">Voir tout</Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {activity.map((a) => (
              <Link
                key={a.id}
                to={`/client/requests/${a.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
              >
                <div className="size-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-slate-500 text-[18px]">description</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{a.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{a.id} · {a.date}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${a.statusColor}`}>{a.status}</span>
                <span className="material-symbols-outlined text-[18px] text-slate-400 shrink-0">chevron_right</span>
              </Link>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-cyan-600 rounded-xl p-6 text-white flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-lg">Besoin d'une nouvelle application ?</p>
            <p className="text-cyan-100 text-sm mt-1">Soumettez une demande et notre équipe vous recontacte sous 24h.</p>
          </div>
          <Link to="/client/requests/new" className="shrink-0 px-5 py-2.5 bg-white text-cyan-700 font-bold rounded-lg hover:bg-cyan-50 transition-colors text-sm">
            Nouvelle demande
          </Link>
        </div>
      </div>
    </DashboardLayout>
  )
}
