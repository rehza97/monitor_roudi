import { useState } from "react"
import { Link } from "react-router-dom"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { clientNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import { collection, addDoc, serverTimestamp } from "@/lib/firebase-firestore"
import { COLLECTIONS, ORDER_KIND, type FirestoreOrder } from "@/data/schema"
import { notifyAdminsOfOrderCreated } from "@/lib/notifications"

export default function ClientRequestNew() {
  const { user } = useAuth()

  const [domain, setDomain] = useState("")
  const [theme, setTheme] = useState("")
  const [targetWeb, setTargetWeb] = useState(false)
  const [targetIos, setTargetIos] = useState(false)
  const [targetAndroid, setTargetAndroid] = useState(false)
  const [projectName, setProjectName] = useState("")
  const [objective, setObjective] = useState("")
  const [budget, setBudget] = useState("")
  const [deadline, setDeadline] = useState("")
  const [featureInput, setFeatureInput] = useState("")
  const [features, setFeatures] = useState<string[]>(["Authentification Utilisateur", "Paiement en ligne"])
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [newId, setNewId] = useState("")
  const [error, setError] = useState("")

  function addFeature() {
    const val = featureInput.trim()
    if (!val) return
    setFeatures((prev) => [...prev, val])
    setFeatureInput("")
  }

  function removeFeature(idx: number) {
    setFeatures((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!db || !user?.organizationId) {
      setError("Configuration manquante. Impossible de soumettre.")
      return
    }
    if (!domain.trim() || !objective.trim()) {
      setError("Domaine d'activité et objectif principal sont obligatoires.")
      return
    }

    setSaving(true)
    setError("")
    try {
      const platforms: string[] = []
      if (targetWeb) platforms.push("Application Web")
      if (targetIos) platforms.push("Mobile iOS")
      if (targetAndroid) platforms.push("Mobile Android")

      const payload = {
        organizationId: user.organizationId,
        kind: ORDER_KIND.clientRequest,
        status: "En attente",
        createdByUserId: user.id,
        clientLabel: user.name ?? "",
        clientEmail: user.email ?? "",
        requestType: projectName.trim() || `Demande ${domain.trim()}`,
        description: `${objective.trim()}\n\nDomaine: ${domain.trim()}\nThème: ${theme || "Non précisé"}\nPlateformes: ${platforms.join(", ") || "Non précisé"}`,
        features: features.filter(Boolean),
        budgetLabel: budget,
        timelineLabel: deadline,
        priority: "Normale",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as FirestoreOrder
      const ref = await addDoc(collection(db, COLLECTIONS.orders), payload)
      await notifyAdminsOfOrderCreated(ref.id, payload)

      setNewId(ref.id)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi")
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <DashboardLayout role="client" navItems={clientNav} pageTitle="Nouvelle demande">
        <div className="flex min-h-[70vh] items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <span className="material-symbols-outlined text-[30px]">check_circle</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Demande envoyée</h2>
            <p className="mt-2 text-slate-500">Référence: {newId.slice(0, 8).toUpperCase()}</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link to={`/client/requests/${newId}`} className="rounded-lg bg-[#0891b2] px-5 py-2.5 text-sm font-semibold text-white">Voir ma demande</Link>
              <Link to="/client/requests" className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700">Mes demandes</Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="client" navItems={clientNav} pageTitle="Nouvelle demande">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8 flex items-center text-sm text-slate-500">
          <Link to="/client/dashboard" className="hover:text-[#0891b2]">Tableau de bord</Link>
          <span className="mx-2 text-slate-300">/</span>
          <span className="font-medium text-slate-900">Nouvelle demande</span>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Demander une nouvelle application</h1>
          <p className="mt-3 max-w-2xl text-lg text-slate-500">Remplissez les informations ci-dessous pour démarrer votre projet.</p>
        </div>

        <form className="space-y-6 pb-16" onSubmit={handleSubmit}>
          {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50/50 px-8 py-5">
              <div className="flex size-8 items-center justify-center rounded-full bg-[#0891b2]/10 text-sm font-bold text-[#0891b2]">1</div>
              <h2 className="text-lg font-bold text-slate-900">Informations générales</h2>
            </div>
            <div className="grid grid-cols-1 gap-8 p-8 md:grid-cols-2">
              <Field label="Domaine d'activité" required icon="domain">
                <input value={domain} onChange={(e) => setDomain(e.target.value)} className="client-input pl-10" placeholder="ex: E-commerce, Santé, Immobilier" />
              </Field>
              <Field label="Thème préféré" icon="palette">
                <select value={theme} onChange={(e) => setTheme(e.target.value)} className="client-input pl-10">
                  <option value="">Choisir un style...</option>
                  <option>Moderne & Minimaliste</option>
                  <option>Sombre & Futuriste</option>
                  <option>Corporatif & Sérieux</option>
                  <option>Coloré & Ludique</option>
                </select>
              </Field>
              <div className="space-y-3 md:col-span-2">
                <label className="block text-sm font-semibold text-slate-900">Type de plateforme cible</label>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {[
                    ["Application Web", "Accessible via navigateur", targetWeb, setTargetWeb],
                    ["Mobile iOS", "App Store Apple", targetIos, setTargetIos],
                    ["Mobile Android", "Google Play Store", targetAndroid, setTargetAndroid],
                  ].map(([label, hint, checked, setter]) => (
                    <label key={String(label)} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-4 transition-all hover:border-[#0891b2]/50 hover:bg-[#0891b2]/5">
                      <input checked={Boolean(checked)} onChange={(e) => (setter as React.Dispatch<React.SetStateAction<boolean>>)(e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-[#0891b2] focus:ring-[#0891b2]" type="checkbox" />
                      <div><span className="text-sm font-medium">{String(label)}</span><p className="text-xs text-slate-500">{String(hint)}</p></div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50/50 px-8 py-5">
              <div className="flex size-8 items-center justify-center rounded-full bg-[#0891b2]/10 text-sm font-bold text-[#0891b2]">2</div>
              <h2 className="text-lg font-bold text-slate-900">Description détaillée</h2>
            </div>
            <div className="space-y-6 p-8">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">Nom du projet</label>
                <input value={projectName} onChange={(e) => setProjectName(e.target.value)} className="client-input" placeholder="ex: MySuperApp" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">Objectif principal <span className="text-[#0891b2]">*</span></label>
                <textarea rows={4} maxLength={500} value={objective} onChange={(e) => setObjective(e.target.value)} className="client-input min-h-32 resize-none" placeholder="Décrivez ce que l'application doit accomplir..." />
                <p className="text-right text-xs text-slate-400">{objective.length}/500 caractères</p>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50/50 px-8 py-5">
              <div className="flex size-8 items-center justify-center rounded-full bg-[#0891b2]/10 text-sm font-bold text-[#0891b2]">3</div>
              <h2 className="text-lg font-bold text-slate-900">Budget & fonctionnalités</h2>
            </div>
            <div className="grid grid-cols-1 gap-8 p-8 md:grid-cols-2">
              <Field label="Budget estimé" icon="payments">
                <select value={budget} onChange={(e) => setBudget(e.target.value)} className="client-input pl-10">
                  <option value="">Sélectionner une fourchette...</option>
                  <option>Moins de 700 000 DZD</option>
                  <option>700 000 DZD - 1 400 000 DZD</option>
                  <option>1 400 000 DZD - 3 500 000 DZD</option>
                  <option>Plus de 3 500 000 DZD</option>
                </select>
              </Field>
              <Field label="Date limite souhaitée" icon="calendar_month">
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="client-input pl-10" />
              </Field>
              <div className="space-y-4 md:col-span-2">
                <label className="block text-sm font-semibold text-slate-900">Fonctionnalités requises</label>
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
                  <div className="flex flex-wrap gap-2">
                    {features.map((f, i) => (
                      <span key={`${f}-${i}`} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium shadow-sm">
                        {f}
                        <button type="button" className="text-slate-400 hover:text-red-500" onClick={() => removeFeature(i)}><span className="material-symbols-outlined text-[14px]">close</span></button>
                      </span>
                    ))}
                    <input value={featureInput} onChange={(e) => setFeatureInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFeature() } }} className="min-w-[150px] border-none bg-transparent text-sm placeholder:text-slate-400 focus:ring-0" placeholder="+ Ajouter une fonctionnalité" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="flex items-center justify-end gap-4 border-t border-slate-200 pt-4">
            <Link to="/client/requests" className="rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-900">Annuler</Link>
            <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-[#0891b2] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-[#0891b2]/25 hover:bg-[#0e7490] disabled:opacity-60">
              <span>{saving ? "Envoi..." : "Envoyer la demande"}</span>
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}

function Field({ label, required, icon, children }: { label: string; required?: boolean; icon: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-900">{label} {required ? <span className="text-[#0891b2]">*</span> : null}</label>
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">{icon}</span>
        {children}
      </div>
    </div>
  )
}
