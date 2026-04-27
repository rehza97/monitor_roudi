import { useState } from "react"
import { Link } from "react-router-dom"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { clientNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db, firebaseApp } from "@/config/firebase"
import { collection, addDoc, serverTimestamp } from "@/lib/firebase-firestore"
import { COLLECTIONS, type FirestoreOrder } from "@/data/schema"
import { uploadAllOrderAttachments } from "@/lib/order-attachments"

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
  const [uploadWarning, setUploadWarning] = useState("")

  const [pendingFiles, setPendingFiles] = useState<{ id: string; file: File }[]>([])

  const MAX_FILES = 10
  const MAX_BYTES = 20 * 1024 * 1024

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    setError("")
    const picked = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (picked.length === 0) return
    setPendingFiles((prev) => {
      const next: { id: string; file: File }[] = [...prev]
      for (const file of picked) {
        if (file.size > MAX_BYTES) {
          setError(`Fichier trop volumineux (max. 20 Mo) : ${file.name}`)
          continue
        }
        if (next.length >= MAX_FILES) {
          setError(`Maximum ${MAX_FILES} fichiers.`)
          break
        }
        next.push({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, file })
      }
      return next
    })
  }

  function removeFile(id: string) {
    setPendingFiles((prev) => prev.filter((p) => p.id !== id))
  }

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
    { label: "Fichiers", icon: "attach_file" },
    { label: "Budget & Délai", icon: "schedule" },
  ]

  const sectionFilled = [
    requestType.trim().length > 0,
    features.some((f) => f.trim().length > 0),
    true,
    budgetLabel.trim().length > 0 || timelineLabel.trim().length > 0,
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!db || !user?.organizationId) {
      setError("Configuration manquante. Impossible de soumettre.")
      return
    }
    if (pendingFiles.length > 0 && !firebaseApp) {
      setError("Configuration Firebase incomplète — impossible d'envoyer les fichiers.")
      return
    }
    if (!requestType.trim()) {
      setError("Le type de demande est obligatoire.")
      setActiveSection(0)
      return
    }
    setSaving(true)
    setError("")
    setUploadWarning("")
    try {
      const orderRef = await addDoc(collection(db, COLLECTIONS.orders), {
        organizationId: user.organizationId,
        kind: "client_request",
        status: "En attente",
        createdByUserId: user.id,
        clientLabel: user.name ?? "",
        clientEmail: user.email ?? "",
        requestType: requestType.trim(),
        description: description.trim(),
        features: features.map((f) => f.trim()).filter(Boolean),
        budgetLabel: budgetLabel.trim(),
        timelineLabel: timelineLabel.trim(),
        priority,
        createdAt: serverTimestamp(),
      } as FirestoreOrder)
      const orderId = orderRef.id
      setNewId(orderId)
      if (pendingFiles.length > 0) {
        try {
          await uploadAllOrderAttachments(user.organizationId, orderId, pendingFiles.map((p) => p.file))
        } catch (uploadErr) {
          setUploadWarning(
            uploadErr instanceof Error
              ? uploadErr.message
              : "La demande est enregistrée, mais l'envoi de certains fichiers a échoué. Vous pourrez contacter le support.",
          )
        }
      }
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
            {uploadWarning && (
              <p className="text-sm text-amber-700 dark:text-amber-400 max-w-md border border-amber-200 dark:border-amber-800 rounded-lg p-3 bg-amber-50 dark:bg-amber-900/20">
                {uploadWarning}
              </p>
            )}
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

          {/* Section 3 — Fichiers & images */}
          {activeSection === 2 && (
            <SectionCard title="Fichiers & images" icon="attach_file">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Ajoutez des visuels, maquettes, PDF, archives ou documents bureautiques (max. {MAX_FILES} fichiers, 20 Mo
                chacun). Formats : images, PDF, Word, zip, texte.
              </p>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-400 text-sm">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  {error}
                </div>
              )}

              <label className="flex flex-col items-center justify-center gap-2 min-h-[140px] rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/20 cursor-pointer hover:border-[#db143c]/50 hover:bg-[#db143c]/5 transition group">
                <span className="material-symbols-outlined text-slate-300 group-hover:text-[#db143c]/70 text-[40px]">
                  cloud_upload
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-400 text-center px-2">
                  Cliquez pour choisir des fichiers ou des images
                </span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={onPickFiles}
                  accept="image/*,application/pdf,application/zip,application/x-zip-compressed,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                />
              </label>

              {pendingFiles.length > 0 && (
                <ul className="space-y-2">
                  {pendingFiles.map(({ id, file }) => (
                    <li
                      key={id}
                      className="flex items-center justify-between gap-2 text-sm p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-400 shrink-0 text-[20px]">
                          {file.type.startsWith("image/") ? "image" : "description"}
                        </span>
                        <span className="text-slate-800 dark:text-slate-200 truncate">{file.name}</span>
                        <span className="text-xs text-slate-400 shrink-0">
                          {(file.size / 1024 / 1024).toFixed(1)} Mo
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(id)}
                        className="text-slate-400 hover:text-rose-500 shrink-0 p-0.5"
                        aria-label="Retirer le fichier"
                      >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                      </button>
                    </li>
                  ))}
                </ul>
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
                  type="button"
                  onClick={() => setActiveSection(3)}
                  className="px-5 py-2.5 bg-[#db143c] text-white font-semibold rounded-lg hover:opacity-90 text-sm"
                >
                  Suivant →
                </button>
              </div>
            </SectionCard>
          )}

          {/* Section 4 — Budget & délai */}
          {activeSection === 3 && (
            <SectionCard title="Budget & Délai" icon="schedule">
              <div className="space-y-1.5">
                <label className={LABEL_CLS}>Budget estimé</label>
                <input
                  value={budgetLabel}
                  onChange={(e) => setBudgetLabel(e.target.value)}
                  className={INPUT_CLS}
                  placeholder="Ex. 500 000 DZD, 1 200 000 DZD…"
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
                  onClick={() => setActiveSection(2)}
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
                      {pendingFiles.length > 0 ? "Envoi & fichiers…" : "Envoi…"}
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
            {pendingFiles.length > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {pendingFiles.length} fichier{pendingFiles.length > 1 ? "s" : ""} joint
                {pendingFiles.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
