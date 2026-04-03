import { useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import { useParams, Link } from "react-router-dom"

type Decision = "idle" | "validating" | "rejecting" | "validated" | "rejected"

export default function AdminRequestValidate() {
  const { id } = useParams()
  const [comment, setComment]   = useState("")
  const [decision, setDecision] = useState<Decision>("idle")

  function handleValidate() {
    setDecision("validating")
    setTimeout(() => setDecision("validated"), 1000)
  }

  function handleReject() {
    setDecision("rejecting")
    setTimeout(() => setDecision("rejected"), 1000)
  }

  if (decision === "validated") {
    return (
      <DashboardLayout role="admin" navItems={adminNav} pageTitle="Validation de la demande">
        <div className="flex flex-col items-center justify-center py-24 gap-5">
          <div className="size-20 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-emerald-600 text-[40px]">check_circle</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Demande validée</h2>
          <p className="text-slate-500 text-sm text-center max-w-xs">
            La demande <strong>{id}</strong> a été validée et l'ingénieur assigné sera notifié.
          </p>
          {comment && (
            <p className="text-sm text-slate-400 italic max-w-xs text-center">"{comment}"</p>
          )}
          <Link
            to="/admin/requests"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#db143c] hover:opacity-90 text-white text-sm font-semibold rounded-lg transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Retour aux demandes
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  if (decision === "rejected") {
    return (
      <DashboardLayout role="admin" navItems={adminNav} pageTitle="Validation de la demande">
        <div className="flex flex-col items-center justify-center py-24 gap-5">
          <div className="size-20 rounded-full bg-rose-100 dark:bg-rose-900/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-rose-600 text-[40px]">cancel</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Demande rejetée</h2>
          <p className="text-slate-500 text-sm text-center max-w-xs">
            La demande <strong>{id}</strong> a été rejetée. Le client sera informé.
          </p>
          {comment && (
            <p className="text-sm text-slate-400 italic max-w-xs text-center">"{comment}"</p>
          )}
          <Link
            to="/admin/requests"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#db143c] hover:opacity-90 text-white text-sm font-semibold rounded-lg transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Retour aux demandes
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const busy = decision === "validating" || decision === "rejecting"

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Validation de la demande">
      <div className="p-6 max-w-4xl space-y-6">
        <Link to="/admin/requests" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Retour
        </Link>

        <div className="flex items-start gap-4 justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">App e-commerce Mode &amp; Accessoires</h2>
            <p className="text-slate-500 text-sm mt-1">Référence : {id} · Client : Jean Dupont</p>
          </div>
          <span className="text-sm font-semibold px-3 py-1.5 rounded-full text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
            En attente de validation
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Description du besoin</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Développement d'une application e-commerce complète avec catalogue produits, gestion du panier, paiement sécurisé (CIB/BaridiMob) et backoffice de gestion des commandes. Compatible web et mobile.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Fonctionnalités demandées</h3>
              <div className="flex flex-wrap gap-2">
                {["Catalogue produits", "Panier", "Paiement CIB", "Compte client", "Backoffice", "Notifications email"].map(f => (
                  <span key={f} className="text-xs font-medium px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full">{f}</span>
                ))}
              </div>
            </div>

            {/* Decision */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">Décision</h3>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Commentaire interne <span className="text-slate-400 font-normal">(optionnel)</span>
                </label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#db143c] resize-none"
                  placeholder="Ajouter un commentaire…"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleValidate}
                  disabled={busy}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {decision === "validating" ? "hourglass_empty" : "check_circle"}
                  </span>
                  {decision === "validating" ? "Validation…" : "Valider"}
                </button>
                <button
                  onClick={handleReject}
                  disabled={busy}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-bold rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {decision === "rejecting" ? "hourglass_empty" : "cancel"}
                  </span>
                  {decision === "rejecting" ? "Rejet…" : "Rejeter"}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Détails</h3>
              {[
                { label: "Budget",          value: "15 000 DA"   },
                { label: "Délai",           value: "3 mois"       },
                { label: "Priorité",        value: "Haute"        },
                { label: "Date soumission", value: "12 Mar 2025"  },
              ].map(i => (
                <div key={i.label} className="flex justify-between text-sm">
                  <span className="text-slate-500">{i.label}</span>
                  <span className="font-medium text-slate-900 dark:text-white">{i.value}</span>
                </div>
              ))}
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Client</h3>
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-full bg-[#db143c] flex items-center justify-center text-white text-xs font-bold">JD</div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Jean Dupont</p>
                  <p className="text-xs text-slate-400">jean@client.dz</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
