import type { ReactNode } from "react"
import {
  getOrderProgress,
  getFeatureProgress,
  shouldShowAssignedEngineer,
  MILESTONES,
} from "@/lib/project-progress"

export interface ProjectProgressPanelProps {
  status: string
  features?: string[]
  completedFeatures?: string[]
  assignedEngineerName?: string | null
  variant: "client" | "engineer"
  compact?: boolean
  onToggleFeature?: (feature: string) => void
  /** Optional footer line (e.g. task count on engineer page) */
  footer?: ReactNode
}

export default function ProjectProgressPanel({
  status,
  features,
  completedFeatures,
  assignedEngineerName,
  variant,
  compact = false,
  onToggleFeature,
  footer,
}: ProjectProgressPanelProps) {
  const isClient = variant === "client"
  const accent = isClient ? "#0891b2" : "#3d72e6"
  const barFrom = isClient ? "from-cyan-400" : "from-blue-400"
  const barTo = isClient ? "to-[#0891b2]" : "to-[#3d72e6]"
  const currentBg = isClient ? "bg-cyan-50 border-cyan-200" : "bg-blue-50 border-blue-200"
  const reachedBg = isClient ? "bg-[#0891b2]" : "bg-blue-600"

  const { percent, stepIndex, isRejected } = getOrderProgress(status)
  const featureProgress = getFeatureProgress(features, completedFeatures)
  const showEngineer =
    shouldShowAssignedEngineer(status) && !!assignedEngineerName?.trim()

  if (compact) {
    return (
      <div className="flex items-center gap-2 min-w-[100px]">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${barFrom} ${barTo} transition-all duration-500`}
            style={{ width: `${isRejected ? 0 : percent}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-slate-600 tabular-nums shrink-0">
          {isRejected ? "—" : `${percent}%`}
        </span>
      </div>
    )
  }

  if (isRejected) {
    return (
      <section className="overflow-hidden rounded-xl border border-red-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-red-100 bg-red-50/50 px-6 py-4">
          <h3 className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="material-symbols-outlined text-[20px] text-red-600">cancel</span>
            Progression du projet
          </h3>
        </div>
        <div className="p-6">
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <span className="material-symbols-outlined text-red-600 text-[24px] shrink-0">error</span>
            <div>
              <p className="font-semibold text-red-800">Demande rejetée</p>
              <p className="mt-1 text-sm text-red-700">
                Cette demande n'a pas été acceptée. Contactez l'équipe pour plus d'informations.
              </p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
        <h3 className="flex items-center gap-2 font-semibold text-slate-900">
          <span
            className="material-symbols-outlined text-[20px]"
            style={{ color: accent }}
          >
            timeline
          </span>
          Progression du projet
        </h3>
        <span className="text-2xl font-black text-slate-900 tabular-nums">{percent}%</span>
      </div>

      <div className="space-y-6 p-6">
        <div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${barFrom} ${barTo} transition-all duration-700`}
              style={{ width: `${percent}%` }}
            />
          </div>
          {footer && <div className="mt-2">{footer}</div>}
          {showEngineer && (
            <p className="mt-2 text-sm text-slate-600">
              <span className="material-symbols-outlined text-[16px] align-middle mr-1 text-slate-400">
                engineering
              </span>
              Ingénieur assigné :{" "}
              <span className="font-medium text-slate-900">{assignedEngineerName}</span>
            </p>
          )}
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Jalons
          </h4>
          <div className="space-y-2">
            {MILESTONES.map((m, i) => {
              const reached = stepIndex >= 0 && i <= stepIndex
              const current = i === stepIndex
              return (
                <div
                  key={m.status}
                  className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                    current ? `${currentBg} border` : ""
                  }`}
                >
                  <div
                    className={`size-9 rounded-full flex items-center justify-center shrink-0 ${
                      reached ? `${reachedBg} text-white` : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{m.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        reached ? "text-slate-900" : "text-slate-400"
                      }`}
                    >
                      {m.label}
                    </p>
                    <p className="text-xs text-slate-400">{m.status}</p>
                  </div>
                  {reached && (
                    <span className="material-symbols-outlined text-emerald-500 text-[20px] shrink-0">
                      check_circle
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {featureProgress.total > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Fonctionnalités
              </h4>
              <span className="text-xs font-medium text-slate-500">
                {featureProgress.done}/{featureProgress.total} livrée
                {featureProgress.done !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-2">
              {featureProgress.items.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 bg-slate-50/50"
                >
                  {variant === "engineer" && onToggleFeature ? (
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => onToggleFeature(item.label)}
                      className="size-4 rounded accent-blue-600 cursor-pointer shrink-0"
                    />
                  ) : (
                    <span
                      className={`material-symbols-outlined text-[20px] shrink-0 ${
                        item.done ? "text-emerald-500" : "text-slate-300"
                      }`}
                    >
                      {item.done ? "check_circle" : "radio_button_unchecked"}
                    </span>
                  )}
                  <span
                    className={`text-sm ${
                      item.done ? "text-slate-500 line-through" : "text-slate-800 font-medium"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
