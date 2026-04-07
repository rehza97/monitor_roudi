import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import { db } from "@/config/firebase"
import { COLLECTIONS, type FirestorePlatformConfig } from "@/data/schema"
import { doc, getDoc, setDoc, serverTimestamp } from "@/lib/firebase-firestore"

const SETTINGS_DOC_ID = "main"

type SecurityKey = "twofa" | "multiSession" | "connLogs" | "ipWhitelist"

const SECURITY_ROWS: { key: SecurityKey; label: string; desc: string }[] = [
  { key: "twofa",        label: "Authentification 2FA obligatoire",  desc: "Forcer le 2FA pour tous les comptes admin"      },
  { key: "multiSession", label: "Connexions simultanées multiples",  desc: "Permettre plusieurs sessions actives par user"   },
  { key: "connLogs",     label: "Logs de connexion",                 desc: "Journaliser toutes les tentatives de connexion"  },
  { key: "ipWhitelist",  label: "IP whitelist",                      desc: "Restreindre l'accès admin par adresse IP"        },
]

const DEFAULT_CONFIG: FirestorePlatformConfig = {
  name: "",
  email: "",
  url: "",
  security: { twofa: true, multiSession: false, connLogs: true, ipWhitelist: false },
}

type MaintenanceState = "idle" | "loading" | "done"

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#db143c] ${
        on ? "bg-[#db143c]" : "bg-slate-200 dark:bg-slate-700"
      }`}
      role="switch"
      aria-checked={on}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${on ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  )
}

export default function AdminSettings() {
  const [config, setConfig] = useState<FirestorePlatformConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [maint, setMaint] = useState<Record<string, MaintenanceState>>({})
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!db) { setLoading(false); return }
    getDoc(doc(db, COLLECTIONS.platformConfig, SETTINGS_DOC_ID))
      .then(snap => {
        if (snap.exists()) {
          const data = snap.data() as FirestorePlatformConfig
          setConfig({
            name: data.name ?? "",
            email: data.email ?? "",
            url: data.url ?? "",
            security: {
              twofa:        data.security?.twofa        ?? true,
              multiSession: data.security?.multiSession ?? false,
              connLogs:     data.security?.connLogs     ?? true,
              ipWhitelist:  data.security?.ipWhitelist  ?? false,
            },
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function setField<K extends keyof Omit<FirestorePlatformConfig, "security" | "updatedAt">>(
    key: K,
    value: FirestorePlatformConfig[K]
  ) {
    setConfig(p => ({ ...p, [key]: value }))
    setDirty(true)
    setSaveState("idle")
  }

  function toggleSecurity(key: SecurityKey) {
    setConfig(p => ({ ...p, security: { ...p.security, [key]: !p.security[key] } }))
    setDirty(true)
    setSaveState("idle")
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!db) return
    setSaveState("saving")
    try {
      await setDoc(
        doc(db, COLLECTIONS.platformConfig, SETTINGS_DOC_ID),
        { ...config, updatedAt: serverTimestamp() },
        { merge: true }
      )
      setSaveState("saved")
      setDirty(false)
      setTimeout(() => setSaveState("idle"), 3000)
    } catch {
      setSaveState("error")
    }
  }

  function runMaintenance(key: string) {
    setMaint(p => ({ ...p, [key]: "loading" }))
    setTimeout(() => {
      setMaint(p => ({ ...p, [key]: "done" }))
      setTimeout(() => setMaint(p => ({ ...p, [key]: "idle" })), 2500)
    }, 1200)
  }

  const maintenanceActions = [
    { key: "cache",       label: "Vider le cache",   icon: "cached",       color: "text-blue-600   border-blue-200  dark:border-blue-800  hover:bg-blue-50 dark:hover:bg-blue-900/20"       },
    { key: "logs",        label: "Purger les logs",  icon: "delete_sweep", color: "text-amber-600  border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/20"   },
    { key: "export",      label: "Export données",   icon: "download",     color: "text-emerald-600 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" },
    { key: "maintenance", label: "Mode maintenance", icon: "construction", color: "text-rose-600   border-rose-200  dark:border-rose-800  hover:bg-rose-50 dark:hover:bg-rose-900/20"     },
  ]

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Paramètres">
      <form onSubmit={e => void handleSave(e)} className="p-6 w-full space-y-6">

        {/* Page header */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Paramètres plateforme</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Configuration globale enregistrée dans Firestore ({loading ? "chargement…" : "synchronisé"}).
          </p>
        </div>

        {/* General */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <span className="material-symbols-outlined text-[#db143c] text-[20px]">settings</span>
            <h3 className="font-semibold text-slate-900 dark:text-white">Général</h3>
          </div>
          <div className="p-6 space-y-4">
            {([
              { key: "name"  as const, label: "Nom de la plateforme", type: "text",  placeholder: "Rodaina" },
              { key: "email" as const, label: "Email de contact",     type: "email", placeholder: "contact@rodaina.dz" },
              { key: "url"   as const, label: "URL publique",         type: "url",   placeholder: "https://rodaina.dz" },
            ]).map(f => (
              <div key={f.key} className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{f.label}</label>
                <input
                  value={config[f.key]}
                  onChange={e => setField(f.key, e.target.value)}
                  type={f.type}
                  placeholder={f.placeholder}
                  disabled={loading}
                  className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#db143c] disabled:opacity-50"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Security */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <span className="material-symbols-outlined text-[#db143c] text-[20px]">security</span>
            <h3 className="font-semibold text-slate-900 dark:text-white">Sécurité &amp; Accès</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {SECURITY_ROWS.map(r => (
              <div key={r.key} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{r.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{r.desc}</p>
                </div>
                <Toggle on={config.security[r.key]} onToggle={() => toggleSecurity(r.key)} />
              </div>
            ))}
          </div>
        </section>

        {/* Maintenance */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <span className="material-symbols-outlined text-[#db143c] text-[20px]">build</span>
            <h3 className="font-semibold text-slate-900 dark:text-white">Maintenance</h3>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <div>
                    <p className="text-sm font-semibold">
                      {state === "loading" ? "En cours…" : state === "done" ? "Terminé" : a.label}
                    </p>
                    {state === "idle" && (
                      <p className="text-xs opacity-70 mt-0.5">Cliquez pour exécuter</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Save bar */}
        <div className="sticky bottom-0 -mx-6 px-6 py-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="text-sm">
            {saveState === "saved" && (
              <span className="flex items-center gap-2 text-emerald-600 font-medium">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Modifications enregistrées dans Firestore
              </span>
            )}
            {saveState === "error" && (
              <span className="flex items-center gap-2 text-rose-600 font-medium">
                <span className="material-symbols-outlined text-[16px]">error</span>
                Erreur lors de l'enregistrement
              </span>
            )}
            {dirty && saveState === "idle" && (
              <span className="text-amber-600 text-sm">Modifications non enregistrées</span>
            )}
          </div>
          <button
            type="submit"
            disabled={saveState === "saving" || loading || !db}
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
