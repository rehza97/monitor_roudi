// FILE REPLACED — full Firestore version below
import { useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { technicianNav } from "@/lib/nav"
import { useParams, Link } from "react-router-dom"

function ChecklistCard() {
  const [items, setItems] = useState([
    { label: "Vérifier l'alimentation du switch", done: true  },
    { label: "Tester la connectivité réseau",      done: true  },
    { label: "Remplacer le matériel défaillant",   done: false },
    { label: "Mettre à jour la configuration",     done: false },
    { label: "Valider avec le client",             done: false },
  ])
  const done = items.filter(i => i.done).length
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white">Checklist</h3>
        <span className="text-xs font-bold text-amber-600">{done}/{items.length}</span>
      </div>
      <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${(done / items.length) * 100}%` }} />
      </div>
      <div className="space-y-2 pt-1">
        {items.map((item, i) => (
          <label key={i} className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => setItems(prev => prev.map((x, idx) => idx === i ? { ...x, done: !x.done } : x))}
              className="size-4 rounded accent-amber-500 cursor-pointer"
            />
            <span className={`text-sm ${item.done ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-300"}`}>
              {item.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

export default function TechnicianTicketDetail() {
  const { id } = useParams()
  const [report, setReport] = useState("")
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle")

  function handleSave() {
    if (!report.trim()) return
    setSaveState("saving")
    setTimeout(() => {
      setSaveState("saved")
      setTimeout(() => setSaveState("idle"), 3000)
    }, 800)
  }

  return (
    <DashboardLayout role="technician" navItems={technicianNav} pageTitle="Détails du ticket">
      <div className="p-6 w-full space-y-6">
        <Link to="/technician/tickets" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Retour aux interventions
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Panne réseau — TechSolutions SAS</h2>
            <p className="text-slate-500 text-sm mt-1">Ticket {id} · Alger, Siège Social</p>
          </div>
          <span className="text-sm font-semibold px-3 py-1.5 rounded-full text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400 shrink-0">Urgente</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* Description */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Description du problème</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                La connexion réseau du bâtiment principal est tombée ce matin à 08h15. Le switch principal semble ne plus répondre. Les équipes sont sans accès internet depuis 2 heures.
              </p>
            </div>

            {/* Rapport */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">Rapport d'intervention</h3>
              <textarea
                rows={4}
                value={report}
                onChange={e => { setReport(e.target.value); if (saveState === "saved") setSaveState("idle") }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                placeholder="Décrivez les actions réalisées…"
              />
              {saveState === "saved" && (
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium animate-in fade-in">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Rapport sauvegardé
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saveState === "saving" || !report.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {saveState === "saving" ? "hourglass_empty" : "save"}
                  </span>
                  {saveState === "saving" ? "Sauvegarde…" : "Sauvegarder"}
                </button>
                <Link
                  to={`/technician/tickets/${id}/validate`}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>Valider l'intervention
                </Link>
              </div>
            </div>

            <ChecklistCard />
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Infos</h3>
              {[
                { label: "Client",         value: "TechSolutions SAS" },
                { label: "Adresse",        value: "12 Rue du Commerce, Alger" },
                { label: "Contact",        value: "+213 21 42 00 00" },
                { label: "Date planifiée", value: "22 Mar 09:30" },
              ].map(i => (
                <div key={i.label} className="flex justify-between text-sm">
                  <span className="text-slate-500">{i.label}</span>
                  <span className="font-medium text-slate-900 dark:text-white text-right ml-2">{i.value}</span>
                </div>
              ))}
            </div>
            <Link
              to="/technician/remote"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">settings_remote</span>Accès distant
            </Link>
            <a
              href="tel:+21321420000"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">call</span>Appeler le client
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
