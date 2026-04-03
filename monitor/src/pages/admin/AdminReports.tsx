import { useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"

const periods = ["7 jours", "30 jours", "3 mois", "Année"] as const
type Period = typeof periods[number]

/* MOCK rapports — désactivé (KPI, barres, répartition) */
const kpisByPeriod: Record<Period, { label: string; value: string; trend: string; trendUp: boolean }[]> = {
  "7 jours": [],
  "30 jours": [],
  "3 mois": [],
  "Année": [],
}

const revenueBarsByPeriod: Record<Period, { label: string; value: number }[]> = {
  "7 jours": [],
  "30 jours": [],
  "3 mois": [],
  "Année": [],
}

const typeDistribution: { label: string; pct: number; color: string }[] = []

export default function AdminReports() {
  const [period, setPeriod] = useState<Period>("30 jours")
  const [exporting, setExporting] = useState(false)

  function handleExport() {
    setExporting(true)
    setTimeout(() => setExporting(false), 1500)
  }

  const kpis = kpisByPeriod[period]
  const bars = revenueBarsByPeriod[period]
  const maxBar = bars.length > 0 ? Math.max(...bars.map(b => b.value)) : 0

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Rapports & Statistiques">
      <div className="p-6 space-y-6">
        {/* Controls */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 dark:text-slate-400">Période :</span>
            {periods.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  period === p
                    ? "bg-[#db143c] text-white"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">{exporting ? "hourglass_empty" : "download"}</span>
            {exporting ? "Export…" : "Exporter"}
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(k => (
            <div key={k.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{k.value}</p>
              <p className="text-sm text-slate-500 mt-0.5">{k.label}</p>
              <p className={`text-xs font-semibold mt-2 ${k.trendUp ? "text-emerald-600" : "text-rose-600"}`}>
                {k.trendUp ? "↑" : "↓"} {k.trend} ce mois
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue bar chart */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Évolution des revenus</h3>
            <div className="flex items-end gap-2 h-40">
              {bars.map(b => (
                <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full relative flex items-end" style={{ height: "120px" }}>
                    <div
                      className="w-full bg-[#db143c] rounded-t-sm transition-all duration-500"
                      style={{ height: `${maxBar > 0 ? (b.value / maxBar) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">{b.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Type distribution */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Répartition par type de demande</h3>
            <div className="space-y-3">
              {typeDistribution.map(t => (
                <div key={t.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-slate-300">{t.label}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{t.pct}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${t.color} transition-all duration-500`} style={{ width: `${t.pct}%` }} />
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
