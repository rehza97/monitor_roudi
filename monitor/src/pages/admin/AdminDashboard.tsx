import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import { Link } from "react-router-dom"

/* MOCK KPIs — disabled */
const kpis: {
  label: string
  value: string
  icon: string
  color: string
  bg: string
  trend: string
}[] = []

/* MOCK rows — disabled */
const recentRequests: {
  id: string
  client: string
  type: string
  status: string
  date: string
}[] = []
const statusColor: Record<string, string> = {
  "En attente": "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
  "Validée":    "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400",
  "En cours":   "text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400",
}

export default function AdminDashboard() {
  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Tableau de bord">
      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <div key={k.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`size-10 rounded-lg ${k.bg} ${k.color} flex items-center justify-center`}>
                  <span className="material-symbols-outlined text-[20px]">{k.icon}</span>
                </div>
                <span className={`text-xs font-semibold ${k.trend.startsWith("+") ? "text-emerald-600" : "text-rose-600"}`}>{k.trend}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{k.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent requests */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-white">Demandes récentes</h3>
              <Link to="/admin/requests" className="text-sm text-[#db143c] hover:opacity-80 font-medium">Voir tout</Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentRequests.map((r) => (
                <div key={r.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{r.client}</p>
                    <p className="text-xs text-slate-400">{r.id} · {r.type} · {r.date}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[r.status]}`}>{r.status}</span>
                  <Link to={`/admin/requests/${r.id}`} className="text-xs text-[#db143c] font-medium hover:opacity-80">Voir →</Link>
                </div>
              ))}
            </div>
          </div>

          {/* Server status */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">État des serveurs</h3>
            <div className="space-y-3">
              {[
                { name: "Serveur Web",  status: "online",  load: "24%" },
                { name: "Base données", status: "online",  load: "41%" },
                { name: "Cache Redis",  status: "online",  load: "12%" },
                { name: "Worker Q.",    status: "warning", load: "78%" },
              ].map((s) => (
                <div key={s.name} className="flex items-center gap-3">
                  <span className={`size-2 rounded-full shrink-0 ${s.status === "online" ? "bg-emerald-500" : "bg-amber-500"} animate-pulse`} />
                  <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{s.name}</span>
                  <span className="text-xs font-mono text-slate-500">{s.load}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
