import { useState, type KeyboardEvent } from "react"
import { useNavigate } from "react-router-dom"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { clientNav } from "@/lib/nav"

type FormState = "idle" | "submitting" | "done"

export default function ClientRequestNew() {
  const navigate = useNavigate()
  const [name,        setName]        = useState("")
  const [appType,     setAppType]     = useState("Application web")
  const [budget,      setBudget]      = useState("")
  const [description, setDescription] = useState("")
  const [featureInput,setFeatureInput]= useState("")
  const [features,    setFeatures]    = useState<string[]>([])
  const [deadline,    setDeadline]    = useState("1 mois")
  const [priority,    setPriority]    = useState("Normale")
  const [state,       setState]       = useState<FormState>("idle")

  function addFeature() {
    const f = featureInput.trim()
    if (f && !features.includes(f)) setFeatures(prev => [...prev, f])
    setFeatureInput("")
  }

  function handleFeatureKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); addFeature() }
  }

  function removeFeature(f: string) {
    setFeatures(prev => prev.filter(x => x !== f))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setState("submitting")
    setTimeout(() => setState("done"), 1200)
  }

  if (state === "done") {
    return (
      <DashboardLayout role="client" navItems={clientNav} pageTitle="Nouvelle demande">
        <div className="flex flex-col items-center justify-center py-24 gap-5">
          <div className="size-20 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-emerald-600 text-[40px]">check_circle</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Demande soumise !</h2>
          <p className="text-slate-500 text-sm text-center max-w-xs">
            Votre demande <strong>{name}</strong> a été envoyée. Notre équipe vous contactera sous 24h.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/client/requests")}
              className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Voir mes demandes
            </button>
            <button
              onClick={() => { setName(""); setBudget(""); setDescription(""); setFeatures([]); setState("idle") }}
              className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-lg"
            >
              Nouvelle demande
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="client" navItems={clientNav} pageTitle="Nouvelle demande">
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Demander une nouvelle application</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Remplissez ce formulaire pour soumettre votre besoin.</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* General info */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-600 text-[20px]">info</span>
              Informations générales
            </h3>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nom du projet <span className="text-rose-500">*</span></label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-600"
                placeholder="Ex: App e-commerce"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Type d'application</label>
                <select
                  value={appType}
                  onChange={e => setAppType(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none"
                >
                  <option>Application web</option>
                  <option>Application mobile</option>
                  <option>API / Backend</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Budget estimé (DA)</label>
                <input
                  type="number"
                  value={budget}
                  onChange={e => setBudget(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-600"
                  placeholder="5 000"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-600 text-[20px]">edit_note</span>
              Description détaillée
            </h3>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description du besoin</label>
              <textarea
                rows={5}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-600 resize-none"
                placeholder="Décrivez votre besoin en détail…"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Fonctionnalités souhaitées</label>
              <div className="flex gap-2">
                <input
                  value={featureInput}
                  onChange={e => setFeatureInput(e.target.value)}
                  onKeyDown={handleFeatureKey}
                  className="flex-1 h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-600"
                  placeholder="Ajouter une fonctionnalité et appuyer Entrée…"
                />
                <button
                  type="button"
                  onClick={addFeature}
                  disabled={!featureInput.trim()}
                  className="px-3 h-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
              </div>
              {features.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {features.map(f => (
                    <span key={f} className="flex items-center gap-1 px-3 py-1 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 text-xs font-medium rounded-full border border-cyan-200 dark:border-cyan-800">
                      {f}
                      <button type="button" onClick={() => removeFeature(f)} className="hover:text-cyan-900 dark:hover:text-cyan-200">
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tech specs */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-600 text-[20px]">settings</span>
              Spécifications techniques
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Délai souhaité</label>
                <select
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none"
                >
                  <option>1 mois</option><option>2 mois</option><option>3 mois</option><option>6 mois</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Priorité</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none"
                >
                  <option>Normale</option><option>Haute</option><option>Urgente</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate("/client/requests")}
              className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={state === "submitting" || !name.trim()}
              className="px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 text-white text-sm font-bold transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">
                {state === "submitting" ? "hourglass_empty" : "send"}
              </span>
              {state === "submitting" ? "Envoi…" : "Soumettre la demande"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
