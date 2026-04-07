import { useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { engineerNav } from "@/lib/nav"

type NotifKey = "monitoring" | "requests" | "prs" | "digest"
type IntKey   = "github" | "slack" | "pagerduty" | "datadog"

const defaultNotifs: Record<NotifKey, boolean> = {
  monitoring: true,
  requests:   true,
  prs:        false,
  digest:     true,
}

const notifRows: { key: NotifKey; label: string; desc: string }[] = [
  { key: "monitoring", label: "Alertes monitoring",  desc: "Recevoir les alertes des services en temps réel" },
  { key: "requests",   label: "Nouvelles demandes",  desc: "Être notifié lors de nouvelles assignations"     },
  { key: "prs",        label: "Mises à jour de PR",  desc: "Suivi des review et merge sur vos projets"       },
  { key: "digest",     label: "Résumé quotidien",    desc: "Email récapitulatif chaque matin à 8h"           },
]

type Integration = { name: string; icon: string; desc: string; connected: boolean }

const defaultIntegrations: Record<IntKey, Integration> = {
  github:    { name: "GitHub",    icon: "code",      desc: "github.com/marc-lefebvre", connected: true  },
  slack:     { name: "Slack",     icon: "chat",      desc: "#engineering-alerts",      connected: true  },
  pagerduty: { name: "PagerDuty", icon: "alarm",     desc: "Non connecté",             connected: false },
  datadog:   { name: "Datadog",   icon: "monitoring",desc: "Non connecté",             connected: false },
}

const defaultThresholds = { cpu: "80", ram: "85", latency: "500", errorRate: "5" }

const thresholdFields: { key: keyof typeof defaultThresholds; label: string }[] = [
  { key: "cpu",       label: "CPU (%)"              },
  { key: "ram",       label: "RAM (%)"              },
  { key: "latency",   label: "Latence (ms)"         },
  { key: "errorRate", label: "Taux d'erreur (%)"    },
]

export default function EngineerSettings() {
  const [notifs, setNotifs]             = useState<Record<NotifKey, boolean>>(defaultNotifs)
  const [integrations, setIntegrations] = useState<Record<IntKey, Integration>>(defaultIntegrations)
  const [thresholds, setThresholds]     = useState(defaultThresholds)
  const [saveState, setSaveState]       = useState<"idle" | "saving" | "saved">("idle")

  function toggleNotif(key: NotifKey) {
    setNotifs(p => ({ ...p, [key]: !p[key] }))
    setSaveState("idle")
  }

  function toggleIntegration(key: IntKey) {
    setIntegrations(p => ({
      ...p,
      [key]: {
        ...p[key],
        connected: !p[key].connected,
        desc: p[key].connected ? "Non connecté" : p[key].name === "GitHub" ? "github.com/marc-lefebvre" : p[key].name === "Slack" ? "#engineering-alerts" : p[key].name + " connecté",
      },
    }))
    setSaveState("idle")
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaveState("saving")
    setTimeout(() => {
      setSaveState("saved")
      setTimeout(() => setSaveState("idle"), 3000)
    }, 800)
  }

  return (
    <DashboardLayout role="engineer" navItems={engineerNav} pageTitle="Paramètres">
      <form onSubmit={handleSave} className="p-6 w-full space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Paramètres</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Configurez vos préférences et intégrations.</p>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white">Notifications</h3>
          {notifRows.map(r => (
            <div key={r.key} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{r.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{r.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => toggleNotif(r.key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${notifs[r.key] ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${notifs[r.key] ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          ))}
        </div>

        {/* Thresholds */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white">Seuils d'alerte monitoring</h3>
          {thresholdFields.map(f => (
            <div key={f.key} className="flex items-center justify-between gap-4">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 w-48 shrink-0">{f.label}</label>
              <input
                value={thresholds[f.key]}
                onChange={e => { setThresholds(p => ({ ...p, [f.key]: e.target.value })); setSaveState("idle") }}
                type="number"
                min={0}
                className="w-full max-w-xs h-9 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>

        {/* Integrations */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white">Intégrations</h3>
          {(Object.keys(integrations) as IntKey[]).map(key => {
            const i = integrations[key]
            return (
              <div key={key} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px] text-slate-600 dark:text-slate-300">{i.icon}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{i.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{i.desc}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleIntegration(key)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                    i.connected
                      ? "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                      : "text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  }`}
                >
                  {i.connected ? "Déconnecter" : "Connecter"}
                </button>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between">
          {saveState === "saved" ? (
            <span className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              Modifications enregistrées
            </span>
          ) : <span />}
          <button
            type="submit"
            disabled={saveState === "saving"}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">
              {saveState === "saving" ? "hourglass_empty" : "save"}
            </span>
            {saveState === "saving" ? "Enregistrement…" : "Enregistrer les modifications"}
          </button>
        </div>
      </form>
    </DashboardLayout>
  )
}
