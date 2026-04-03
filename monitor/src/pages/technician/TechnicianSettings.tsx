import { useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { technicianNav } from "@/lib/nav"

type ToggleKey = "interventions" | "calendar" | "stock" | "messages"

const defaultPrefs: Record<ToggleKey, boolean> = {
  interventions: true,
  calendar:      true,
  stock:         false,
  messages:      true,
}

export default function TechnicianSettings() {
  /* MOCK: prefilled profile — disabled
  prenom: "Léa", nom: "Rousseau", email: "tech@demo.fr", phone: "+213...", zone: "Alger & Alentours"
  */
  const [form, setForm] = useState({
    prenom: "", nom: "",
    email: "", phone: "",
    zone: "",
  })
  const [prefs, setPrefs] = useState<Record<ToggleKey, boolean>>(defaultPrefs)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle")

  function togglePref(key: ToggleKey) {
    setPrefs(p => ({ ...p, [key]: !p[key] }))
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

  const notifRows: { key: ToggleKey; label: string; desc: string }[] = [
    { key: "interventions", label: "Nouvelles interventions", desc: "Être notifié lors d'une assignation"   },
    { key: "calendar",      label: "Rappels d'agenda",        desc: "Rappel 1h avant chaque intervention"  },
    { key: "stock",         label: "Mise à jour stock",       desc: "Alertes sur les ruptures de stock"    },
    { key: "messages",      label: "Messages internes",       desc: "Notifications de la messagerie"       },
  ]

  return (
    <DashboardLayout role="technician" navItems={technicianNav} pageTitle="Réglages">
      <form onSubmit={handleSave} className="p-6 max-w-3xl space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Réglages</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Vos préférences personnelles et de travail.</p>
        </div>

        {/* Profil */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white">Profil</h3>
          <div className="grid grid-cols-2 gap-4">
            {(["prenom", "nom"] as const).map(f => (
              <div key={f} className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">{f === "prenom" ? "Prénom" : "Nom"}</label>
                <input
                  value={form[f]}
                  onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                  type="text"
                  className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            ))}
          </div>
          {(["email", "phone", "zone"] as const).map(f => (
            <div key={f} className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {f === "email" ? "Email" : f === "phone" ? "Téléphone" : "Zone d'intervention"}
              </label>
              <input
                value={form[f]}
                onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                type={f === "email" ? "email" : f === "phone" ? "tel" : "text"}
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          ))}
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
                onClick={() => togglePref(r.key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${prefs[r.key] ? "bg-amber-500" : "bg-slate-200 dark:bg-slate-700"}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${prefs[r.key] ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          ))}
        </div>

        {/* Save */}
        <div className="flex items-center justify-between">
          {saveState === "saved" && (
            <span className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              Modifications enregistrées
            </span>
          )}
          {saveState !== "saved" && <span />}
          <button
            type="submit"
            disabled={saveState === "saving"}
            className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition-colors"
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
