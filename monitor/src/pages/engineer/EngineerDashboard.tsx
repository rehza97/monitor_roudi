import { useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { engineerNav } from "@/lib/nav"
import { Link } from "react-router-dom"
import type { TaskRow } from "@/data/schema"
import { engineerTasks } from "@/data/seed"
import { useAuth } from "@/contexts/AuthContext"

type Task = TaskRow

const priorityColor: Record<string, string> = {
  Haute:   "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400",
  Normale: "text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400",
  Basse:   "text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-400",
}

/* MOCK logs — disabled */
const logs: { cls: string; t: string }[] = []

/* MOCK KPI row — disabled */
const engKpis: { label: string; value: string; icon: string; color: string; bg: string }[] = []

export default function EngineerDashboard() {
  const [tasks, setTasks] = useState<Task[]>(() => [...engineerTasks])

  function toggleTask(id: string) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  const doneCount = tasks.filter(t => t.done).length
  const { user } = useAuth()
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? ""

  return (
    <DashboardLayout role="engineer" navItems={engineerNav} pageTitle="Tableau de bord">
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {firstName ? `Bonjour, ${firstName}` : "Bonjour"} 👨‍💻
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {doneCount < tasks.length
              ? `Vous avez ${tasks.length - doneCount} tâche${tasks.length - doneCount > 1 ? "s" : ""} prioritaire${tasks.length - doneCount > 1 ? "s" : ""} aujourd'hui.`
              : "Toutes les tâches du jour sont complètes. 🎉"}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {engKpis.map(k => (
            <div key={k.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className={`size-10 rounded-lg ${k.bg} ${k.color} flex items-center justify-center mb-3`}>
                <span className="material-symbols-outlined text-[20px]">{k.icon}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{k.value}</p>
              <p className="text-sm text-slate-500 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Priority tasks */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-white">Tâches prioritaires</h3>
              {doneCount > 0 && (
                <span className="text-xs text-slate-400">{doneCount}/{tasks.length}</span>
              )}
            </div>
            <Link to="/engineer/requests" className="text-sm text-blue-600 hover:text-blue-700 font-medium">Voir tout</Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {tasks.map(t => (
              <div
                key={t.id}
                className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                onClick={() => toggleTask(t.id)}
              >
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() => toggleTask(t.id)}
                  onClick={e => e.stopPropagation()}
                  className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${t.done ? "line-through text-slate-400" : "text-slate-900 dark:text-white"}`}>{t.label}</p>
                  <p className="text-xs text-slate-400">{t.project} · Échéance : {t.due}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${priorityColor[t.priority]}`}>{t.priority}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System logs */}
        <div className="bg-slate-900 dark:bg-black rounded-xl border border-slate-700 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="size-3 rounded-full bg-rose-500" />
            <div className="size-3 rounded-full bg-amber-500" />
            <div className="size-3 rounded-full bg-emerald-500" />
            <span className="text-slate-400 text-xs ml-2 font-mono">system logs</span>
          </div>
          <div className="font-mono text-xs space-y-1">
            {logs.map(l => <p key={l.t} className={l.cls}>{l.t}</p>)}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
