import { useState } from "react"
import { Link } from "react-router-dom"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { clientNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import { collection, addDoc, serverTimestamp } from "@/lib/firebase-firestore"
import { COLLECTIONS, type FirestoreOrder } from "@/data/schema"

const INPUT_CLS =
  "w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#db143c]"
const TEXTAREA_CLS =
  "w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#db143c] resize-none"
const LABEL_CLS = "text-sm font-medium text-slate-700 dark:text-slate-300"

function StepBadge({
  num,
  label,
  active,
  done,
  onClick,
}: {
  num: number
  label: string
  active: boolean
  done: boolean
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2">
      <div
        className={`size-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
          done
            ? "bg-emerald-500 text-white"
            : active
            ? "bg-[#db143c] text-white"
            : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
        }`}
      >
        {done ? (
          <span className="material-symbols-outlined text-[14px]">check</span>
        ) : (
          num
        )}
      </div>
      <span
        className={`text-sm font-medium hidden sm:block ${
          active
            ? "text-slate-900 dark:text-white"
            : done
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-slate-400"
        }`}
      >
        {label}
      </span>
    </button>
  )
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        <span className="material-symbols-outlined text-[20px] text-[#db143c]">{icon}</span>
        <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  )
}

export default function ClientRequestNew() {
  const { user } = useAuth()

  const [activeSection, setActiveSection] = useState(0)

  const [requestType, setRequestType]     = useState("")
  const [description, setDescription]     = useState("")
  const [features, setFeatures]           = useState<string[]>([""])
  const [budgetLabel, setBudgetLabel]     = useState("")
  const [timelineLabel, setTimelineLabel] = useState("")
  const [priority, setPriority]           = useState("Normale")

  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [newId, setNewId]     = useState("")
  const [error, setError]     = useState("")

  function addFeature() {
    setFeatures((prev) => [...prev, ""])
  }

  function updateFeature(idx: number, value: string) {
    setFeatures((prev) => prev.map((f, i) => (i === idx ? value : f)))
  }

  function removeFeature(idx: number) {
    setFeatures((prev) => prev.filter((_, i) => i !== idx))
  }

  const sections = [
    { label: "Informations", icon: "info" },
    { label: "Fonctionnalités", icon: "list_alt" },
    { label: "Budget & Délai", icon: "schedule" },
  ]

  const sectionFilled = [
    requestType.trim().length > 0,
    features.some((f) => f.trim().length > 0),
    budgetLabel.trim().length > 0 || timelineLabel.trim().length > 0,
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!db || !user?.organizationId) {
      setError("Configuration manquante. Impossible de soumettre.")
      return
    }
    if (!requestType.trim()) {
      setError("Le type de demande est obligatoire.")
      setActiveSection(0)
      return
    }
    setSaving(true)
    setError("")
    try {
      const ref = await addDoc(collection(db, COLLECTIONS.orders), {
        organizationId: user.organizationId,
        kind: "client_request",
        status: "En attente",
        createdByUserId: user.id,
        requestType: requestType.trim(),
        description: description.trim(),
        features: features.map((f) => f.trim()).filter(Boolean),
        budgetLabel: budgetLabel.trim(),
        timelineLabel: timelineLabel.trim(),
        priority,
        createdAt: serverTimestamp(),
      } as FirestoreOrder)
      setNewId(ref.id)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.")
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <DashboardLayout role="client" navItems={clientNav} pageTitle="Nouvelle demande">
        <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <div className="size-20 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-emerald-500 text-[40px]">
              check_circle
            </span>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Demande envoyée !</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm">
              Votre demande a été soumise avec succès. Notre équipe vous recontactera sous 24h.
            </p>
            <p className="text-xs font-mono text-slate-400 mt-1">
              Ref. {newId.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to={`/client/requests/${newId}`}
              className="px-5 py-2.5 bg-[#db143c] text-white font-semibold rounded-lg hover:opacity-90 text-sm"
            >
              Voir ma demande
            </Link>
            <Link
              to="/client/requests"
              className="px-5 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-sm"
            >
              Mes demandes
            </Link>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="client" navItems={clientNav} pageTitle="Nouvelle demande">
      <div className="p-6 w-full space-y-6">
        {/* Back link */}
        <Link
          to="/client/requests"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Retour aux demandes
        </Link>

        {/* Step indicator */}
        <div className="flex items-center gap-3">
          {sections.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2">
              <StepBadge
                num={i + 1}
                label={s.label}
                active={activeSection === i}
                done={sectionFilled[i] && activeSection !== i}
                onClick={() => setActiveSection(i)}
              />
              {i < sections.length - 1 && (
                <div className="h-px w-6 bg-slate-200 dark:bg-slate-700 hidden sm:block" />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1 — Basic info */}
          {activeSection === 0 && (
            <SectionCard title="Informations de base" icon="info">
              <div className="space-y-1.5">
                <label className={LABEL_CLS}>
                  Type de demande <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className={INPUT_CLS}
                  placeholder="Ex. Développement application web, Intégration API…"
                />
              </div>

              <div className="space-y-1.5">
                <label className={LABEL_CLS}>Description du projet</label>
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={TEXTAREA_CLS}
                  placeholder="Décrivez votre besoin, le contexte, les objectifs attendus…"
                />
              </div>

              <div className="space-y-1.5">
                <label className={LABEL_CLS}>Priorité</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className={INPUT_CLS}
                >
                  <option>Basse</option>
                  <option>Normale</option>
                  <option>Haute</option>
                  <option>Urgente</option>
                </select>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveSection(1)}
                  disabled={!requestType.trim()}
                  className="px-5 py-2.5 bg-[#db143c] text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-40 text-sm"
                >
                  Suivant →
                </button>
              </div>
            </SectionCard>
          )}

          {/* Section 2 — Features */}
          {activeSection === 1 && (
            <SectionCard title="Fonctionnalités & Périmètre" icon="list_alt">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Listez les fonctionnalités clés que vous souhaitez inclure dans votre projet.
              </p>

              <div className="space-y-2">
                {features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={f}
                      onChange={(e) => updateFeature(i, e.target.value)}
                      className={INPUT_CLS}
                      placeholder={`Fonctionnalité ${i + 1}`}
                    />
                    {features.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFeature(i)}
                        className="text-slate-400 hover:text-rose-500 shrink-0"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          remove_circle
                        </span>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addFeature}
                className="flex items-center gap-1.5 text-sm text-[#db143c] hover:opacity-80 font-medium"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Ajouter une fonctionnalité
              </button>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSection(0)}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  ← Retour
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection(2)}
                  className="px-5 py-2.5 bg-[#db143c] text-white font-semibold rounded-lg hover:opacity-90 text-sm"
                >
                  Suivant →
                </button>
              </div>
            </SectionCard>
          )}

          {/* Section 3 — Timeline / Budget */}
          {activeSection === 2 && (
            <SectionCard title="Budget & Délai" icon="schedule">
              <div className="space-y-1.5">
                <label className={LABEL_CLS}>Budget estimé</label>
                <input
                  value={budgetLabel}
                  onChange={(e) => setBudgetLabel(e.target.value)}
                  className={INPUT_CLS}
                  placeholder="Ex. 500 000 DA, 50 000 €…"
                />
                <p className="text-xs text-slate-400">
                  Indiquez une fourchette ou un budget maximum.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className={LABEL_CLS}>Délai souhaité</label>
                <input
                  value={timelineLabel}
                  onChange={(e) => setTimelineLabel(e.target.value)}
                  className={INPUT_CLS}
                  placeholder="Ex. 3 mois, Avant juin 2025…"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-400 text-sm">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSection(1)}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  ← Retour
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#db143c] text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 text-sm"
                >
                  {saving ? (
                    <>
                      <span className="material-symbols-outlined text-[18px]">
                        hourglass_empty
                      </span>
                      Envoi…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">send</span>
                      Soumettre la demande
                    </>
                  )}
                </button>
              </div>
            </SectionCard>
          )}
        </form>

        {/* Summary preview */}
        {(requestType || features.some((f) => f.trim())) && (
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Récapitulatif
            </p>
            {requestType && (
              <p className="text-sm text-slate-900 dark:text-white font-medium">{requestType}</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {features
                .filter((f) => f.trim())
                .map((f, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full text-slate-600 dark:text-slate-300"
                  >
                    {f}
                  </span>
                ))}
            </div>
            {(budgetLabel || timelineLabel || priority !== "Normale") && (
              <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                {budgetLabel && <span>Budget : {budgetLabel}</span>}
                {timelineLabel && <span>Délai : {timelineLabel}</span>}
                {priority && <span>Priorité : {priority}</span>}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
