import { useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"

type SecurityKey = "twofa" | "multiSession" | "connLogs" | "ipWhitelist"

const defaultSecurity: Record<SecurityKey, boolean> = {
  twofa:        true,
  multiSession: false,
  connLogs:     true,
  ipWhitelist:  false,
}

const securityRows: { key: SecurityKey; label: string; desc: string }[] = [
  { key: "twofa",        label: "Authentification 2FA obligatoire",  desc: "Forcer le 2FA pour tous les comptes admin"      },
  { key: "multiSession", label: "Connexions simultanées multiples",  desc: "Permettre plusieurs sessions actives par user"  },
  { key: "connLogs",     label: "Logs de connexion",                 desc: "Journaliser toutes les tentatives de connexion" },
  { key: "ipWhitelist",  label: "IP whitelist",                      desc: "Restreindre l'accès admin par adresse IP"       },
]

type MaintenanceState = "idle" | "loading" | "done"

export default function AdminSettings() {
  /* MOCK: identité plateforme préremplie — désactivée */
  const [form, setForm] = useState({
    name:  "",
    email: "",
    url:   "",
  })
  const [security, setSecurity]   = useState<Record<SecurityKey, boolean>>(defaultSecurity)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle")
  const [maint, setMaint]         = useState<Record<string, MaintenanceState>>({})

  function toggleSecurity(key: SecurityKey) {
    setSecurity(p => ({ ...p, [key]: !p[key] }))
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

  function runMaintenance(key: string) {
    setMaint(p => ({ ...p, [key]: "loading" }))
    setTimeout(() => {
      setMaint(p => ({ ...p, [key]: "done" }))
      setTimeout(() => setMaint(p => ({ ...p, [key]: "idle" })), 2500)
    }, 1200)
  }

  const maintenanceActions = [
    { key: "cache",       label: "Vider le cache",    icon: "cached",       color: "text-blue-600   border-blue-200  dark:border-blue-800  hover:bg-blue-50 dark:hover:bg-blue-900/20"     },
    { key: "logs",        label: "Purger les logs",   icon: "delete_sweep", color: "text-amber-600  border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/20"   },
    { key: "export",      label: "Export données",    icon: "download",     color: "text-emerald-600 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" },
    { key: "maintenance", label: "Mode maintenance",  icon: "construction", color: "text-rose-600   border-rose-200  dark:border-rose-800  hover:bg-rose-50 dark:hover:bg-rose-900/20"     },
  ]

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Paramètres">
      <form onSubmit={handleSave} className="p-6 max-w-3xl space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Paramètres plateforme</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Configuration globale de la plateforme Rodaina.</p>
        </div>

        {/* Général */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
          <h3 className="font-bold text-slate-900 dark:text-white">Général</h3>
          {([
            { key: "name"  as const, label: "Nom de la plateforme", type: "text"  },
            { key: "email" as const, label: "Email de contact",     type: "email" },
            { key: "url"   as const, label: "URL publique",         type: "url"   },
          ]).map(f => (
            <div key={f.key} className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{f.label}</label>
              <input
                value={form[f.key]}
                onChange={e => { setForm(p => ({ ...p, [f.key]: e.target.value })); setSaveState("idle") }}
                type={f.type}
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#db143c]"
              />
            </div>
          ))}
        </div>

        {/* Sécurité */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white">Sécurité &amp; Accès</h3>
          {securityRows.map(r => (
            <div key={r.key} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{r.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{r.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => toggleSecurity(r.key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${security[r.key] ? "bg-[#db143c]" : "bg-slate-200 dark:bg-slate-700"}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${security[r.key] ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          ))}
        </div>

        {/* Maintenance */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white">Maintenance</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {maintenanceActions.map(a => {
              const state = maint[a.key] ?? "idle"
              return (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => runMaintenance(a.key)}
                  disabled={state === "loading"}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-colors text-left disabled:opacity-60 ${a.color}`}
                >
                  <span className={`material-symbols-outlined text-[20px] ${state === "loading" ? "animate-spin" : ""}`}>
                    {state === "done" ? "check_circle" : state === "loading" ? "autorenew" : a.icon}
                  </span>
                  <span className="text-sm font-medium">
                    {state === "loading" ? "En cours…" : state === "done" ? "Terminé ✓" : a.label}
                  </span>
                </button>
              )
            })}
          </div>
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
            className="flex items-center gap-2 px-6 py-2.5 bg-[#db143c] hover:opacity-90 disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition-opacity"
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
