import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { engineerNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import { COLLECTIONS } from "@/data/schema"
import { doc, getDoc, serverTimestamp, updateDoc } from "@/lib/firebase-firestore"

type NotifKey = "monitoring" | "requests" | "prs" | "digest"
type IntKey = "github" | "slack" | "pagerduty" | "datadog"

const defaultNotifs: Record<NotifKey, boolean> = {
  monitoring: true,
  requests: true,
  prs: false,
  digest: true,
}

const notifRows: { key: NotifKey; label: string; desc: string }[] = [
  { key: "monitoring", label: "Alertes monitoring", desc: "Recevoir les alertes des services en temps réel" },
  { key: "requests", label: "Nouvelles demandes", desc: "Être notifié lors de nouvelles assignations" },
  { key: "prs", label: "Mises à jour de PR", desc: "Suivi des review et merge sur vos projets" },
  { key: "digest", label: "Résumé quotidien", desc: "Email récapitulatif chaque matin à 8h" },
]

type Integration = { name: string; icon: string; placeholder: string; apiKey: string; connected: boolean }

const defaultIntegrations: Record<IntKey, Integration> = {
  github:    { name: "GitHub",    icon: "code",       placeholder: "ghp_xxxxxxxxxxxxxxxxxxxx",      apiKey: "", connected: false },
  slack:     { name: "Slack",     icon: "chat",       placeholder: "https://hooks.slack.com/…",     apiKey: "", connected: false },
  pagerduty: { name: "PagerDuty", icon: "alarm",      placeholder: "Clé d'intégration PagerDuty",  apiKey: "", connected: false },
  datadog:   { name: "Datadog",   icon: "monitoring", placeholder: "Clé API Datadog",              apiKey: "", connected: false },
}

const defaultThresholds = { cpu: "80", ram: "85", latency: "500", errorRate: "5" }

const thresholdFields: { key: keyof typeof defaultThresholds; label: string }[] = [
  { key: "cpu", label: "CPU (%)" },
  { key: "ram", label: "RAM (%)" },
  { key: "latency", label: "Latence (ms)" },
  { key: "errorRate", label: "Taux d'erreur (%)" },
]

export default function EngineerSettings() {
  const { user } = useAuth()
  const [notifs, setNotifs] = useState<Record<NotifKey, boolean>>(defaultNotifs)
  const [integrations, setIntegrations] = useState<Record<IntKey, Integration>>(defaultIntegrations)
  const [thresholds, setThresholds] = useState(defaultThresholds)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle")

  useEffect(() => {
    async function load() {
      if (!db || !user?.id) return
      const snap = await getDoc(doc(db, COLLECTIONS.users, user.id))
      if (!snap.exists()) return
      const data = snap.data() as Record<string, unknown>

      const prefs = data.engineerSettings && typeof data.engineerSettings === "object"
        ? (data.engineerSettings as Record<string, unknown>)
        : {}

      const notifications = prefs.notifications && typeof prefs.notifications === "object"
        ? (prefs.notifications as Record<string, unknown>)
        : {}
      setNotifs((prev) => ({
        ...prev,
        monitoring: typeof notifications.monitoring === "boolean" ? notifications.monitoring : prev.monitoring,
        requests: typeof notifications.requests === "boolean" ? notifications.requests : prev.requests,
        prs: typeof notifications.prs === "boolean" ? notifications.prs : prev.prs,
        digest: typeof notifications.digest === "boolean" ? notifications.digest : prev.digest,
      }))

      const ints = prefs.integrations && typeof prefs.integrations === "object"
        ? (prefs.integrations as Record<string, unknown>)
        : {}
      setIntegrations((prev) => {
        const next = { ...prev }
        ;(Object.keys(prev) as IntKey[]).forEach((k) => {
          const raw = ints[k]
          if (raw && typeof raw === "object") {
            const r = raw as Record<string, unknown>
            next[k] = {
              ...prev[k],
              connected: typeof r.connected === "boolean" ? r.connected : prev[k].connected,
              apiKey: typeof r.apiKey === "string" ? r.apiKey : prev[k].apiKey,
            }
          }
        })
        return next
      })

      const th = prefs.thresholds && typeof prefs.thresholds === "object"
        ? (prefs.thresholds as Record<string, unknown>)
        : {}
      setThresholds((prev) => ({
        cpu: typeof th.cpu === "string" || typeof th.cpu === "number" ? String(th.cpu) : prev.cpu,
        ram: typeof th.ram === "string" || typeof th.ram === "number" ? String(th.ram) : prev.ram,
        latency: typeof th.latency === "string" || typeof th.latency === "number" ? String(th.latency) : prev.latency,
        errorRate: typeof th.errorRate === "string" || typeof th.errorRate === "number" ? String(th.errorRate) : prev.errorRate,
      }))
    }
    void load()
  }, [user?.id])

  function toggleNotif(key: NotifKey) {
    setNotifs((p) => ({ ...p, [key]: !p[key] }))
    setSaveState("idle")
  }

  function setApiKey(key: IntKey, value: string) {
    setIntegrations((p) => ({
      ...p,
      [key]: { ...p[key], apiKey: value, connected: value.trim().length > 0 },
    }))
    setSaveState("idle")
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!db || !user?.id) return
    setSaveState("saving")

    await updateDoc(doc(db, COLLECTIONS.users, user.id), {
      engineerSettings: {
        notifications: notifs,
        integrations,
        thresholds,
      },
      updatedAt: serverTimestamp(),
    })

    setSaveState("saved")
    setTimeout(() => setSaveState("idle"), 2500)
  }

  return (
    <DashboardLayout role="engineer" navItems={engineerNav} pageTitle="Paramètres">
      <form onSubmit={(e) => void handleSave(e)} className="p-6 w-full space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Paramètres</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Préférences enregistrées dans Firebase.</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white">Notifications</h3>
          {notifRows.map((r) => (
            <div key={r.key} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{r.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{r.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => toggleNotif(r.key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  notifs[r.key] ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
                }`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${notifs[r.key] ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white">Seuils d'alerte monitoring</h3>
          {thresholdFields.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-4">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 w-48 shrink-0">{f.label}</label>
              <input
                value={thresholds[f.key]}
                onChange={(e) => {
                  setThresholds((p) => ({ ...p, [f.key]: e.target.value }))
                  setSaveState("idle")
                }}
                type="number"
                min={0}
                className="w-full max-w-xs h-9 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Intégrations</h3>
            <p className="text-xs text-slate-500 mt-1">Les clés sont sauvegardées dans Firebase et masquées à la prochaine visite.</p>
          </div>
          {(Object.keys(integrations) as IntKey[]).map((key) => {
            const i = integrations[key]
            return (
              <div key={key} className="space-y-2 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px] text-slate-600 dark:text-slate-300">{i.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{i.name}</p>
                      {i.connected && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600">Connecté</span>
                      )}
                    </div>
                  </div>
                </div>
                <input
                  type="password"
                  value={i.apiKey}
                  onChange={(e) => setApiKey(key, e.target.value)}
                  placeholder={i.placeholder}
                  className="w-full h-9 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
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
          ) : (
            <span />
          )}
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
